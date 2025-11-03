import { Response } from 'express';
import { IRequestWithUser } from '../../app/types';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/response-handler';
import { ProductService } from './product.service';
import { GetProductsQuery } from './product.validation';

export const getProducts = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const query = req.query as unknown as GetProductsQuery;
    const result = await ProductService.list(query);

    return successResponse(res, {
      statusCode: 200,
      message: 'Products fetched successfully',
      payload: result,
    });
  },
);

export const getProductById = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const fields = req.query.fields as string | undefined;
    const includeCampaigns = req.query.includeCampaigns as string | undefined;
    const includeOffers = req.query.includeOffers as string | undefined;
    const product = await ProductService.getById(
      id,
      fields,
      includeCampaigns,
      includeOffers,
    );

    return successResponse(res, {
      statusCode: 200,
      message: 'Product fetched successfully',
      payload: { data: product },
    });
  },
);

export const createProduct = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const product = await ProductService.create(req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'Product created successfully',
      payload: { data: product },
    });
  },
);

export const updateProduct = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const product = await ProductService.update(id, req.body);

    return successResponse(res, {
      statusCode: 200,
      message: 'Product updated successfully',
      payload: { data: product },
    });
  },
);

export const changeProductStatus = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const { is_active } = req.body;
    const product = await ProductService.changeStatus(id, is_active);

    return successResponse(res, {
      statusCode: 200,
      message: 'Product status updated successfully',
      payload: { data: product },
    });
  },
);

export const deleteProduct = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    await ProductService.remove(id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Product deleted successfully',
    });
  },
);

export const addVariant = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const product = await ProductService.addVariant(id, req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'Variant added successfully',
      payload: { data: product },
    });
  },
);

export const updateVariant = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, variantId } = req.params;
    const product = await ProductService.updateVariant(id, variantId, req.body);

    return successResponse(res, {
      statusCode: 200,
      message: 'Variant updated successfully',
      payload: { data: product },
    });
  },
);

export const deleteVariant = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, variantId } = req.params;
    const product = await ProductService.deleteVariant(id, variantId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Variant deleted successfully',
      payload: { data: product },
    });
  },
);

export const addReview = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    const product = await ProductService.addReview(id, req.body, userId);

    return successResponse(res, {
      statusCode: 201,
      message: 'Review added successfully',
      payload: { data: product },
    });
  },
);

export const updateReview = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, reviewId } = req.params;
    const userId = req.user!._id.toString();
    const product = await ProductService.updateReview(
      id,
      reviewId,
      req.body,
      userId,
    );

    return successResponse(res, {
      statusCode: 200,
      message: 'Review updated successfully',
      payload: { data: product },
    });
  },
);

export const deleteReview = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, reviewId } = req.params;
    const userId = req.user!._id.toString();
    const product = await ProductService.deleteReview(id, reviewId, userId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Review deleted successfully',
      payload: { data: product },
    });
  },
);

export const addFAQ = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const product = await ProductService.addFAQ(id, req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'FAQ added successfully',
      payload: { data: product },
    });
  },
);

export const updateFAQ = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, faqId } = req.params;
    const product = await ProductService.updateFAQ(id, faqId, req.body);

    return successResponse(res, {
      statusCode: 200,
      message: 'FAQ updated successfully',
      payload: { data: product },
    });
  },
);

export const deleteFAQ = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, faqId } = req.params;
    const product = await ProductService.deleteFAQ(id, faqId);

    return successResponse(res, {
      statusCode: 200,
      message: 'FAQ deleted successfully',
      payload: { data: product },
    });
  },
);

export const updateInventory = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const { variantId, inventory } = req.body;
    const product = await ProductService.updateInventory(
      id,
      variantId,
      inventory,
    );

    return successResponse(res, {
      statusCode: 200,
      message: 'Inventory updated successfully',
      payload: { data: product },
    });
  },
);

/**
 * Link campaigns to a product
 * @route POST /api/v1/products/:id/campaigns
 * @access Admin only
 */
export const linkCampaigns = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const { campaigns } = req.body;
    const product = await ProductService.linkCampaigns(id, campaigns);

    return successResponse(res, {
      statusCode: 200,
      message: 'Campaigns linked successfully',
      payload: { data: product },
    });
  },
);

/**
 * Unlink a campaign from a product
 * @route DELETE /api/v1/products/:id/campaigns/:campaignId
 * @access Admin only
 */
export const unlinkCampaign = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, campaignId } = req.params;
    const product = await ProductService.unlinkCampaign(id, campaignId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Campaign unlinked successfully',
      payload: { data: product },
    });
  },
);

/**
 * Link offers to a product
 * @route POST /api/v1/products/:id/offers
 * @access Admin only
 */
export const linkOffers = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id } = req.params;
    const { offers } = req.body;
    const product = await ProductService.linkOffers(id, offers);

    return successResponse(res, {
      statusCode: 200,
      message: 'Offers linked successfully',
      payload: { data: product },
    });
  },
);

/**
 * Unlink an offer from a product
 * @route DELETE /api/v1/products/:id/offers/:offerId
 * @access Admin only
 */
export const unlinkOffer = asyncHandler(
  async (req: IRequestWithUser, res: Response) => {
    const { id, offerId } = req.params;
    const product = await ProductService.unlinkOffer(id, offerId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Offer unlinked successfully',
      payload: { data: product },
    });
  },
);
