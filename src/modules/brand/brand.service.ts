import createError from 'http-errors';
import {
  deleteCache,
  generateCacheKey,
  getCache,
  setCache,
} from '../../utils/cache';
import generateSlug from '../../utils/generate-slug';
import { isValidMongoId } from '../../utils/is-valid-mongo-id';
import BrandModel from './brand.model';
import { GetBrandByIdQuery, GetBrandsQuery } from './brand.validation';

export const BRAND_RESOURCE = 'brands';

export class BrandService {
  static async list(query: GetBrandsQuery) {
    const {
      search,
      featured,
      is_active,
      fields,
      page = 1,
      limit = 10,
      sortBy = 'order',
      sortOrder = 'asc',
    } = query || {};

    const filter: {
      featured?: boolean;
      is_active?: boolean;
      $or?: { [key: string]: { $regex: string; $options: string } }[];
    } = {};
    if (typeof featured === 'boolean') filter.featured = featured;
    if (typeof is_active === 'boolean') filter.is_active = is_active;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { website: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy!]: sortOrder === 'asc' ? 1 : -1,
    };

    const cacheKey = generateCacheKey({
      resource: BRAND_RESOURCE,
      query: { ...filter, fields, page, limit, sort },
    });
    const cached = await getCache<{
      brands: unknown[];
      pagination: {
        items: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(cacheKey);
    if (cached) return cached;

    // Build select fields
    let selectFields = '';
    if (fields) {
      selectFields = fields
        .split(',')
        .map((f) => f.trim())
        .join(' ');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const brandQuery = BrandModel.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    if (selectFields) {
      brandQuery.select(selectFields);
    }

    const [brands, total] = await Promise.all([
      brandQuery.lean(),
      BrandModel.countDocuments(filter),
    ]);

    const payload = {
      brands,
      pagination: {
        items: total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
    await setCache(cacheKey, payload);
    return payload;
  }

  static async getById(id: string, query?: GetBrandByIdQuery) {
    if (!isValidMongoId(id)) throw createError.BadRequest('Invalid brand id');

    const { fields } = query || {};

    const cacheKey = generateCacheKey({
      resource: `${BRAND_RESOURCE}:${id}`,
      query: { fields },
    });
    const cached = await getCache<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    // Build select fields
    let selectFields = '';
    if (fields) {
      selectFields = fields
        .split(',')
        .map((f) => f.trim())
        .join(' ');
    }

    const brandQuery = BrandModel.findById(id);

    if (selectFields) {
      brandQuery.select(selectFields);
    }

    const brand = await brandQuery.lean();
    if (!brand) throw createError.NotFound('Brand not found');
    await setCache(cacheKey, brand);
    return brand;
  }

  static async create(data: Record<string, unknown>) {
    // Check if name already exists
    const nameExists = await BrandModel.findOne({ name: data.name }).lean();
    if (nameExists) throw createError.Conflict('Brand name already exists');

    // Generate slug from name if not provided
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name as string);
    }

    // Check if slug already exists
    const slugExists = await BrandModel.findOne({ slug: data.slug }).lean();
    if (slugExists) throw createError.Conflict('Brand slug already exists');

    const brand = await BrandModel.create(data);
    await deleteCache(generateCacheKey({ resource: BRAND_RESOURCE }));
    return { _id: brand._id };
  }

  static async update(id: string, data: Record<string, unknown>) {
    if (!isValidMongoId(id)) throw createError.BadRequest('Invalid brand id');

    // Generate slug from name if name is being updated and slug is not provided
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name as string);
    }

    // Check if slug already exists for another brand
    if (data.slug) {
      const slugExists = await BrandModel.findOne({
        slug: data.slug,
        _id: { $ne: id },
      }).lean();
      if (slugExists) throw createError.Conflict('Brand slug already exists');
    }

    // Check if name already exists for another brand
    if (data.name) {
      const nameExists = await BrandModel.findOne({
        name: data.name,
        _id: { $ne: id },
      }).lean();
      if (nameExists) throw createError.Conflict('Brand name already exists');
    }

    const brand = await BrandModel.findByIdAndUpdate(id, data, {
      new: true,
    }).lean();
    if (!brand) throw createError.NotFound('Brand not found');

    await deleteCache(
      generateCacheKey({ resource: `${BRAND_RESOURCE}:${id}` }),
    );
    await deleteCache(generateCacheKey({ resource: BRAND_RESOURCE }));
    return brand;
  }

  static async changeStatus(id: string, is_active: boolean) {
    return this.update(id, { is_active });
  }

  static async remove(id: string) {
    if (!isValidMongoId(id)) throw createError.BadRequest('Invalid brand id');
    const brand = await BrandModel.findByIdAndDelete(id).select('_id').lean();
    if (!brand) throw createError.NotFound('Brand not found');
    await deleteCache(
      generateCacheKey({ resource: `${BRAND_RESOURCE}:${id}` }),
    );
    await deleteCache(generateCacheKey({ resource: BRAND_RESOURCE }));
    return { _id: brand._id };
  }
}
