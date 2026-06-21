import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  ingredients: [{ type: String, required: true }],
  instructions: [{
    text: { type: String, required: true },
    timer: {
      duration: { type: Number, default: 0 },
      hasTimer: { type: Boolean, default: false }
    }
  }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'category' }],
  prepTime: { hours: { type: Number, default: 0 }, minutes: { type: Number, default: 0 } },
  servings: { type: String },
  notes: { type: String },
  isFavorite: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

recipeSchema.index({ categories: 1 });

export default mongoose.model('recipe', recipeSchema);
