import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgentChatService } from '../../../core/services/agent-chat.service';

@Component({
  selector: 'app-agent-chat-widget',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './agent-chat-widget.component.html',
  styleUrl: './agent-chat-widget.component.scss',
})
export class AgentChatWidgetComponent {
  chatService = inject(AgentChatService);

  isOpen = signal(false);
  inputText = signal('');
  selectedFile = signal<File | null>(null);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async send(): Promise<void> {
    const text = this.inputText().trim();
    if (!text && !this.selectedFile()) return;

    await this.chatService.sendMessage(text, this.selectedFile() ?? undefined);
    this.inputText.set('');
    this.selectedFile.set(null);
  }
}