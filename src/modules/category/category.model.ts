import mongoose from 'mongoose';
import { ICategory } from './catgory.types';

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: [true, 'Slug must be unique'],
      lowercase: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

CategorySchema.index({ is_active: 1 });
CategorySchema.index({ featured: 1 });
CategorySchema.index({ parent_id: 1 });
CategorySchema.index({ order: 1 });

const CategoryModel = mongoose.model<ICategory>('Category', CategorySchema);

export default CategoryModel;
