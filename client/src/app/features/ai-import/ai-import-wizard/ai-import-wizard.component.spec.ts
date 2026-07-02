import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { AiImportWizardComponent } from './ai-import-wizard.component';
import { AiImportService, ExtractedRecipe } from '../../../core/services/ai-import.service';
import { RecipeService } from '../../../core/services/recipe.service';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

const MOCK_RECIPE: ExtractedRecipe = {
  title: 'Chocolate Cake',
  description: 'Rich and moist',
  ingredients: ['2 cups flour', '  ', '1 cup sugar'],
  instructions: [
    { text: 'Preheat oven', timer: { duration: 0, hasTimer: false } },
    { text: 'Bake', timer: { duration: 30, hasTimer: true } },
  ],
  prepTime: { hours: 0, minutes: 45 },
  servings: '8',
  notes: null,
};

function pdfFile(): File {
  return new File(['data'], 'recipe.pdf', { type: 'application/pdf' });
}

describe('AiImportWizardComponent', () => {
  let fixture: ComponentFixture<AiImportWizardComponent>;
  let component: AiImportWizardComponent;
  let aiImport: { extract: ReturnType<typeof vi.fn> };
  let recipeService: { create: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    aiImport = { extract: vi.fn() };
    recipeService = { create: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AiImportWizardComponent],
      providers: [
        { provide: AiImportService, useValue: aiImport },
        { provide: RecipeService, useValue: recipeService },
        provideRouter([]),
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiImportWizardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('step 1 — file type selection', () => {
    it('should start on the type step', () => {
      expect(component.step()).toBe('type');
    });

    it('should move to the upload step and reflect the accept filter', () => {
      component.chooseType('pdf');
      expect(component.step()).toBe('upload');
      expect(component.selectedType()).toBe('pdf');
      expect(component.accept()).toContain('application/pdf');
    });

    it('should clear a previously chosen file when picking a new type', () => {
      component.selectedFile.set(pdfFile());
      component.chooseType('image');
      expect(component.selectedFile()).toBeNull();
    });
  });

  describe('canExtract', () => {
    it('should be false without a file', () => {
      expect(component.canExtract()).toBe(false);
    });

    it('should be true once a file is selected', () => {
      component.selectedFile.set(pdfFile());
      expect(component.canExtract()).toBe(true);
    });

    it('should be false while extraction is in flight', () => {
      component.selectedFile.set(pdfFile());
      component.extracting.set(true);
      expect(component.canExtract()).toBe(false);
    });
  });

  describe('extract()', () => {
    it('should do nothing when no file is selected', () => {
      component.extract();
      expect(aiImport.extract).not.toHaveBeenCalled();
    });

    it('should build the preview form and advance on success', () => {
      aiImport.extract.mockReturnValue(of(MOCK_RECIPE));
      component.selectedFile.set(pdfFile());

      component.extract();

      expect(aiImport.extract).toHaveBeenCalledTimes(1);
      expect(component.step()).toBe('preview');
      expect(component.extracting()).toBe(false);
      expect(component.form.get('title')?.value).toBe('Chocolate Cake');
      expect(component.ingredientsArray.length).toBe(3);
      expect(component.instructionsArray.length).toBe(2);
    });

    it('should map a 415 error to the unsupported key', () => {
      aiImport.extract.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 415 })));
      component.chooseType('pdf');
      component.selectedFile.set(pdfFile());

      component.extract();

      expect(component.extractErrorKey()).toBe('aiImport.errors.unsupported');
      expect(component.extracting()).toBe(false);
      expect(component.step()).toBe('upload');
    });

    it('should fall back to a generic key on unexpected errors', () => {
      aiImport.extract.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.selectedFile.set(pdfFile());

      component.extract();

      expect(component.extractErrorKey()).toBe('aiImport.errors.extract');
    });

    it('should seed at least one empty row when the recipe has no items', () => {
      aiImport.extract.mockReturnValue(
        of({ ...MOCK_RECIPE, ingredients: [], instructions: [] }),
      );
      component.selectedFile.set(pdfFile());

      component.extract();

      expect(component.ingredientsArray.length).toBe(1);
      expect(component.instructionsArray.length).toBe(1);
    });
  });

  describe('preview editing', () => {
    beforeEach(() => {
      aiImport.extract.mockReturnValue(of(MOCK_RECIPE));
      component.selectedFile.set(pdfFile());
      component.extract();
    });

    it('should add and remove ingredient rows', () => {
      component.addIngredient();
      expect(component.ingredientsArray.length).toBe(4);
      component.removeIngredient(0);
      expect(component.ingredientsArray.length).toBe(3);
    });

    it('should never remove the last instruction row', () => {
      component.removeStep(0);
      component.removeStep(0);
      component.removeStep(0);
      expect(component.instructionsArray.length).toBe(1);
    });
  });

  describe('save()', () => {
    beforeEach(() => {
      aiImport.extract.mockReturnValue(of(MOCK_RECIPE));
      component.selectedFile.set(pdfFile());
      component.extract();
    });

    it('should not call the service when the form is invalid', () => {
      component.form.get('title')?.setValue('');
      component.save();
      expect(recipeService.create).not.toHaveBeenCalled();
    });

    it('should send a cleaned draft and navigate to the new recipe', () => {
      recipeService.create.mockReturnValue(of({ _id: 'abc123' }));
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.save();

      expect(recipeService.create).toHaveBeenCalledTimes(1);
      const draft = recipeService.create.mock.calls[0][0];
      // blank ingredient is filtered out
      expect(draft.ingredients).toEqual(['2 cups flour', '1 cup sugar']);
      // timer duration zeroed when hasTimer is false; converted from AI minutes to seconds when true
      expect(draft.instructions[0].timer).toEqual({ hasTimer: false, duration: 0 });
      expect(draft.instructions[1].timer).toEqual({ hasTimer: true, duration: 1800 });
      expect(draft.categories).toEqual([]);
      expect(draft.isFavorite).toBe(false);
      expect(navSpy).toHaveBeenCalledWith(['/recipes', 'abc123']);
    });

    it('should surface a save error and re-enable saving', () => {
      recipeService.create.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component.save();

      expect(component.saveErrorKey()).toBe('aiImport.errors.save');
      expect(component.saving()).toBe(false);
    });
  });
});
