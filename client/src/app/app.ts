import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { AgentChatWidgetComponent } from './features/agent-chat/agent-chat-widget/agent-chat-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe, AgentChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected authService = inject(AuthService);
  protected languageService = inject(LanguageService);
  private router = inject(Router);

  constructor() {
    this.languageService.init();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}