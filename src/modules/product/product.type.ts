import mongoose from 'mongoose';

export interface IReview {
  rating: number;
  comment: string;
  user: mongoose.Types.ObjectId;
  timestamp: Date;
}

export interface IFAQ {
  question: string;
  answer: string;
  timestamp: Date;
}

export interface IInventory {
  quantity_available: number;
  quantity_reserved: number;
  quantity_damaged: number;
  last_updated: Date;
}

export interface IVariant {
  sku: string;
  attributes: Map<string, string>;
  price: number;
  sale_price?: number;
  images: string[];
  inventory: IInventory;
}

export interface IProduct {
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  slug: string;
  featured?: boolean;
  is_active?: boolean;
  campaigns?: mongoose.Types.ObjectId[];
  offers?: mongoose.Types.ObjectId[];
  reviews: IReview[];
  faq: IFAQ[];
  variants: IVariant[];
}
