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
import { hashPassword } from '../src/utils/password';

config();

type HexId = string;

interface UserJson {
  _id: HexId;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'superadmin' | 'admin' | 'user';
  is_active?: boolean;
}
interface CategoryJson {
  _id: HexId;
  name: string;
  description?: string;
  image?: string;
  slug: string;
  featured?: boolean;
  order?: number;
  is_active?: boolean;
  parent_id?: HexId;
}
interface BrandJson {
  _id: HexId;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  slug: string;
  featured?: boolean;
  order?: number;
  is_active?: boolean;
}
interface StoreJson {
  _id: HexId;
  image: string;
  name: string;
  description: string;
  city: string;
  country: string;
  division: string;
  zip_code: string;
  map_location: string;
  phone: string;
  email: string;
  working_hours: string;
  is_active?: boolean;
}
interface BannerJson {
  _id: HexId;
  title: string;
  description: string;
  image: string;
  link: string;
  type: 'popup' | 'slider' | 'static';
  is_active?: boolean;
}
interface CampaignJson {
  _id: HexId;
  name: string;
  description: string;
  image: string;
  start_date: string | Date;
  end_date: string | Date;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  applies_to: {
    all_products: boolean;
    productsIds: string[];
    categoryIds: string[];
    brandIds: string[];
  };
  minimum_purchase_amount?: number;
  free_shipping?: boolean;
  usage_limit?: number;
  is_active?: boolean;
}
interface OfferJson {
  _id: HexId;
  name: string;
  description: string;
  image: string;
  start_date: string | Date;
  end_date: string | Date;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  applicable_products: string[];
  free_shipping?: boolean;
  is_active?: boolean;
}
interface CouponJson {
  _id: HexId;
  name: string;
  description: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  usage_limit_per_user: number;
  total_usage_limit: number;
  expiration_date: string | Date;
  minimum_purchase_amount?: number;
  is_active?: boolean;
}
interface VariantJson {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  sale_price?: number;
  images: string[];
  inventory: {
    quantity_available: number;
    quantity_reserved: number;
    quantity_damaged: number;
    last_updated: string | Date;
  };
}
interface ProductJson {
  _id: HexId;
  name: string;
  description: string;
  category: HexId;
  brand: HexId;
  slug: string;
  featured?: boolean;
  is_active?: boolean;
  campaigns: HexId[];
  offers: HexId[];
  reviews: unknown[];
  faq: unknown[];
  variants: VariantJson[];
}
interface CartJson {
  _id: HexId;
  user: HexId;
  items: { product: HexId; quantity: number }[];
}
interface WishlistJson {
  _id: HexId;
  user: HexId;
  items: { product: HexId; timestamp: string | Date }[];
}
interface OrderJson {
  _id: HexId;
  id: number;
  user_id: string;
  coupon?: string;
  order_items: { product_id: string; quantity: number; price: number }[];
  total_amount: number;
  payment_method:
    | 'bkash'
    | 'rocket'
    | 'nagad'
    | 'credit_card'
    | 'debit_card'
    | 'cash_on_delivery';
  order_status:
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned';
  transaction_id: string;
  shipping_address: {
    street: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  is_active: boolean;
}

const dataDir = path.join(__dirname, 'json');

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(dataDir, file), 'utf-8');
  return JSON.parse(raw) as T;
}

function oid(id: HexId): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

async function seedJson() {
  const MONGO_URI =
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(MONGO_URI);

  // Clear
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    BrandModel.deleteMany({}),
    StoreModel.deleteMany({}),
    BannerModel.deleteMany({}),
    CampaignModel.deleteMany({}),
    OfferModel.deleteMany({}),
    CouponModel.deleteMany({}),
    ProductModel.deleteMany({}),
    CartModel.deleteMany({}),
    WishlistModel.deleteMany({}),
    OrderModel.deleteMany({}),
  ]);

  // Read
  const users = await readJson<UserJson[]>('users.json');
  const categories = await readJson<CategoryJson[]>('categories.json');
  const brands = await readJson<BrandJson[]>('brands.json');
  const stores = await readJson<StoreJson[]>('stores.json');
  const banners = await readJson<BannerJson[]>('banners.json');
  const campaigns = await readJson<CampaignJson[]>('campaigns.json');
  const offers = await readJson<OfferJson[]>('offers.json');
  const coupons = await readJson<CouponJson[]>('coupons.json');
  const products = await readJson<ProductJson[]>('products.json');
  const carts = await readJson<CartJson[]>('carts.json');
  const wishlists = await readJson<WishlistJson[]>('wishlists.json');
  const orders = await readJson<OrderJson[]>('orders.json');

  // Insert
  const usersToInsert = await Promise.all(
    users.map(async (u) => ({
      ...u,
      _id: oid(u._id),
      password: u.password
        ? await hashPassword(u.password)
        : await hashPassword('User@123'),
    })),
  );
  await UserModel.insertMany(usersToInsert);
  await CategoryModel.insertMany(
    categories.map((c) => ({
      ...c,
      _id: oid(c._id),
      parent_id: c.parent_id ? oid(c.parent_id) : undefined,
    })),
  );
  await BrandModel.insertMany(brands.map((b) => ({ ...b, _id: oid(b._id) })));
  await StoreModel.insertMany(stores.map((s) => ({ ...s, _id: oid(s._id) })));
  await BannerModel.insertMany(banners.map((b) => ({ ...b, _id: oid(b._id) })));
  await CampaignModel.insertMany(
    campaigns.map((c) => ({
      ...c,
      _id: oid(c._id),
      start_date: new Date(c.start_date),
      end_date: new Date(c.end_date),
    })),
  );
  await OfferModel.insertMany(
    offers.map((o) => ({
      ...o,
      _id: oid(o._id),
      start_date: new Date(o.start_date),
      end_date: new Date(o.end_date),
    })),
  );
  await CouponModel.insertMany(
    coupons.map((c) => ({
      ...c,
      _id: oid(c._id),
      expiration_date: new Date(c.expiration_date),
    })),
  );
  await ProductModel.insertMany(
    products.map((p) => ({
      ...p,
      _id: oid(p._id),
      category: oid(p.category),
      brand: oid(p.brand),
      campaigns: p.campaigns.map(oid),
      offers: p.offers.map(oid),
      variants: p.variants.map((v) => ({
        ...v,
        attributes: new Map<string, string>(Object.entries(v.attributes)),
        inventory: {
          ...v.inventory,
          last_updated: new Date(v.inventory.last_updated),
        },
      })),
    })),
  );
  await CartModel.insertMany(
    carts.map((c) => ({
      ...c,
      _id: oid(c._id),
      user: oid(c.user),
      items: c.items.map((it) => ({ ...it, product: oid(it.product) })),
    })),
  );
  await WishlistModel.insertMany(
    wishlists.map((w) => ({
      ...w,
      _id: oid(w._id),
      user: oid(w.user),
      items: w.items.map((it) => ({ ...it, product: oid(it.product) })),
    })),
  );
  await OrderModel.insertMany(orders.map((o) => ({ ...o, _id: oid(o._id) })));

  console.log('✅ Seeded from JSON files');
  await mongoose.disconnect();
}

seedJson().catch(async (e) => {
  console.error('❌ JSON seeding failed', e);
  try {
    await mongoose.disconnect();
  } catch {
    console.error('❌ Failed to disconnect from database');
    process.exit(1);
  }
  process.exit(1);
});
