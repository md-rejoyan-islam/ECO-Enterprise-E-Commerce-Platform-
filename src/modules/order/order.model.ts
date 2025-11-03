import { Schema, model } from 'mongoose';
import { IOrder } from './order.types';

const OrderSchema = new Schema<IOrder>(
  {
    id: {
      type: Number,
      unique: true,
      required: [true, 'Order ID is required'],
    },
    user_id: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User',
    },
    coupon: {
      type: String,
      ref: 'Coupon',
    },
    order_items: [
      {
        product_id: {
          type: String,
          required: [true, 'Product ID is required'],
          ref: 'Product',
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: [true, 'Price is required'],
          min: [0, 'Price must be greater than or equal to 0'],
        },
      },
    ],
    total_amount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount must be greater than or equal to 0'],
    },
    payment_method: {
      type: String,
      enum: {
        values: [
          'bkash',
          'rocket',
          'nagad',
          'credit_card',
          'debit_card',
          'cash_on_delivery',
        ],
        message: '{VALUE} is not a valid payment method',
      },
      required: [true, 'Payment method is required'],
    },
    order_status: {
      type: String,
      enum: {
        values: [
          'pending',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'returned',
        ],
        message: '{VALUE} is not a valid order status',
      },
      default: 'pending',
    },
    transaction_id: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
    },
    shipped_date: {
      type: Date,
    },
    delivered_date: {
      type: Date,
    },
    cancellation_date: {
      type: Date,
    },
    cancellation_reason: {
      type: String,
    },
    return_reason: {
      type: String,
    },
    is_returned: {
      type: Boolean,
      default: false,
    },
    return_date: {
      type: Date,
    },
    refund_amount: {
      type: Number,
      min: [0, 'Refund amount must be greater than or equal to 0'],
    },
    refund_status: {
      type: String,
      enum: {
        values: ['pending', 'processed', 'failed'],
        message: '{VALUE} is not a valid refund status',
      },
    },
    tracking_number: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    shipping_address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      zip_code: {
        type: String,
        required: [true, 'Zip code is required'],
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
OrderSchema.index({ user_id: 1 });
OrderSchema.index({ order_status: 1 });
OrderSchema.index({ tracking_number: 1 });
OrderSchema.index({ is_active: 1 });
OrderSchema.index({ createdAt: 1 });

// Auto-increment order ID
OrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastOrder = (await model('Order')
      .findOne({}, { id: 1 })
      .sort({ id: -1 })
      .lean()) as { id: number } | null;
    this.id = lastOrder ? lastOrder.id + 1 : 1;
  }
  next();
});

const OrderModel = model<IOrder>('Order', OrderSchema);

export default OrderModel;
