import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AiImportService, ExtractedRecipe } from '../../../core/services/ai-import.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { RecipeDraft } from '../../../core/models/recipe.model';

/** Source file kinds the wizard can import a recipe from. */
export type ImportFileType = 'pdf' | 'image' | 'word';

type WizardStep = 'type' | 'upload' | 'preview';

interface FileTypeOption {
  type: ImportFileType;
  icon: string;
  /** Comma-separated `accept` filter for the native file input. */
  accept: string;
}

const FILE_TYPE_OPTIONS: readonly FileTypeOption[] = [
  { type: 'pdf', icon: '📄', accept: 'application/pdf,.pdf' },
  { type: 'image', icon: '🖼️', accept: 'image/*' },
  {
    type: 'word',
    icon: '📝',
    accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx',
  },
] as const;

/** Maps `POST /api/ai/extract` HTTP error codes to i18n keys. */
const EXTRACT_ERROR_KEYS: Record<number, string> = {
  413: 'aiImport.errors.tooLarge',
  415: 'aiImport.errors.unsupported',
  422: 'aiImport.errors.unreadable',
  502: 'aiImport.errors.aiFailed',
  503: 'aiImport.errors.notConfigured',
};

@Component({
  selector: 'app-ai-import-wizard',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './ai-import-wizard.component.html',
  styleUrl: './ai-import-wizard.component.scss',
  host: { '[attr.dir]': 'dir()' },
})
export class AiImportWizardComponent {
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  private aiImport = inject(AiImportService);
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly fileTypeOptions = FILE_TYPE_OPTIONS;

  readonly step = signal<WizardStep>('type');
  readonly selectedType = signal<ImportFileType | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly dragging = signal(false);

  readonly extracting = signal(false);
  readonly extractErrorKey = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveErrorKey = signal<string | null>(null);

  readonly accept = computed(
    () => this.fileTypeOptions.find((option) => option.type === this.selectedType())?.accept ?? '',
  );
  readonly canExtract = computed(() => this.selectedFile() !== null && !this.extracting());
  readonly dir = computed(() => (this.translate.currentLang() === 'en' ? 'ltr' : 'rtl'));

  /** Built only once a recipe has been extracted (preview step). */
  form: FormGroup = this.fb.group({});

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get instructionsArray(): FormArray {
    return this.form.get('instructions') as FormArray;
  }

  stepTimerGroup(stepCtrl: AbstractControl): FormGroup {
    return (stepCtrl as FormGroup).get('timer') as FormGroup;
  }

  chooseType(type: ImportFileType): void {
    this.selectedType.set(type);
    this.selectedFile.set(null);
    this.extractErrorKey.set(null);
    this.step.set('upload');
  }

  backToType(): void {
    this.step.set('type');
    this.selectedFile.set(null);
    this.dragging.set(false);
    this.extractErrorKey.set(null);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.extractErrorKey.set(null);
  }

  extract(): void {
    const file = this.selectedFile();
    if (!file || this.extracting()) return;

    this.extracting.set(true);
    this.extractErrorKey.set(null);

    this.aiImport
      .extract(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recipe) => {
          this.buildForm(recipe);
          this.extracting.set(false);
          this.saveErrorKey.set(null);
          this.step.set('preview');
        },
        error: (err: HttpErrorResponse) => {
          this.extractErrorKey.set(EXTRACT_ERROR_KEYS[err.status] ?? 'aiImport.errors.extract');
          this.extracting.set(false);
        },
      });
  }

  backToUpload(): void {
    this.step.set('upload');
    this.saveErrorKey.set(null);
  }

  addIngredient(): void {
    this.ingredientsArray.push(this.fb.control('', Validators.required));
  }

  removeIngredient(index: number): void {
    if (this.ingredientsArray.length > 1) this.ingredientsArray.removeAt(index);
  }

  addStep(): void {
    this.instructionsArray.push(this.newStepGroup());
  }

  removeStep(index: number): void {
    if (this.instructionsArray.length > 1) this.instructionsArray.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const draft = this.toDraft();
    this.saving.set(true);
    this.saveErrorKey.set(null);

    this.recipeService
      .create(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => void this.router.navigate(['/recipes', saved._id]),
        error: () => {
          this.saveErrorKey.set('aiImport.errors.save');
          this.saving.set(false);
        },
      });
  }

  private setFile(file: File | null): void {
    this.selectedFile.set(file);
    this.extractErrorKey.set(null);
  }

  private buildForm(recipe: ExtractedRecipe): void {
    const ingredients = recipe.ingredients?.length ? recipe.ingredients : [''];
    const instructions = recipe.instructions?.length
      ? recipe.instructions
      : [{ text: '', timer: { duration: 0, hasTimer: false } }];

    this.form = this.fb.group({
      title: [recipe.title ?? '', Validators.required],
      description: [recipe.description ?? ''],
      ingredients: this.fb.array(
        ingredients.map((ing) => this.fb.control(ing, Validators.required)),
      ),
      instructions: this.fb.array(
        instructions.map((step) =>
          this.fb.group({
            text: [step.text ?? '', Validators.required],
            timer: this.fb.group({
              duration: [step.timer?.duration ?? 0, [Validators.min(0)]],
              hasTimer: [step.timer?.hasTimer ?? false],
            }),
          }),
        ),
      ),
      prepTime: this.fb.group({
        hours: [recipe.prepTime?.hours ?? 0, [Validators.min(0)]],
        minutes: [recipe.prepTime?.minutes ?? 0, [Validators.min(0), Validators.max(59)]],
      }),
      servings: [recipe.servings ?? ''],
      notes: [recipe.notes ?? ''],
    });
  }

  private toDraft(): RecipeDraft {
    const value = this.form.getRawValue() as {
      title: string;
      description: string;
      ingredients: string[];
      instructions: { text: string; timer: { duration: number; hasTimer: boolean } }[];
      prepTime: { hours: number; minutes: number };
      servings: string;
      notes: string;
    };

    return {
      title: value.title.trim(),
      description: value.description?.trim() || undefined,
      ingredients: value.ingredients.map((ing) => ing.trim()).filter(Boolean),
      instructions: value.instructions
        .filter((step) => step.text?.trim())
        .map((step) => ({
          text: step.text.trim(),
          timer: {
            hasTimer: step.timer.hasTimer,
            duration: step.timer.hasTimer ? step.timer.duration : 0,
          },
        })),
      categories: [],
      prepTime: value.prepTime,
      servings: value.servings?.trim() || undefined,
      notes: value.notes?.trim() || undefined,
      isFavorite: false,
    };
  }

  private newStepGroup(): FormGroup {
    return this.fb.group({
      text: ['', Validators.required],
      timer: this.fb.group({
        duration: [0, [Validators.min(0)]],
        hasTimer: [false],
      }),
    });
  }
}
