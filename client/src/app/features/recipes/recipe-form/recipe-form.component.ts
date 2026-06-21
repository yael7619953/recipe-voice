import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe, RecipeDraft } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-form',
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.scss',
})
export class RecipeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isEdit = signal(false);
  loading = signal(false);
  loadingRecipe = signal(false);
  errorKey = signal<string | null>(null);
  private recipeId: string | null = null;

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    ingredients: this.fb.array([this.newIngredientControl()]),
    instructions: this.fb.array([this.newStepGroup()]),
    prepTime: this.fb.group({
      hours: [0, [Validators.min(0)]],
      minutes: [0, [Validators.min(0), Validators.max(59)]],
    }),
    servings: [''],
    notes: [''],
    isFavorite: [false],
  });

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get instructionsArray(): FormArray {
    return this.form.get('instructions') as FormArray;
  }

  stepTimerGroup(stepCtrl: AbstractControl): FormGroup {
    return (stepCtrl as FormGroup).get('timer') as FormGroup;
  }

  ngOnInit(): void {
    this.recipeId = this.route.snapshot.paramMap.get('id');
    if (this.recipeId) {
      this.isEdit.set(true);
      this.loadRecipe(this.recipeId);
    }
  }

  private loadRecipe(id: string): void {
    this.loadingRecipe.set(true);
    this.recipeService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.patchForm(r);
          this.loadingRecipe.set(false);
        },
        error: () => {
          this.errorKey.set('RECIPES.ERROR.NOT_FOUND');
          this.loadingRecipe.set(false);
        },
      });
  }

  private patchForm(r: Recipe): void {
    // rebuild arrays to match incoming data length
    this.ingredientsArray.clear();
    r.ingredients.forEach((ing) => this.ingredientsArray.push(this.fb.control(ing, Validators.required)));

    this.instructionsArray.clear();
    r.instructions.forEach((step) => {
      this.instructionsArray.push(
        this.fb.group({
          text: [step.text, Validators.required],
          timer: this.fb.group({
            duration: [step.timer.duration],
            hasTimer: [step.timer.hasTimer],
          }),
        }),
      );
    });

    this.form.patchValue({
      title: r.title,
      description: r.description ?? '',
      prepTime: r.prepTime,
      servings: r.servings ?? '',
      notes: r.notes ?? '',
      isFavorite: r.isFavorite,
    });
  }

  addIngredient(): void {
    this.ingredientsArray.push(this.newIngredientControl());
  }

  removeIngredient(index: number): void {
    if (this.ingredientsArray.length > 1) {
      this.ingredientsArray.removeAt(index);
    }
  }

  addStep(): void {
    this.instructionsArray.push(this.newStepGroup());
  }

  removeStep(index: number): void {
    if (this.instructionsArray.length > 1) {
      this.instructionsArray.removeAt(index);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const draft = this.form.getRawValue() as RecipeDraft;
    this.loading.set(true);
    this.errorKey.set(null);
    this.form.disable();

    const request$ = this.isEdit()
      ? this.recipeService.update(this.recipeId!, draft)
      : this.recipeService.create(draft);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => void this.router.navigate(['/recipes', saved._id]),
      error: () => {
        this.errorKey.set('RECIPES.ERROR.SAVE');
        this.loading.set(false);
        this.form.enable();
      },
    });
  }

  private newIngredientControl() {
    return this.fb.control('', Validators.required);
  }

  private newStepGroup(): FormGroup {
    return this.fb.group({
      text: ['', Validators.required],
      timer: this.fb.group({
        duration: [0],
        hasTimer: [false],
      }),
    });
  }
}
