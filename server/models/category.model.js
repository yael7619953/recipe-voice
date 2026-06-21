import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  icon: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null }
});

export default mongoose.model('category', categorySchema);
