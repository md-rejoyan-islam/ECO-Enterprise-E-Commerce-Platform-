import { Response } from 'express';
import { IRequestWithUser } from '../../app/types';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/response-handler';
import { CartService } from './cart.service';
import { GetAllCartsQuery, GetCartQuery } from './cart.validation';

export const getCart = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user!._id.toString();
    const query = req.query as GetCartQuery;
    const cart = await CartService.getCart(userId, query);

    return successResponse(res, {
      statusCode: 200,
      message: 'Cart fetched successfully',
      payload: { data: cart },
    });
  },
);

export const addItem = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user!._id.toString();
    const { product, quantity } = req.body;
    const cart = await CartService.addItem(userId, product, quantity);

    return successResponse(res, {
      statusCode: 201,
      message: 'Item added to cart successfully',
      payload: { data: cart },
    });
  },
);

export const updateItem = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user!._id.toString();
    const { itemId } = req.params;
    const { quantity } = req.body;
    const cart = await CartService.updateItem(userId, itemId, quantity);

    return successResponse(res, {
      statusCode: 200,
      message: 'Cart item updated successfully',
      payload: { data: cart },
    });
  },
);

export const removeItem = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user!._id.toString();
    const { itemId } = req.params;
    const cart = await CartService.removeItem(userId, itemId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Item removed from cart successfully',
      payload: { data: cart },
    });
  },
);

export const clearCart = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await CartService.clearCart(userId);

    return successResponse(res, {
      statusCode: 200,
      message: result.message,
    });
  },
);

export const getAllCarts = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const query = req.query as unknown as GetAllCartsQuery;
    const result = await CartService.getAllCarts(query);

    return successResponse(res, {
      statusCode: 200,
      message: 'Carts fetched successfully',
      payload: result,
    });
  },
);

export const getUserCart = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { userId } = req.params;
    const query = req.query as unknown as GetCartQuery;
    const cart = await CartService.getCartByUserId(userId, query);

    return successResponse(res, {
      statusCode: 200,
      message: 'User cart fetched successfully',
      payload: { data: cart },
    });
  },
);

export const clearUserCart = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { userId } = req.params;
    const result = await CartService.clearCartByUserId(userId);

    return successResponse(res, {
      statusCode: 200,
      message: result.message,
    });
  },
);
