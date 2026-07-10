import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
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

  @ViewChild('fileInput') private fileInputRef?: ElementRef<HTMLInputElement>;

  isOpen = signal(false);
  inputText = signal('');
  selectedFile = signal<File | null>(null);
  sendError = signal<string | null>(null);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.sendError.set(null);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
  }

  async send(): Promise<void> {
    const text = this.inputText().trim();
    const file = this.selectedFile();

    if (!text && !file) {
      this.sendError.set('כתבי הודעה או צרפי קובץ לפני השליחה');
      return;
    }

    this.sendError.set(null);
    const res = await this.chatService.sendMessage(text, file ?? undefined);
    this.inputText.set('');

    // Keep a pending attachment across turns until the agent actually reads it —
    // e.g. after "would you like to save this recipe?" the user's plain "yes" reply
    // still needs the same file resent, since a request without a file can't be used.
    if (!file || this.chatService.wasFileConsumed(res)) {
      this.clearFile();
    }
  }
}
