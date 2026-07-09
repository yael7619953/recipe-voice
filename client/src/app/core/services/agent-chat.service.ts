import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatMessage, AgentChatResponse } from '../models/agent-chat.model';
import { LanguageService } from './language.service';

@Injectable({ providedIn: 'root' })
export class AgentChatService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);

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
}