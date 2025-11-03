import mongoose from 'mongoose';
import { IBrand } from './brand.types';

const BrandSchema = new mongoose.Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      unique: [true, 'Brand name must be unique'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: [true, 'Slug must be unique'],
      lowercase: true,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    website: {
      type: String,
      trim: true,
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

BrandSchema.index({ is_active: 1 });
BrandSchema.index({ featured: 1 });
BrandSchema.index({ order: 1 });

const BrandModel = mongoose.model<IBrand>('Brand', BrandSchema);

export default BrandModel;
