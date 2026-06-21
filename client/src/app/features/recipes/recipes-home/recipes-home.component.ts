import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-recipes-home',
  imports: [TranslatePipe],
  templateUrl: './recipes-home.component.html',
  styleUrl: './recipes-home.component.scss',
})
export class RecipesHomeComponent {}
