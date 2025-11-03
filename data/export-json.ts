/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import { config } from 'dotenv';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import BannerModel from '../src/modules/banner/banner.model';
import BrandModel from '../src/modules/brand/brand.model';
import CampaignModel from '../src/modules/campaign/campaign.model';
import CartModel from '../src/modules/cart/cart.model';
import CategoryModel from '../src/modules/category/category.model';
import CouponModel from '../src/modules/coupon/coupon.model';
import OfferModel from '../src/modules/offer/offer.model';
import OrderModel from '../src/modules/order/order.model';
import ProductModel from '../src/modules/product/product.model';
import StoreModel from '../src/modules/store/store.model';
import UserModel from '../src/modules/user/user.model';
import WishlistModel from '../src/modules/wishlist/wishlist.model';

config();

const dataDir = path.join(__dirname, 'json');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function id(x: unknown): string {
  return (x as mongoose.Types.ObjectId).toString();
}

async function writeJson(file: string, data: unknown) {
  await ensureDir(dataDir);
  await fs.writeFile(
    path.join(dataDir, file),
    JSON.stringify(data, null, 2),
    'utf-8',
  );
}

async function exportAll() {
  const MONGO_URI =
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(MONGO_URI);

  const [
    users,
    categories,
    brands,
    stores,
    banners,
    campaigns,
    offers,
    coupons,
    products,
    carts,
    wishlists,
    orders,
  ] = await Promise.all([
    UserModel.find({}).lean(),
    CategoryModel.find({}).lean(),
    BrandModel.find({}).lean(),
    StoreModel.find({}).lean(),
    BannerModel.find({}).lean(),
    CampaignModel.find({}).lean(),
    OfferModel.find({}).lean(),
    CouponModel.find({}).lean(),
    ProductModel.find({}).lean(),
    CartModel.find({}).lean(),
    WishlistModel.find({}).lean(),
    OrderModel.find({}).lean(),
  ]);

  await writeJson(
    'users.json',
    users.map((u: any) => ({ ...u, _id: id(u._id), password: undefined })),
  );
  await writeJson(
    'categories.json',
    categories.map((c: any) => ({
      ...c,
      _id: id(c._id),
      parent_id: c.parent_id ? id(c.parent_id) : undefined,
    })),
  );
  await writeJson(
    'brands.json',
    brands.map((b: any) => ({ ...b, _id: id(b._id) })),
  );
  await writeJson(
    'stores.json',
    stores.map((s: any) => ({ ...s, _id: id(s._id) })),
  );
  await writeJson(
    'banners.json',
    banners.map((b: any) => ({ ...b, _id: id(b._id) })),
  );
  await writeJson(
    'campaigns.json',
    campaigns.map((c: any) => ({
      ...c,
      _id: id(c._id),
      applies_to: {
        ...c.applies_to,
        productsIds: (c.applies_to?.productsIds || []).map((v: any) =>
          String(v),
        ),
        categoryIds: (c.applies_to?.categoryIds || []).map((v: any) =>
          String(v),
        ),
        brandIds: (c.applies_to?.brandIds || []).map((v: any) => String(v)),
      },
    })),
  );
  await writeJson(
    'offers.json',
    offers.map((o: any) => ({
      ...o,
      _id: id(o._id),
      applicable_products: (o.applicable_products || []).map((v: any) =>
        String(v),
      ),
    })),
  );
  await writeJson(
    'coupons.json',
    coupons.map((c: any) => ({ ...c, _id: id(c._id) })),
  );
  await writeJson(
    'products.json',
    products.map((p: any) => ({
      ...p,
      _id: id(p._id),
      category: id(p.category),
      brand: id(p.brand),
      campaigns: (p.campaigns || []).map((v: any) => id(v)),
      offers: (p.offers || []).map((v: any) => id(v)),
      variants: (p.variants || []).map((v: any) => ({ ...v })),
    })),
  );
  await writeJson(
    'carts.json',
    carts.map((c: any) => ({
      ...c,
      _id: id(c._id),
      user: id(c.user),
      items: (c.items || []).map((it: any) => ({
        ...it,
        product: id(it.product),
      })),
    })),
  );
  await writeJson(
    'wishlists.json',
    wishlists.map((w: any) => ({
      ...w,
      _id: id(w._id),
      user: id(w.user),
      items: (w.items || []).map((it: any) => ({
        ...it,
        product: id(it.product),
      })),
    })),
  );
  await writeJson(
    'orders.json',
    orders.map((o: any) => ({ ...o, _id: id(o._id) })),
  );

  await mongoose.disconnect();
  console.log('✅ Exported data to src/data/json/*.json');
}

exportAll().catch(async (e) => {
  console.error('❌ Export failed', e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
