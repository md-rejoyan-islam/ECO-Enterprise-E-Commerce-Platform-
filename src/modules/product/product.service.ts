import {
  deleteCache,
  generateCacheKey,
  getCache,
  setCache,
} from '../../utils/cache';
import { isValidMongoId } from '../../utils/is-valid-mongo-id';
import ProductModel from './product.model';
import { IFAQ, IInventory, IProduct, IReview, IVariant } from './product.type';
import { GetProductsQuery } from './product.validation';

type FilterCondition = Record<string, unknown>;
type SortCondition = Record<string, 1 | -1>;
type UpdateFields = Record<string, unknown>;

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export class ProductService {
  // Get all products with filters, search, sort, and pagination
  static async list(query: GetProductsQuery) {
    const {
      search,
      category,
      brand,
      fields,
      featured,
      is_active,
      includeCampaigns,
      includeOffers,
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    // Generate cache key based on query parameters
    const cacheKey = generateCacheKey({ resource: 'products:list', query });
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Build filter object
    const filter: FilterCondition = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (typeof featured === 'boolean') filter.featured = featured;
    if (typeof is_active === 'boolean') filter.is_active = is_active;

    // Build sort object
    const sort: SortCondition = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

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

    // Execute queries
    const productQuery = ProductModel.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Populate campaigns if requested
    if (includeCampaigns === 'true') {
      productQuery.populate(
        'campaigns',
        'name description discount_type discount_value start_date end_date is_active',
      );
    }

    // Populate offers if requested
    if (includeOffers === 'true') {
      productQuery.populate(
        'offers',
        'name description discount_type discount_value start_date end_date is_active',
      );
    }

    if (selectFields) {
      productQuery.select(selectFields);
    }

    const [products, total] = await Promise.all([
      productQuery.lean(),
      ProductModel.countDocuments(filter),
    ]);

    const result = {
      data: products,
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

  // Get product by ID
  static async getById(
    id: string,
    fields?: string,
    includeCampaigns?: string,
    includeOffers?: string,
  ) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const cacheKey = generateCacheKey({
      resource: 'product',
      query: { id, fields, includeCampaigns, includeOffers },
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

    const productQuery = ProductModel.findById(id)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .populate('reviews.user', 'first_name last_name');

    // Populate campaigns if requested
    if (includeCampaigns === 'true') {
      productQuery.populate(
        'campaigns',
        'name description discount_type discount_value start_date end_date is_active',
      );
    }

    // Populate offers if requested
    if (includeOffers === 'true') {
      productQuery.populate(
        'offers',
        'name description discount_type discount_value start_date end_date is_active',
      );
    }

    if (selectFields) {
      productQuery.select(selectFields);
    }

    const product = await productQuery.lean();

    if (!product) {
      throw new Error('Product not found');
    }

    await setCache(cacheKey, product);
    return product;
  }

  // Create new product
  static async create(data: Partial<IProduct>) {
    // Auto-generate slug if not provided
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }

    // Check if slug already exists
    if (data.slug) {
      const existingProduct = await ProductModel.findOne({ slug: data.slug });
      if (existingProduct) {
        throw new Error('Product with this slug already exists');
      }
    }

    // Check if product name already exists
    if (data.name) {
      const existingProduct = await ProductModel.findOne({ name: data.name });
      if (existingProduct) {
        throw new Error('Product with this name already exists');
      }
    }

    const product = await ProductModel.create(data);

    // Clear related caches
    await deleteCache('products:list:*');

    return product;
  }

  // Update product
  static async update(id: string, data: Partial<IProduct>) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Auto-generate slug if name is being updated
    if (data.name && data.name !== product.name) {
      data.slug = generateSlug(data.name);
    }

    // Check if new slug already exists (exclude current product)
    if (data.slug && data.slug !== product.slug) {
      const existingProduct = await ProductModel.findOne({
        slug: data.slug,
        _id: { $ne: id },
      });
      if (existingProduct) {
        throw new Error('Product with this slug already exists');
      }
    }

    // Check if new name already exists (exclude current product)
    if (data.name && data.name !== product.name) {
      const existingProduct = await ProductModel.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existingProduct) {
        throw new Error('Product with this name already exists');
      }
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('category brand');

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return updatedProduct;
  }

  // Change product status
  static async changeStatus(id: string, is_active: boolean) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { is_active },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Delete product
  static async remove(id: string) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductModel.findByIdAndDelete(id);

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Add variant to product
  static async addVariant(id: string, variantData: Omit<IVariant, '_id'>) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    // Check if SKU already exists
    const existingProduct = await ProductModel.findOne({
      'variants.sku': variantData.sku,
    });
    if (existingProduct) {
      throw new Error('Variant with this SKU already exists');
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $push: { variants: variantData } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Update variant
  static async updateVariant(
    id: string,
    variantId: string,
    variantData: Partial<IVariant>,
  ) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    // Check if new SKU already exists (exclude current variant)
    if (variantData.sku) {
      const existingProduct = await ProductModel.findOne({
        'variants.sku': variantData.sku,
        $or: [
          { _id: { $ne: id } },
          { _id: id, 'variants._id': { $ne: variantId } },
        ],
      });
      if (existingProduct) {
        throw new Error('Variant with this SKU already exists');
      }
    }

    const updateFields: UpdateFields = {};
    Object.keys(variantData).forEach((key) => {
      updateFields[`variants.$.${key}`] = variantData[key as keyof IVariant];
    });

    const product = await ProductModel.findOneAndUpdate(
      { _id: id, 'variants._id': variantId },
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product or variant not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Delete variant
  static async deleteVariant(id: string, variantId: string) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $pull: { variants: { _id: variantId } } },
      { new: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Add review
  static async addReview(
    id: string,
    reviewData: Omit<IReview, '_id' | 'user' | 'timestamp'>,
    userId: string,
  ) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const completeReviewData = {
      ...reviewData,
      user: userId,
      timestamp: new Date(),
    };

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $push: { reviews: completeReviewData } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Update review
  static async updateReview(
    id: string,
    reviewId: string,
    reviewData: Partial<Pick<IReview, 'rating' | 'comment'>>,
    userId: string,
  ) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    // Check if user owns the review
    const product = await ProductModel.findOne({
      _id: id,
      'reviews._id': reviewId,
      'reviews.user': userId,
    });

    if (!product) {
      throw new Error(
        'Product not found or you are not authorized to update this review',
      );
    }

    const updateFields: UpdateFields = {};
    Object.keys(reviewData).forEach((key) => {
      updateFields[`reviews.$.${key}`] =
        reviewData[key as keyof typeof reviewData];
    });

    const updatedProduct = await ProductModel.findOneAndUpdate(
      { _id: id, 'reviews._id': reviewId },
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return updatedProduct;
  }

  // Delete review
  static async deleteReview(id: string, reviewId: string, userId: string) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    // Check if user owns the review
    const product = await ProductModel.findOne({
      _id: id,
      'reviews._id': reviewId,
      'reviews.user': userId,
    });

    if (!product) {
      throw new Error(
        'Product not found or you are not authorized to delete this review',
      );
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $pull: { reviews: { _id: reviewId } } },
      { new: true },
    );

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return updatedProduct;
  }

  // Add FAQ
  static async addFAQ(id: string, faqData: Omit<IFAQ, '_id' | 'timestamp'>) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const completeFAQData = {
      ...faqData,
      timestamp: new Date(),
    };

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $push: { faq: completeFAQData } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Update FAQ
  static async updateFAQ(
    id: string,
    faqId: string,
    faqData: Partial<Pick<IFAQ, 'question' | 'answer'>>,
  ) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const updateFields: UpdateFields = {};
    Object.keys(faqData).forEach((key) => {
      updateFields[`faq.$.${key}`] = faqData[key as keyof typeof faqData];
    });

    const product = await ProductModel.findOneAndUpdate(
      { _id: id, 'faq._id': faqId },
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product or FAQ not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Delete FAQ
  static async deleteFAQ(id: string, faqId: string) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $pull: { faq: { _id: faqId } } },
      { new: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Update inventory
  static async updateInventory(
    id: string,
    variantId: string,
    inventoryData: Partial<Omit<IInventory, 'last_updated'>>,
  ) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    const updatedInventoryData = { ...inventoryData, last_updated: new Date() };

    const updateFields: UpdateFields = {};
    Object.keys(updatedInventoryData).forEach((key) => {
      updateFields[`variants.$.inventory.${key}`] =
        updatedInventoryData[key as keyof typeof updatedInventoryData];
    });

    const product = await ProductModel.findOneAndUpdate(
      { _id: id, 'variants._id': variantId },
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product or variant not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Link campaigns to product
  static async linkCampaigns(id: string, campaignIds: string[]) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    // Validate all campaign IDs
    for (const campaignId of campaignIds) {
      if (!isValidMongoId(campaignId)) {
        throw new Error(`Invalid campaign ID: ${campaignId}`);
      }
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $addToSet: { campaigns: { $each: campaignIds } } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Unlink campaign from product
  static async unlinkCampaign(id: string, campaignId: string) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    if (!isValidMongoId(campaignId)) {
      throw new Error('Invalid campaign ID');
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $pull: { campaigns: campaignId } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Link offers to product
  static async linkOffers(id: string, offerIds: string[]) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    // Validate all offer IDs
    for (const offerId of offerIds) {
      if (!isValidMongoId(offerId)) {
        throw new Error(`Invalid offer ID: ${offerId}`);
      }
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $addToSet: { offers: { $each: offerIds } } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }

  // Unlink offer from product
  static async unlinkOffer(id: string, offerId: string) {
    if (!isValidMongoId(id)) {
      throw new Error('Invalid product ID');
    }

    if (!isValidMongoId(offerId)) {
      throw new Error('Invalid offer ID');
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $pull: { offers: offerId } },
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // Clear related caches
    await deleteCache('products:list:*');
    await deleteCache(`product:${id}`);

    return product;
  }
}
