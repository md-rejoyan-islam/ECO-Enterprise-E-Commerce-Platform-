import { Router } from 'express';
import { authorize } from '../../middlewares/authorized';
import validate from '../../middlewares/validate';
import { isLoggedIn } from '../../middlewares/verify';
import * as ProductController from './product.controller';
import {
  addFAQSchema,
  addReviewSchema,
  addVariantSchema,
  changeStatusSchema,
  createProductSchema,
  getProductByIdSchema,
  getProductsQuerySchema,
  linkCampaignsSchema,
  linkOffersSchema,
  unlinkCampaignSchema,
  unlinkOfferSchema,
  updateFAQSchema,
  updateInventorySchema,
  updateProductSchema,
  updateReviewSchema,
  updateVariantSchema,
} from './product.validation';

const router = Router();

// Public routes - GET products and individual product
router.get(
  '/',
  validate(getProductsQuerySchema),
  ProductController.getProducts,
);
router.get(
  '/:id',
  validate(getProductByIdSchema),
  ProductController.getProductById,
);

// Admin routes - Product CRUD
router.post(
  '/',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(createProductSchema),
  ProductController.createProduct,
);

router.put(
  '/:id',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(updateProductSchema),
  ProductController.updateProduct,
);

router.patch(
  '/:id/status',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(changeStatusSchema),
  ProductController.changeProductStatus,
);

router.delete(
  '/:id',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  ProductController.deleteProduct,
);

// Admin routes - Variant management
router.post(
  '/:id/variants',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(addVariantSchema),
  ProductController.addVariant,
);

router.put(
  '/:id/variants/:variantId',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(updateVariantSchema),
  ProductController.updateVariant,
);

router.delete(
  '/:id/variants/:variantId',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  ProductController.deleteVariant,
);

// Authenticated user routes - Review management
router.post(
  '/:id/reviews',
  isLoggedIn,
  validate(addReviewSchema),
  ProductController.addReview,
);

router.put(
  '/:id/reviews/:reviewId',
  isLoggedIn,
  validate(updateReviewSchema),
  ProductController.updateReview,
);

router.delete(
  '/:id/reviews/:reviewId',
  isLoggedIn,
  ProductController.deleteReview,
);

// Admin routes - FAQ management
router.post(
  '/:id/faq',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(addFAQSchema),
  ProductController.addFAQ,
);

router.put(
  '/:id/faq/:faqId',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(updateFAQSchema),
  ProductController.updateFAQ,
);

router.delete(
  '/:id/faq/:faqId',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  ProductController.deleteFAQ,
);

// Admin routes - Inventory management
router.patch(
  '/:id/inventory',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(updateInventorySchema),
  ProductController.updateInventory,
);

// Admin routes - Campaign management
router.post(
  '/:id/campaigns',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(linkCampaignsSchema),
  ProductController.linkCampaigns,
);

router.delete(
  '/:id/campaigns/:campaignId',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(unlinkCampaignSchema),
  ProductController.unlinkCampaign,
);

// Admin routes - Offer management
router.post(
  '/:id/offers',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(linkOffersSchema),
  ProductController.linkOffers,
);

router.delete(
  '/:id/offers/:offerId',
  isLoggedIn,
  authorize(['admin', 'superadmin']),
  validate(unlinkOfferSchema),
  ProductController.unlinkOffer,
);

export default router;
