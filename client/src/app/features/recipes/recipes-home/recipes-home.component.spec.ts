import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { RecipesHomeComponent } from './recipes-home.component';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

describe('RecipesHomeComponent', () => {
  let fixture: ComponentFixture<RecipesHomeComponent>;
  let component: RecipesHomeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipesHomeComponent],
      providers: [
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipesHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the recipes home layout', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.recipes-home')).toBeTruthy();
    expect(el.querySelector('h1')).toBeTruthy();
    expect(el.querySelector('p')).toBeTruthy();
  });
});
