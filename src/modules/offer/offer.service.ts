import createError from 'http-errors';
import {
  deleteCache,
  generateCacheKey,
  getCache,
  setCache,
} from '../../utils/cache';
import { isValidMongoId } from '../../utils/is-valid-mongo-id';
import ProductModel from '../product/product.model';
import OfferModel from './offer.model';
import { IOffer } from './offer.types';
import {
  CreateOfferBody,
  GetOfferByIdQuery,
  GetOffersQuery,
  UpdateOfferBody,
} from './offer.validation';

const OFFER_RESOURCE = 'offers';
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

export class OfferService {
  static async list(query: GetOffersQuery) {
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
      resource: `${OFFER_RESOURCE}:list`,
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
      offers: IOffer[];
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
    const offerQuery = OfferModel.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    if (selectFields) {
      offerQuery.select(selectFields);
    }

    // Populate products if requested
    if (includeProducts === 'true') {
      offerQuery.populate('applicable_products', 'name image price');
    }

    // Execute query
    const [offers, total] = await Promise.all([
      offerQuery.lean(),
      OfferModel.countDocuments(filter),
    ]);

    const result = {
      offers,
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

  static async getById(id: string, query?: GetOfferByIdQuery) {
    if (!isValidMongoId(id)) {
      throw createError.BadRequest('Invalid offer ID');
    }

    const { fields, includeProducts } = query || {};

    // Generate cache key
    const cacheKey = generateCacheKey({
      resource: `${OFFER_RESOURCE}:${id}`,
      query: { fields, includeProducts },
    });

    // Check cache
    const cached = await getCache<IOffer>(cacheKey);
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
    const offerQuery = OfferModel.findById(id);

    if (selectFields) {
      offerQuery.select(selectFields);
    }

    // Populate products if requested
    if (includeProducts === 'true') {
      offerQuery.populate('applicable_products', 'name image price');
    }

    // Execute query
    const offer = await offerQuery.lean();

    if (!offer) {
      throw createError.NotFound('Offer not found');
    }

    // Cache result
    await setCache(cacheKey, offer, CACHE_TTL);

    return offer;
  }

  static async create(data: CreateOfferBody) {
    const offer = await OfferModel.create(data);

    // Link offer to products if product IDs are provided
    if (data.applicable_products && data.applicable_products.length > 0) {
      await ProductModel.updateMany(
        { _id: { $in: data.applicable_products } },
        { $addToSet: { offers: offer._id } },
      );

      // Invalidate product cache
      await deleteCache('products:list:*');
    }

    // Invalidate cache
    await deleteCache(generateCacheKey({ resource: OFFER_RESOURCE }));

    return { _id: offer._id };
  }

  static async update(id: string, data: UpdateOfferBody) {
    if (!isValidMongoId(id)) {
      throw createError.BadRequest('Invalid offer ID');
    }

    // Get old offer to compare product IDs
    const oldOffer = await OfferModel.findById(id);
    if (!oldOffer) {
      throw createError.NotFound('Offer not found');
    }

    const offer = await OfferModel.findByIdAndUpdate(id, data, {
      new: true,
    }).lean();

    // Handle product linking updates if applicable_products changed
    if (data.applicable_products) {
      const oldProductIds = oldOffer.applicable_products || [];
      const newProductIds = data.applicable_products;

      // Find products to unlink (in old but not in new)
      const productsToUnlink = oldProductIds.filter(
        (pid) => !newProductIds.includes(pid),
      );

      // Find products to link (in new but not in old)
      const productsToLink = newProductIds.filter(
        (pid) => !oldProductIds.includes(pid),
      );

      // Unlink offer from removed products
      if (productsToUnlink.length > 0) {
        await ProductModel.updateMany(
          { _id: { $in: productsToUnlink } },
          { $pull: { offers: id } },
        );
      }

      // Link offer to new products
      if (productsToLink.length > 0) {
        await ProductModel.updateMany(
          { _id: { $in: productsToLink } },
          { $addToSet: { offers: id } },
        );
      }

      // Invalidate product cache if any changes
      if (productsToUnlink.length > 0 || productsToLink.length > 0) {
        await deleteCache('products:list:*');
      }
    }

    // Invalidate cache
    await deleteCache(
      generateCacheKey({ resource: `${OFFER_RESOURCE}:${id}` }),
    );
    await deleteCache(generateCacheKey({ resource: OFFER_RESOURCE }));

    return offer;
  }

  static async updateStatus(id: string, is_active: boolean) {
    return this.update(id, { is_active });
  }

  static async delete(id: string) {
    if (!isValidMongoId(id)) {
      throw createError.BadRequest('Invalid offer ID');
    }

    const offer = await OfferModel.findById(id).select(
      '_id applicable_products',
    );

    if (!offer) {
      throw createError.NotFound('Offer not found');
    }

    // Unlink offer from all associated products
    if (offer.applicable_products && offer.applicable_products.length > 0) {
      await ProductModel.updateMany(
        { _id: { $in: offer.applicable_products } },
        { $pull: { offers: id } },
      );

      // Invalidate product cache
      await deleteCache('products:list:*');
    }

    // Delete the offer
    await OfferModel.findByIdAndDelete(id);

    // Invalidate cache
    await deleteCache(
      generateCacheKey({ resource: `${OFFER_RESOURCE}:${id}` }),
    );
    await deleteCache(generateCacheKey({ resource: OFFER_RESOURCE }));

    return { _id: offer._id };
  }
}
