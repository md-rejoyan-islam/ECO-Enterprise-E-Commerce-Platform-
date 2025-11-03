import { Schema, model } from 'mongoose';
import { ICoupon } from './coupon.types';

const CouponSchema = new Schema<ICoupon>(
  {
    name: {
      type: String,
      required: [true, 'Coupon name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Coupon description is required'],
    },
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discount_type: {
      type: String,
      enum: {
        values: ['percentage', 'fixed_amount'],
        message: '{VALUE} is not a valid discount type',
      },
      required: [true, 'Discount type is required'],
    },
    discount_value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be greater than or equal to 0'],
    },
    usage_limit_per_user: {
      type: Number,
      default: 1,
      min: [1, 'Usage limit per user must be at least 1'],
    },
    total_usage_limit: {
      type: Number,
      default: 0,
      min: [0, 'Total usage limit must be greater than or equal to 0'],
    },
    expiration_date: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    minimum_purchase_amount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum purchase amount must be greater than or equal to 0'],
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

// Indexes for better query performance
CouponSchema.index({ is_active: 1 });
CouponSchema.index({ expiration_date: 1 });
CouponSchema.index({ discount_type: 1 });

const CouponModel = model<ICoupon>('Coupon', CouponSchema);

export default CouponModel;
