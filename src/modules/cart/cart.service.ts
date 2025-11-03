import createError from 'http-errors';
import mongoose from 'mongoose';
import {
  deleteCache,
  generateCacheKey,
  getCache,
  setCache,
} from '../../utils/cache';
import { isValidMongoId } from '../../utils/is-valid-mongo-id';
import CartModel from './cart.model';
import { GetAllCartsQuery, GetCartQuery } from './cart.validation';

export const CART_RESOURCE = 'cart';

export class CartService {
  static async getCart(userId: string, query: GetCartQuery) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    const { includeUser, includeProduct, fields } = query;

    const cacheKey = generateCacheKey({
      resource: `${CART_RESOURCE}:${userId}`,
      query: { includeUser, includeProduct, fields },
    });
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Build selection string
    let selectFields = '';
    if (fields) {
      const requestedFields = fields
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f);

      if (requestedFields.length > 0) {
        selectFields = requestedFields.join(' ');
      }
    }

    const cartQuery = CartModel.findOne({ user: userId });

    if (selectFields) {
      cartQuery.select(selectFields);
    }

    if (includeUser) {
      cartQuery.populate('user', 'first_name last_name email');
    }

    if (includeProduct) {
      cartQuery.populate('items.product', 'name slug price images');
    }

    const cart = await cartQuery.lean();

    // If cart doesn't exist, create an empty one
    if (!cart) {
      const newCart = await CartModel.create({
        user: userId,
        items: [],
      });
      const result = newCart.toObject();
      await setCache(cacheKey, result);
      return result;
    }

    await setCache(cacheKey, cart);
    return cart;
  }

  static async addItem(userId: string, productId: string, quantity: number) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    if (!isValidMongoId(productId)) {
      throw createError.BadRequest('Invalid product ID');
    }

    // Find or create cart
    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      cart = await CartModel.create({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    } else {
      // Check if product already exists in cart
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId,
      );

      if (existingItem) {
        // Update quantity
        existingItem.quantity += quantity;
      } else {
        // Add new item
        cart.items.push({
          product: new mongoose.Types.ObjectId(productId),
          quantity,
        });
      }

      await cart.save();
    }

    // Clear cache
    await deleteCache(`${CART_RESOURCE}:${userId}:*`);
    await deleteCache(`${CART_RESOURCE}:all:*`);

    return cart;
  }

  static async updateItem(userId: string, itemId: string, quantity: number) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    if (!isValidMongoId(itemId)) {
      throw createError.BadRequest('Invalid item ID');
    }

    const cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      throw createError.NotFound('Cart not found');
    }

    const item = cart.items.find((i) => i._id?.toString() === itemId);

    if (!item) {
      throw createError.NotFound('Item not found in cart');
    }

    item.quantity = quantity;
    await cart.save();

    // Clear cache
    await deleteCache(`${CART_RESOURCE}:${userId}:*`);
    await deleteCache(`${CART_RESOURCE}:all:*`);

    return cart;
  }

  static async removeItem(userId: string, itemId: string) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    if (!isValidMongoId(itemId)) {
      throw createError.BadRequest('Invalid item ID');
    }

    const cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      throw createError.NotFound('Cart not found');
    }

    const itemIndex = cart.items.findIndex((i) => i._id?.toString() === itemId);

    if (itemIndex === -1) {
      throw createError.NotFound('Item not found in cart');
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Clear cache
    await deleteCache(`${CART_RESOURCE}:${userId}:*`);
    await deleteCache(`${CART_RESOURCE}:all:*`);

    return cart;
  }

  static async clearCart(userId: string) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    const cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      throw createError.NotFound('Cart not found');
    }

    cart.items = [];
    await cart.save();

    // Clear cache
    await deleteCache(`${CART_RESOURCE}:${userId}:*`);
    await deleteCache(`${CART_RESOURCE}:all:*`);

    return { message: 'Cart cleared successfully' };
  }

  static async getAllCarts(query: GetAllCartsQuery) {
    const { includeUser, includeProduct, fields, page = 1, limit = 10 } = query;

    const cacheKey = generateCacheKey({
      resource: `${CART_RESOURCE}:all`,
      query: { includeUser, includeProduct, fields, page, limit },
    });
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Build selection string
    let selectFields = '';
    if (fields) {
      const requestedFields = fields
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f);

      if (requestedFields.length > 0) {
        selectFields = requestedFields.join(' ');
      }
    }

    const skip = (page - 1) * limit;

    const cartQuery = CartModel.find();

    if (selectFields) {
      cartQuery.select(selectFields);
    }

    if (includeUser) {
      cartQuery.populate('user', 'first_name last_name email');
    }

    if (includeProduct) {
      cartQuery.populate('items.product', 'name slug price images');
    }

    const [carts, total] = await Promise.all([
      cartQuery.skip(skip).limit(limit).lean(),
      CartModel.countDocuments(),
    ]);

    const result = {
      data: carts,
      pagination: {
        items: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setCache(cacheKey, result);
    return result;
  }

  static async getCartByUserId(userId: string, query: GetCartQuery) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    return this.getCart(userId, query);
  }

  static async clearCartByUserId(userId: string) {
    if (!isValidMongoId(userId)) {
      throw createError.BadRequest('Invalid user ID');
    }

    return this.clearCart(userId);
  }
}
