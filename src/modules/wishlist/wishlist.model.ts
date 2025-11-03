import mongoose from 'mongoose';
import { IWishlist, IWishlistItem } from './wishlist.types';

const WishlistItemSchema = new mongoose.Schema<IWishlistItem>(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const WishlistSchema = new mongoose.Schema<IWishlist>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      unique: true,
    },
    items: [WishlistItemSchema],
  },
  {
    timestamps: true,
  },
);

// Indexes
WishlistSchema.index({ 'items.product': 1 });

const WishlistModel = mongoose.model<IWishlist>('Wishlist', WishlistSchema);

export default WishlistModel;
