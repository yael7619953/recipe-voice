import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Category, CategoryDraft, CategoryTreeNode } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { CategoryTreeComponent } from '../category-tree/category-tree.component';
import { CategoryFormComponent } from '../category-form/category-form.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [TranslatePipe, CategoryTreeComponent, CategoryFormComponent],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  host: { '[attr.dir]': 'dir()' },
})
export class CategoriesPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private translate = inject(TranslateService);

  readonly tree = this.categoryService.tree;
  readonly loading = this.categoryService.loading;
  readonly count = this.categoryService.count;
  readonly categories = this.categoryService.categories;

  readonly formOpen = signal(false);
  readonly editing = signal<Category | null>(null);
  readonly presetParentId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly dir = computed(() => (this.translate.currentLang() === 'en' ? 'ltr' : 'rtl'));

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.error.set(null);
    this.categoryService.load().subscribe({
      error: () => this.error.set('categories.errors.load'),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.presetParentId.set(null);
    this.formOpen.set(true);
  }

  openAddChild(parent: CategoryTreeNode): void {
    this.editing.set(null);
    this.presetParentId.set(parent._id);
    this.formOpen.set(true);
  }

  openEdit(node: CategoryTreeNode): void {
    this.presetParentId.set(null);
    this.editing.set(node);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.presetParentId.set(null);
  }

  handleSave(draft: CategoryDraft): void {
    this.saving.set(true);
    this.error.set(null);
    const current = this.editing();
    const request$ = current
      ? this.categoryService.update(current._id, draft)
      : this.categoryService.create(draft);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('categories.errors.save');
      },
    });
  }

  handleDelete(node: CategoryTreeNode): void {
    const message = this.translate.instant('categories.confirmDelete', { name: node.name });
    if (!confirm(message)) {
      return;
    }
    this.error.set(null);
    this.categoryService.remove(node._id).subscribe({
      error: (err: { status?: number }) =>
        this.error.set(err?.status === 409 ? 'categories.errors.hasChildren' : 'categories.errors.generic'),
    });
  }
}
