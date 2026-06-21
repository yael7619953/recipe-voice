import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: function () { return this.provider === 'local'; } },
  googleId: { type: String, default: null },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  favorites: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('user', userSchema);
