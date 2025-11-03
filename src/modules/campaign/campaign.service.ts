import createError from 'http-errors';
import {
  deleteCache,
  generateCacheKey,
  getCache,
  setCache,
} from '../../utils/cache';
import { isValidMongoId } from '../../utils/is-valid-mongo-id';
import ProductModel from '../product/product.model';
import CampaignModel from './campaign.model';
import { ICampaign } from './campaign.types';
import {
  CreateCampaignBody,
  GetCampaignByIdQuery,
  GetCampaignsQuery,
  UpdateCampaignBody,
} from './campaign.validation';

const CAMPAIGN_RESOURCE = 'campaigns';
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

export class CampaignService {
  static async list(query: GetCampaignsQuery) {
    const {
      search,
      is_active,
      fields,
      includeProducts,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    // Generate cache key
    const cacheKey = generateCacheKey({
      resource: `${CAMPAIGN_RESOURCE}:list`,
      query: {
        search,
        is_active,
        fields,
        includeProducts,
        sortBy,
        sortOrder,
        page,
        limit,
      },
    });

    // Check cache
    const cached = await getCache<{
      campaigns: ICampaign[];
      pagination: {
        items: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Build filter
    const filter: {
      is_active?: boolean;
      $or?: { [key: string]: { $regex: string; $options: string } }[];
    } = {};

    if (typeof is_active === 'string') {
      filter.is_active = is_active === 'true';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {
      [sortBy!]: sortOrder === 'asc' ? 1 : -1,
    };

    // Build select fields
    let selectFields = '';
    if (fields) {
      selectFields = fields
        .split(',')
        .map((f) => f.trim())
        .join(' ');
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    const campaignQuery = CampaignModel.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    if (selectFields) {
      campaignQuery.select(selectFields);
    }

    // Populate products if requested
    if (includeProducts === 'true') {
      campaignQuery.populate('applies_to.productsIds', 'name image price');
    }

    // Execute query
    const [campaigns, total] = await Promise.all([
      campaignQuery.lean(),
      CampaignModel.countDocuments(filter),
    ]);

    const result = {
      campaigns,
      pagination: {
        items: total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };

    // Cache result
    await setCache(cacheKey, result, CACHE_TTL);

    return result;
  }

  static async getById(id: string, query?: GetCampaignByIdQuery) {
    if (!isValidMongoId(id)) {
      throw createError.BadRequest('Invalid campaign ID');
    }

    const { fields, includeProducts } = query || {};

    // Generate cache key
    const cacheKey = generateCacheKey({
      resource: `${CAMPAIGN_RESOURCE}:${id}`,
      query: { fields, includeProducts },
    });

    // Check cache
    const cached = await getCache<ICampaign>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build select fields
    let selectFields = '';
    if (fields) {
      selectFields = fields
        .split(',')
        .map((f) => f.trim())
        .join(' ');
    }

    // Build query
    const campaignQuery = CampaignModel.findById(id);

    if (selectFields) {
      campaignQuery.select(selectFields);
    }

    // Populate products if requested
    if (includeProducts === 'true') {
      campaignQuery.populate('applies_to.productsIds', 'name image price');
    }

    // Execute query
    const campaign = await campaignQuery.lean();

    if (!campaign) {
      throw createError.NotFound('Campaign not found');
    }

    // Cache result
    await setCache(cacheKey, campaign, CACHE_TTL);

    return campaign;
  }

  static async create(data: CreateCampaignBody) {
    const campaign = await CampaignModel.create(data);

    // Link campaign to products if product IDs are provided
    if (
      data.applies_to?.productsIds &&
      data.applies_to.productsIds.length > 0
    ) {
      await ProductModel.updateMany(
        { _id: { $in: data.applies_to.productsIds } },
        { $addToSet: { campaigns: campaign._id } },
      );

      // Invalidate product cache
      await deleteCache('products:list:*');
    }

    // Invalidate cache
    await deleteCache(generateCacheKey({ resource: CAMPAIGN_RESOURCE }));

    return { _id: campaign._id };
  }

  static async update(id: string, data: UpdateCampaignBody) {
    if (!isValidMongoId(id)) {
      throw createError.BadRequest('Invalid campaign ID');
    }

    // Get old campaign to compare product IDs
    const oldCampaign = await CampaignModel.findById(id);
    if (!oldCampaign) {
      throw createError.NotFound('Campaign not found');
    }

    const campaign = await CampaignModel.findByIdAndUpdate(id, data, {
      new: true,
    }).lean();

    // Handle product linking updates if productsIds changed
    if (data.applies_to?.productsIds) {
      const oldProductIds = oldCampaign.applies_to?.productsIds || [];
      const newProductIds = data.applies_to.productsIds;

      // Find products to unlink (in old but not in new)
      const productsToUnlink = oldProductIds.filter(
        (pid) => !newProductIds.includes(pid),
      );

      // Find products to link (in new but not in old)
      const productsToLink = newProductIds.filter(
        (pid) => !oldProductIds.includes(pid),
      );

      // Unlink campaign from removed products
      if (productsToUnlink.length > 0) {
        await ProductModel.updateMany(
          { _id: { $in: productsToUnlink } },
          { $pull: { campaigns: id } },
        );
      }

      // Link campaign to new products
      if (productsToLink.length > 0) {
        await ProductModel.updateMany(
          { _id: { $in: productsToLink } },
          { $addToSet: { campaigns: id } },
        );
      }

      // Invalidate product cache if any changes
      if (productsToUnlink.length > 0 || productsToLink.length > 0) {
        await deleteCache('products:list:*');
      }
    }

    // Invalidate cache
    await deleteCache(
      generateCacheKey({ resource: `${CAMPAIGN_RESOURCE}:${id}` }),
    );
    await deleteCache(generateCacheKey({ resource: CAMPAIGN_RESOURCE }));

    return campaign;
  }

  static async updateStatus(id: string, is_active: boolean) {
    return this.update(id, { is_active });
  }

  static async delete(id: string) {
    if (!isValidMongoId(id)) {
      throw createError.BadRequest('Invalid campaign ID');
    }

    const campaign = await CampaignModel.findById(id).select(
      '_id applies_to.productsIds',
    );

    if (!campaign) {
      throw createError.NotFound('Campaign not found');
    }

    // Unlink campaign from all associated products
    if (
      campaign.applies_to?.productsIds &&
      campaign.applies_to.productsIds.length > 0
    ) {
      await ProductModel.updateMany(
        { _id: { $in: campaign.applies_to.productsIds } },
        { $pull: { campaigns: id } },
      );

      // Invalidate product cache
      await deleteCache('products:list:*');
    }

    // Delete the campaign
    await CampaignModel.findByIdAndDelete(id);

    // Invalidate cache
    await deleteCache(
      generateCacheKey({ resource: `${CAMPAIGN_RESOURCE}:${id}` }),
    );
    await deleteCache(generateCacheKey({ resource: CAMPAIGN_RESOURCE }));

    return { _id: campaign._id };
  }
}
