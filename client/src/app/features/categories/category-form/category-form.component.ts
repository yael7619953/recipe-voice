import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import 'emoji-picker-element';
import enPickerI18n from 'emoji-picker-element/i18n/en.js';
import type { EmojiClickEvent, I18n } from 'emoji-picker-element/shared';
import { LanguageService } from '../../../core/services/language.service';
import { Category, CategoryDraft } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';

interface ParentOption {
  id: string;
  label: string;
  disabled: boolean;
}

type EmojiPickerElement = HTMLElement & { i18n?: I18n; locale?: string };

/** Emoji search keywords are English-only (no Hebrew data in emoji-picker-element). */
const PICKER_LOCALE = 'en';
const PICKER_DATA_SOURCE =
  'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
  // emoji-picker is a native custom element (emoji-picker-element), not an Angular component.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  private languageService = inject(LanguageService);

  readonly pickerLocale = PICKER_LOCALE;
  readonly pickerDataSource = PICKER_DATA_SOURCE;

  showEmojiPicker = false;
  parentOptions: ParentOption[] = [];

  @ViewChild('emojiPicker') set emojiPicker(ref: ElementRef<EmojiPickerElement> | undefined) {
    if (!ref) return;
    const picker = ref.nativeElement;
    picker.locale = PICKER_LOCALE;
    picker.i18n = this.pickerI18n();
  }

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    color: ['#f15a29', Validators.required],
    icon: ['🍝', Validators.required],
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

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  onEmojiSelect(event: EmojiClickEvent): void {
    if (event.detail.unicode) {
      this.form.controls.icon.setValue(event.detail.unicode);
    }
    this.showEmojiPicker = false;
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

  private pickerI18n(): I18n {
    if (this.languageService.currentLang() === 'he') {
      return {
        ...enPickerI18n,
        searchLabel: 'חיפוש (באנגלית, למשל pizza)',
        categoriesLabel: 'קטגוריות',
        favoritesLabel: 'מועדפים',
        loadingMessage: 'טוען…',
        networkErrorMessage: 'לא ניתן לטעון אימוג׳ים.',
        regionLabel: 'בוחר אימוג׳ים',
        searchResultsLabel: 'תוצאות חיפוש',
        skinTonesLabel: 'גווני עור',
        categories: {
          ...enPickerI18n.categories,
          custom: 'מותאם',
          'smileys-emotion': 'סמיילים',
          'people-body': 'אנשים',
          'animals-nature': 'חיות וטבע',
          'food-drink': 'אוכל ושתייה',
          'travel-places': 'נסיעות ומקומות',
          activities: 'פעילויות',
          objects: 'חפצים',
          symbols: 'סמלים',
          flags: 'דגלים',
        },
      };
    }
    return enPickerI18n;
  }
}
