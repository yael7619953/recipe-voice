import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CategoryTreeNode } from '../../../core/models/category.model';

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './category-tree.component.html',
  styleUrl: './category-tree.component.scss',
})
export class CategoryTreeComponent {
  @Input({ required: true }) nodes: CategoryTreeNode[] = [];
  @Input() depth = 0;

  @Output() edit = new EventEmitter<CategoryTreeNode>();
  @Output() remove = new EventEmitter<CategoryTreeNode>();
  @Output() addChild = new EventEmitter<CategoryTreeNode>();

  private collapsed = signal<Set<string>>(new Set());

  isExpanded(id: string): boolean {
    return !this.collapsed().has(id);
  }

  toggle(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
}
