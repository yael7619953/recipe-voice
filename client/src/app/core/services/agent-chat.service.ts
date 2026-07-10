import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatMessage, AgentChatResponse } from '../models/agent-chat.model';
import { LanguageService } from './language.service';
import { CategoryService } from './category.service';
import { DataRefreshService } from './data-refresh.service';

/** Tool names (server: agent-tools.service.js) that change persisted category data. */
const CATEGORY_MUTATING_TOOLS = new Set(['createCategory', 'updateCategory', 'deleteCategory']);
/** Tool names that change persisted recipe data. */
const RECIPE_MUTATING_TOOLS = new Set([
  'createRecipe',
  'updateRecipe',
  'deleteRecipe',
  'toggleFavorite',
  'attachRecipeImage',
  'extractRecipeFromFile',
]);

@Injectable({ providedIn: 'root' })
export class AgentChatService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);
  private categoryService = inject(CategoryService);
  private dataRefresh = inject(DataRefreshService);

  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);

  async sendMessage(text: string, file?: File): Promise<void> {
    console.log('🟦 [client] sendMessage called with:', text, file);

    const prior = this.messages();
    this.messages.update((msgs) => [...msgs, { role: 'user', text }]);
    this.isLoading.set(true);

    const form = new FormData();
    form.append('message', text);
    form.append('history', JSON.stringify(prior));
    form.append('language', this.languageService.currentLang());
    if (file) form.append('file', file);

    try {
      console.log('🟦 [client] sending POST to /api/agent/chat, language:', this.languageService.currentLang());

      const res = await this.http
        .post<AgentChatResponse>('/api/agent/chat', form)
        .toPromise();

      console.log('✅ [client] got response:', res);

      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', text: res!.reply },
      ]);

      this.refreshAfterToolCalls(res ?? undefined);
    } catch (err: unknown) {
      console.error('🔴 [client] request FAILED:', err);
      const httpErr = err as { error?: { message?: string }; message?: string };
      const msg =
        httpErr?.error?.message ||
        httpErr?.message ||
        'Something went wrong. Please try again.';
      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', text: msg },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Re-sync shared data stores so open lists reflect changes the agent made server-side. */
  private refreshAfterToolCalls(res?: AgentChatResponse): void {
    const tools = res?.toolsCalled ?? (res?.toolCalled ? [res.toolCalled] : []);
    if (tools.length === 0) return;

    if (tools.some((t) => CATEGORY_MUTATING_TOOLS.has(t))) {
      this.categoryService.load().subscribe();
    }
    if (tools.some((t) => RECIPE_MUTATING_TOOLS.has(t))) {
      this.dataRefresh.notifyRecipesChanged();
    }
  }
}