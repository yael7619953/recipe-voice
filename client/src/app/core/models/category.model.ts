export interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
  parentCategory: string | null;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

/** Mutable fields sent to the API on create/update. */
export type CategoryDraft = Pick<Category, 'name' | 'color' | 'icon' | 'parentCategory'>;
