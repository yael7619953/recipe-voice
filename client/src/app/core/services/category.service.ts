import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Category, CategoryDraft, CategoryTreeNode } from '../models/category.model';

const API = '/api/categories';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  private _categories = signal<Category[]>([]);
  private _loading = signal(false);

  readonly categories = this._categories.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Flat list arranged as a hierarchical tree, derived on the client. */
  readonly tree = computed(() => buildTree(this._categories()));
  readonly count = computed(() => this._categories().length);

  load(): Observable<Category[]> {
    this._loading.set(true);
    return this.http.get<Category[]>(API).pipe(
      tap({
        next: (list) => {
          this._categories.set(list);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
    );
  }

  create(draft: CategoryDraft): Observable<Category> {
    return this.http
      .post<Category>(API, draft)
      .pipe(tap((created) => this._categories.update((list) => [...list, created])));
  }

  update(id: string, draft: CategoryDraft): Observable<Category> {
    return this.http
      .put<Category>(`${API}/${id}`, draft)
      .pipe(
        tap((updated) =>
          this._categories.update((list) => list.map((c) => (c._id === id ? updated : c))),
        ),
      );
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${API}/${id}`)
      .pipe(tap(() => this._categories.update((list) => list.filter((c) => c._id !== id))));
  }

  /** Ids of a category and all of its descendants — used to block invalid parent choices. */
  descendantIds(id: string): Set<string> {
    const result = new Set<string>([id]);
    const list = this._categories();
    let added = true;
    while (added) {
      added = false;
      for (const c of list) {
        if (c.parentCategory && result.has(c.parentCategory) && !result.has(c._id)) {
          result.add(c._id);
          added = true;
        }
      }
    }
    return result;
  }
}

function buildTree(categories: Category[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>();
  for (const category of categories) {
    byId.set(category._id, { ...category, children: [] });
  }

  const roots: CategoryTreeNode[] = [];
  for (const category of categories) {
    const node = byId.get(category._id)!;
    const parent = category.parentCategory ? byId.get(category.parentCategory) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
