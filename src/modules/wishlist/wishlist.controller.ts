import { Response } from 'express';
import { IRequestWithUser } from '../../app/types';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/response-handler';
import { WishlistService } from './wishlist.service';
import {
  GetAllWishlistItemsQuery,
  GetUserWishlistQuery,
  GetWishlistQuery,
} from './wishlist.validation';

export const getWishlist = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user?._id as string;
    const query = req.query as GetWishlistQuery;

    const wishlist = await WishlistService.getWishlist(userId, query);

    return successResponse(res, {
      statusCode: 200,
      message: 'Wishlist fetched successfully',
      payload: { data: wishlist },
    });
  },
);

export const addItem = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user?._id as string;
    const { product } = req.body;

    const wishlist = await WishlistService.addItem(userId, product);

    return successResponse(res, {
      statusCode: 201,
      message: 'Item added to wishlist successfully',
      payload: { data: wishlist },
    });
  },
);

export const getItem = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user?._id as string;
    const { id } = req.params;
    const query = req.query as unknown as GetWishlistQuery;

    const item = await WishlistService.getItem(userId, id, query);

    return successResponse(res, {
      statusCode: 200,
      message: 'Wishlist item fetched successfully',
      payload: { data: item },
    });
  },
);

export const removeItem = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user?._id as string;
    const { id } = req.params;

    const wishlist = await WishlistService.removeItem(userId, id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Item removed from wishlist successfully',
      payload: { data: wishlist },
    });
  },
);

export const clearWishlist = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const userId = req.user?._id as string;

    const wishlist = await WishlistService.clearWishlist(userId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Wishlist cleared successfully',
      payload: { data: wishlist },
    });
  },
);

export const getAllWishlists = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const query = req.query as unknown as GetAllWishlistItemsQuery;

    const result = await WishlistService.getAllWishlists(query);

    return successResponse(res, {
      statusCode: 200,
      message: 'All wishlists fetched successfully',
      payload: { wishlists: result.wishlists, pagination: result.pagination },
    });
  },
);

export const getUserWishlist = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { userId } = req.params;
    const query = req.query as unknown as GetUserWishlistQuery['query'];

    const wishlist = await WishlistService.getWishlistByUserId(userId, query);

    return successResponse(res, {
      statusCode: 200,
      message: 'User wishlist fetched successfully',
      payload: { data: wishlist },
    });
  },
);

export const clearUserWishlist = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { userId } = req.params;

    const wishlist = await WishlistService.clearWishlistByUserId(userId);

    return successResponse(res, {
      statusCode: 200,
      message: 'User wishlist cleared successfully',
      payload: { data: wishlist },
    });
  },
);
