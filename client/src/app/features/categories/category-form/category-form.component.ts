import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Category, CategoryDraft } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';

interface ParentOption {
  id: string;
  label: string;
  disabled: boolean;
}

const COLORS = [
  '#f15a29',
  '#e5484d',
  '#e91e63',
  '#9c27b0',
  '#6a5acd',
  '#2f80ed',
  '#0fa3b1',
  '#2bb673',
  '#f2b705',
  '#8a8a95',
];

const ICONS = ['🍝', '🥗', '🍰', '🍞', '🥘', '🌍', '🍲', '🥤', '🍳', '🧁', '🥩', '🍕'];

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
})
export class CategoryFormComponent implements OnInit {
  @Input() editing: Category | null = null;
  @Input() categories: Category[] = [];
  @Input() presetParentId: string | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<CategoryDraft>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);

  readonly colors = COLORS;
  readonly icons = ICONS;
  parentOptions: ParentOption[] = [];

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    color: [COLORS[0], Validators.required],
    icon: [ICONS[0], Validators.required],
    parentCategory: [null as string | null],
  });

  ngOnInit(): void {
    this.parentOptions = this.buildParentOptions();

    if (this.editing) {
      this.form.setValue({
        name: this.editing.name,
        color: this.editing.color,
        icon: this.editing.icon,
        parentCategory: this.editing.parentCategory,
      });
    } else if (this.presetParentId) {
      this.form.controls.parentCategory.setValue(this.presetParentId);
    }
  }

  selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  selectIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({
      name: value.name.trim(),
      color: value.color,
      icon: value.icon,
      parentCategory: value.parentCategory || null,
    });
  }

  // Flatten categories into an indented, ordered list; disable self + descendants.
  private buildParentOptions(): ParentOption[] {
    const blocked = this.editing
      ? this.categoryService.descendantIds(this.editing._id)
      : new Set<string>();

    const childrenByParent = new Map<string | null, Category[]>();
    for (const c of this.categories) {
      const key = c.parentCategory ?? null;
      const bucket = childrenByParent.get(key) ?? [];
      bucket.push(c);
      childrenByParent.set(key, bucket);
    }

    const options: ParentOption[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const children = (childrenByParent.get(parentId) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const child of children) {
        options.push({
          id: child._id,
          label: `${'\u00A0\u00A0'.repeat(depth)}${child.name}`,
          disabled: blocked.has(child._id),
        });
        walk(child._id, depth + 1);
      }
    };
    walk(null, 0);
    return options;
  }
}
