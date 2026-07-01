import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API = '/api/ai';

/** Recipe shape returned by `POST /api/ai/extract` (a `RecipeDraft` minus
 * `categories`, `isFavorite`, `imageUrl`, which the file never carries). */
export interface ExtractedRecipe {
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: { text: string; timer: { duration: number; hasTimer: boolean } }[];
  prepTime: { hours: number; minutes: number };
  servings: string;
  notes: string | null;
}

interface ExtractResponse {
  success: boolean;
  data: ExtractedRecipe;
}

@Injectable({ providedIn: 'root' })
export class AiImportService {
  private http = inject(HttpClient);

  /** Upload a PDF / image / Word file and let the server extract a recipe draft. */
  extract(file: File): Observable<ExtractedRecipe> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ExtractResponse>(`${API}/extract`, fd).pipe(map((res) => res.data));
  }
}
