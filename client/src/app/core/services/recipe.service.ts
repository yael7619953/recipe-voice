import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recipe, RecipeDraft, RecipeListResponse } from '../models/recipe.model';

const API = '/api/recipes';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);

  list(page = 1, limit = 20): Observable<RecipeListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<RecipeListResponse>(API, { params });
  }

  getById(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${API}/${id}`);
  }

  create(draft: RecipeDraft): Observable<Recipe> {
    return this.http.post<Recipe>(API, draft);
  }

  update(id: string, draft: RecipeDraft): Observable<Recipe> {
    return this.http.put<Recipe>(`${API}/${id}`, draft);
  }

  patch(id: string, partial: Partial<RecipeDraft>): Observable<Recipe> {
    return this.http.patch<Recipe>(`${API}/${id}`, partial);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }

  toggleFavorite(id: string, isFavorite: boolean): Observable<Recipe> {
    return this.patch(id, { isFavorite });
  }
}
