import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLang = 'he' | 'en';

const STORAGE_KEY = 'app_lang';
const RTL_LANGS: SupportedLang[] = ['he'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  private readonly _currentLang = signal<SupportedLang>('he');
  readonly currentLang = this._currentLang.asReadonly();

  /** Call once on app bootstrap to restore the saved language. */
  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLang | null;
    this.setLanguage(saved ?? 'he');
  }

  setLanguage(lang: SupportedLang): void {
    this.translate.use(lang);
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    this._currentLang.set(lang);
  }

  toggle(): void {
    this.setLanguage(this.currentLang() === 'he' ? 'en' : 'he');
  }
}
