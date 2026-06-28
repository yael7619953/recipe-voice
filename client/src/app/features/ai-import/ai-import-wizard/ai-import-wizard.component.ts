import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

/** Source file kinds the wizard can import a recipe from. */
export type ImportFileType = 'pdf' | 'image' | 'word';

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

@Component({
  selector: 'app-ai-import-wizard',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './ai-import-wizard.component.html',
  styleUrl: './ai-import-wizard.component.scss',
  host: { '[attr.dir]': 'dir()' },
})
export class AiImportWizardComponent {
  private translate = inject(TranslateService);

  readonly fileTypeOptions = FILE_TYPE_OPTIONS;

  /** Wizard step: pick a file type, then upload a matching file. */
  readonly step = signal<'type' | 'upload'>('type');
  readonly selectedType = signal<ImportFileType | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly dragging = signal(false);

  readonly accept = computed(
    () => this.fileTypeOptions.find((option) => option.type === this.selectedType())?.accept ?? '',
  );
  readonly canContinue = computed(() => this.selectedFile() !== null);
  readonly dir = computed(() => (this.translate.currentLang() === 'en' ? 'ltr' : 'rtl'));

  chooseType(type: ImportFileType): void {
    this.selectedType.set(type);
    this.selectedFile.set(null);
    this.step.set('upload');
  }

  backToType(): void {
    this.step.set('type');
    this.selectedFile.set(null);
    this.dragging.set(false);
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
  }

  // Extraction (POST /api/ai/extract) is wired up in M15 — skeleton only for now.
  private setFile(file: File | null): void {
    this.selectedFile.set(file);
  }
}
