import mongoose from 'mongoose';
import { IFAQ, IInventory, IProduct, IReview, IVariant } from './product.type';

const InventorySchema = new mongoose.Schema<IInventory>({
  quantity_available: { type: Number, default: 0 },
  quantity_reserved: { type: Number, default: 0 },
  quantity_damaged: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now },
});

const VariantSchema = new mongoose.Schema<IVariant>({
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: [true, 'SKU must be unique'],
  },
  attributes: { type: Map, of: String },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
  },
  sale_price: {
    type: Number,
  },
  images: [{ type: String }],
  inventory: { type: InventorySchema, required: true },
});

const ReviewSchema = new mongoose.Schema<IReview>({
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: [true, 'User is required'],
  },
  timestamp: { type: Date, default: Date.now },
});

const FAQSchema = new mongoose.Schema<IFAQ>({
  question: {
    type: String,
    required: [true, 'Question is required'],
  },
  answer: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'Description is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Brand is required'],
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
    is_active: {
      type: Boolean,
      default: true,
    },
    campaigns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
    ],
    offers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
      },
    ],
    reviews: {
      type: [{ type: ReviewSchema }],
      as: 'reviews',
      default: [],
    },
    faq: {
      type: [{ type: FAQSchema }],
      as: 'faq',
      default: [],
    },
    variants: {
      type: [{ type: VariantSchema }],
      as: 'variants',
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ is_active: 1 });

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);

export default ProductModel;
