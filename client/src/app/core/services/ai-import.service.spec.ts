import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AiImportService, ExtractedRecipe } from './ai-import.service';

const MOCK_RECIPE: ExtractedRecipe = {
  title: 'Pancakes',
  description: 'Fluffy pancakes',
  ingredients: ['2 cups flour', '1 egg'],
  instructions: [{ text: 'Mix everything', timer: { duration: 0, hasTimer: false } }],
  prepTime: { hours: 0, minutes: 20 },
  servings: '4',
  notes: null,
};

describe('AiImportService', () => {
  let service: AiImportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AiImportService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AiImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST the file as multipart/form-data to /api/ai/extract', () => {
    const file = new File(['data'], 'recipe.pdf', { type: 'application/pdf' });

    service.extract(file).subscribe();

    const req = httpMock.expectOne('/api/ai/extract');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBe(file);

    req.flush({ success: true, data: MOCK_RECIPE });
  });

  it('should unwrap and return the `data` payload', () => {
    const file = new File(['data'], 'recipe.pdf', { type: 'application/pdf' });
    let result: ExtractedRecipe | undefined;

    service.extract(file).subscribe((r) => (result = r));

    httpMock.expectOne('/api/ai/extract').flush({ success: true, data: MOCK_RECIPE });

    expect(result).toEqual(MOCK_RECIPE);
  });

  it('should propagate HTTP errors to the caller', () => {
    const file = new File(['data'], 'recipe.pdf', { type: 'application/pdf' });
    let status: number | undefined;

    service.extract(file).subscribe({
      next: () => {
        throw new Error('expected an error, not a value');
      },
      error: (err) => (status = err.status),
    });

    httpMock
      .expectOne('/api/ai/extract')
      .flush({ message: 'nope' }, { status: 503, statusText: 'Service Unavailable' });

    expect(status).toBe(503);
  });
});
