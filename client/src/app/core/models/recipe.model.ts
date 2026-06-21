export interface InstructionStep {
  text: string;
  timer: {
    duration: number;
    hasTimer: boolean;
  };
}

export interface PrepTime {
  hours: number;
  minutes: number;
}

export interface Recipe {
  _id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: InstructionStep[];
  categories: string[];
  prepTime: PrepTime;
  servings?: string;
  notes?: string;
  isFavorite: boolean;
  userId: string;
  imageUrl?: string;
  createdAt: string;
}

export type RecipeDraft = Omit<Recipe, '_id' | 'userId' | 'createdAt'>;

export interface RecipeListResponse {
  items: Recipe[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
