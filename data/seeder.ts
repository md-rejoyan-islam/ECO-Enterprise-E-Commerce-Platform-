/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Typed JSON shapes used for persisted dataset
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

interface CampaignJsonAppliesTo {
  all_products: boolean;
  productsIds: string[];
  categoryIds: string[];
  brandIds: string[];
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
  applies_to: CampaignJsonAppliesTo;
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

interface CartItemJson {
  product: HexId;
  quantity: number;
}
interface CartJson {
  _id: HexId;
  user: HexId;
  items: CartItemJson[];
}

interface WishlistItemJson {
  product: HexId;
  timestamp: string | Date;
}
interface WishlistJson {
  _id: HexId;
  user: HexId;
  items: WishlistItemJson[];
}

interface OrderItemJson {
  product_id: string;
  quantity: number;
  price: number;
}
interface OrderJson {
  _id: HexId;
  id: number;
  user_id: string;
  coupon?: string;
  order_items: OrderItemJson[];
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

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // directory may already exist
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureDir(dataDir);
  await fs.writeFile(
    path.join(dataDir, file),
    JSON.stringify(data, null, 2),
    'utf-8',
  );
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(dataDir, file), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toHexId(id: mongoose.Types.ObjectId): string {
  return id.toHexString();
}

export class DatabaseSeeder {
  private static result = {
    users: [] as mongoose.Types.ObjectId[],
    categories: [] as mongoose.Types.ObjectId[],
    brands: [] as mongoose.Types.ObjectId[],
    stores: [] as mongoose.Types.ObjectId[],
    banners: [] as mongoose.Types.ObjectId[],
    campaigns: [] as mongoose.Types.ObjectId[],
    offers: [] as mongoose.Types.ObjectId[],
    coupons: [] as mongoose.Types.ObjectId[],
    products: [] as mongoose.Types.ObjectId[],
    carts: [] as mongoose.Types.ObjectId[],
    wishlists: [] as mongoose.Types.ObjectId[],
    orders: [] as mongoose.Types.ObjectId[],
  };

  static async clearDatabase(): Promise<void> {
    console.log('🗑️  Clearing database...');
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
    console.log('✅ Database cleared');
  }

  // USERS
  static async seedUsers(count = 25): Promise<void> {
    console.log('👥 Seeding users...');
    const existing = await readJson<UserJson[]>('users.json');
    let docs: UserJson[];
    if (existing) {
      docs = existing;
    } else {
      const baseFirstNames = [
        'Ada',
        'Grace',
        'Linus',
        'Alan',
        'Dennis',
        'James',
        'Barbara',
        'Ken',
        'Margaret',
        'Tim',
        'Guido',
        'Bjarne',
        'Anders',
        'Donald',
        'Edsger',
        'John',
        'Leslie',
        'Niklaus',
        'Yukihiro',
        'Brendan',
        'Bill',
        'Steve',
        'Lin',
        'Hedy',
        'Radia',
      ];
      const baseLastNames = [
        'Lovelace',
        'Hopper',
        'Torvalds',
        'Turing',
        'Ritchie',
        'Gosling',
        'Liskov',
        'Thompson',
        'Hamilton',
        'Berners-Lee',
        'Van Rossum',
        'Stroustrup',
        'Hejlsberg',
        'Knuth',
        'Dijkstra',
        'McCarthy',
        'Lamport',
        'Wirth',
        'Matsumoto',
        'Eich',
        'Gates',
        'Jobs',
        'Zhou',
        'Lamarr',
        'Perlman',
      ];
      docs = await Promise.all(
        Array.from({ length: count }).map(async (_, i) => {
          const first_name = baseFirstNames[i % baseFirstNames.length];
          const last_name = baseLastNames[i % baseLastNames.length];
          const email =
            `${slugify(first_name)}.${slugify(last_name)}.${i + 1}@example.com`.toLowerCase();
          const _id = new mongoose.Types.ObjectId().toHexString();
          return {
            _id,
            first_name,
            last_name,
            email,
            password: await hashPassword('User@123'),
            phone: `+8801700000${(100 + i).toString()}`,
            role: i < 2 ? (i === 0 ? 'superadmin' : 'admin') : 'user',
            is_active: true,
          };
        }),
      );
      await writeJson('users.json', docs);
    }
    const created = await UserModel.insertMany(
      docs.map((u) => ({ ...u, _id: new mongoose.Types.ObjectId(u._id) })),
      {
        ordered: true,
      },
    );
    this.result.users = created.map((u) => u._id);
    console.log(`✅ Created ${created.length} users`);
  }

  // CATEGORIES
  static async seedCategories(count = 20): Promise<void> {
    console.log('📁 Seeding categories...');
    const existing = await readJson<CategoryJson[]>('categories.json');
    let docs: CategoryJson[];
    if (existing) {
      docs = existing.map((c) => ({
        ...c,
        _id: new mongoose.Types.ObjectId(c._id),
      }));
    } else {
      const names = [
        'Electronics',
        'Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Books',
        'Toys & Games',
        'Beauty',
        'Automotive',
        'Health',
        'Grocery',
        'Office',
        'Pets',
        'Baby',
        'Jewelry',
        'Music',
        'Movies',
        'Tools',
        'Garden',
        'Appliances',
        'Gaming',
      ];
      docs = names.slice(0, count).map((name, idx) => ({
        _id: new mongoose.Types.ObjectId().toHexString(),
        name,
        description: `Shop authentic ${name.toLowerCase()} from trusted brands with warranty and easy returns`,
        image: `https://picsum.photos/seed/category-${encodeURIComponent(slugify(name))}/300/300`,
        slug: slugify(name),
        featured: idx < 5,
        order: idx + 1,
        is_active: true,
      }));
      await writeJson(
        'categories.json',
        docs.map((d) => ({
          ...d,
          _id: toHexId(d._id as unknown as mongoose.Types.ObjectId) as HexId,
        })),
      );
    }
    const created = await CategoryModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.categories = created.map((c) => c._id);
    console.log(`✅ Created ${created.length} categories`);
  }

  // BRANDS
  static async seedBrands(count = 20): Promise<void> {
    console.log('🏷️  Seeding brands...');
    const existing = await readJson<BrandJson[]>('brands.json');
    let docs: BrandJson[];
    if (existing) {
      docs = existing.map((b) => ({
        ...b,
        _id: new mongoose.Types.ObjectId(b._id),
      }));
    } else {
      const names = [
        'Samsung',
        'Apple',
        'Sony',
        'Dell',
        'HP',
        'Lenovo',
        'Asus',
        'Acer',
        'Nike',
        'Adidas',
        'Puma',
        'Reebok',
        'LG',
        'Panasonic',
        'Philips',
        'Xiaomi',
        'OnePlus',
        'Huawei',
        'Canon',
        'Nikon',
      ];
      docs = names.slice(0, count).map((name, idx) => ({
        _id: new mongoose.Types.ObjectId().toHexString(),
        name,
        description: `${name} is a globally recognized brand known for quality and innovation.`,
        logo: `https://placehold.co/200x100/png?text=${encodeURIComponent(name)}`,
        website: `https://www.${slugify(name)}.com`,
        slug: slugify(name),
        featured: idx < 6,
        order: idx + 1,
        is_active: true,
      }));
      await writeJson(
        'brands.json',
        docs.map((d) => ({
          ...d,
          _id: toHexId(d._id as unknown as mongoose.Types.ObjectId) as HexId,
        })),
      );
    }
    const created = await BrandModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.brands = created.map(
      (b) => b._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} brands`);
  }

  // STORES
  static async seedStores(count = 20): Promise<void> {
    console.log('🏪 Seeding stores...');
    const existing = await readJson<StoreJson[]>('stores.json');
    let docs: StoreJson[];
    if (existing) {
      docs = existing.map((s) => ({
        ...s,
        _id: new mongoose.Types.ObjectId(s._id),
      }));
    } else {
      const cities = [
        'Dhaka',
        'Chittagong',
        'Sylhet',
        'Khulna',
        'Rajshahi',
        'Barishal',
        'Rangpur',
        'Mymensingh',
      ];
      const divisions = [
        'Dhaka',
        'Chittagong',
        'Sylhet',
        'Khulna',
        'Rajshahi',
        'Barishal',
        'Rangpur',
        'Mymensingh',
      ];
      docs = Array.from({ length: count }).map((_, i) => {
        const city = cities[i % cities.length];
        const division = divisions[i % divisions.length];
        const name = `Outlet ${city} ${i + 1}`;
        return {
          _id: new mongoose.Types.ObjectId().toHexString(),
          image: `https://picsum.photos/seed/store-${i + 1}/400/300`,
          name,
          description: `${name} offers genuine products, in-store pickup, and after-sales service.`,
          city,
          country: 'Bangladesh',
          division,
          zip_code: `1${(200 + i).toString()}`,
          map_location: `https://maps.example.com/?q=${encodeURIComponent(city)}`,
          phone: `+8801700000${(200 + i).toString()}`,
          email: `store${i + 1}@example.com`,
          working_hours: 'Mon-Sun 09:00-21:00',
          is_active: true,
        };
      });
      await writeJson(
        'stores.json',
        docs.map((d) => ({ ...d, _id: toHexId(d._id) })),
      );
    }
    const created = await StoreModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.stores = created.map(
      (s) => s._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} stores`);
  }

  // BANNERS
  static async seedBanners(count = 20): Promise<void> {
    console.log('🖼️  Seeding banners...');
    const existing = await readJson<BannerJson[]>('banners.json');
    let docs: BannerJson[];
    if (existing) {
      docs = existing.map((b) => ({
        ...b,
        _id: new mongoose.Types.ObjectId(b._id),
      }));
    } else {
      const titles = [
        'End of Season Sale',
        'Back to School Deals',
        'Weekend Price Drop',
        'New Arrivals This Week',
        'Clearance Blowout',
        'Festive Mega Sale',
        'Midnight Flash Sale',
        'Summer Essentials',
      ];
      const types = ['popup', 'slider', 'static'] as const;
      docs = Array.from({ length: count }).map((_, i) => ({
        _id: new mongoose.Types.ObjectId().toHexString(),
        title: titles[i % titles.length],
        description:
          'Limited-time offers on top categories. Shop now before stock runs out.',
        image: `https://picsum.photos/seed/banner-${i + 1}/1200/400`,
        link: `/promo/${i + 1}`,
        type: types[i % types.length],
        is_active: true,
      }));
      await writeJson(
        'banners.json',
        docs.map((d) => ({ ...d, _id: toHexId(d._id) })),
      );
    }
    const created = await BannerModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.banners = created.map(
      (b) => b._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} banners`);
  }

  // CAMPAIGNS
  static async seedCampaigns(count = 20): Promise<void> {
    console.log('🎯 Seeding campaigns...');
    const existing = await readJson<CampaignJson[]>('campaigns.json');
    let docs: CampaignJson[];
    if (existing) {
      docs = existing.map((c) => ({
        ...c,
        _id: new mongoose.Types.ObjectId(c._id),
      }));
    } else {
      const names = [
        'Back to School',
        'Holiday Mega Sale',
        'Winter Warmers',
        'Summer Super Saver',
        'Festival of Deals',
        'New Year Countdown',
        'Spring Refresh',
        'Black Friday Preview',
      ];
      docs = Array.from({ length: count }).map((_, i) => {
        const name = names[i % names.length];
        return {
          _id: new mongoose.Types.ObjectId().toHexString(),
          name,
          description: `${name} — curated discounts across best-selling categories and brands.`,
          image: `https://picsum.photos/seed/campaign-${i + 1}/800/400`,
          start_date: new Date(),
          end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * (30 + i)),
          discount_type: i % 2 === 0 ? 'percentage' : 'fixed_amount',
          discount_value: i % 2 === 0 ? randomInt(5, 40) : randomInt(100, 1000),
          applies_to: {
            all_products: false,
            productsIds: [],
            categoryIds: [],
            brandIds: [],
          },
          minimum_purchase_amount: randomInt(0, 5000),
          free_shipping: i % 3 === 0,
          usage_limit: randomInt(0, 1000),
          is_active: true,
        };
      });
      await writeJson(
        'campaigns.json',
        docs.map((d) => ({ ...d, _id: toHexId(d._id) })),
      );
    }
    const created = await CampaignModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.campaigns = created.map(
      (c) => c._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} campaigns`);
  }

  // OFFERS
  static async seedOffers(count = 20): Promise<void> {
    console.log('💰 Seeding offers...');
    const existing = await readJson<OfferJson[]>('offers.json');
    let docs: OfferJson[];
    if (existing) {
      docs = existing.map((o) => ({
        ...o,
        _id: new mongoose.Types.ObjectId(o._id),
      }));
    } else {
      const names = [
        'Weekend Flash Sale',
        'Buy More Save More',
        'Limited Time Price Drop',
        'Free Shipping Special',
        'Doorbuster Deals',
        'Bundle & Save',
      ];
      docs = Array.from({ length: count }).map((_, i) => {
        const name = names[i % names.length];
        return {
          _id: new mongoose.Types.ObjectId().toHexString(),
          name,
          description: `${name} across select items. No coupon required.`,
          image: `https://picsum.photos/seed/offer-${i + 1}/800/400`,
          start_date: new Date(),
          end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * (15 + i)),
          discount_type: i % 2 === 0 ? 'percentage' : 'fixed_amount',
          discount_value: i % 2 === 0 ? randomInt(5, 40) : randomInt(100, 1000),
          applicable_products: [],
          free_shipping: i % 3 === 0,
          is_active: true,
        };
      });
      await writeJson(
        'offers.json',
        docs.map((d) => ({ ...d, _id: toHexId(d._id) })),
      );
    }
    const created = await OfferModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.offers = created.map(
      (o) => o._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} offers`);
  }

  // COUPONS
  static async seedCoupons(count = 20): Promise<void> {
    console.log('🎟️  Seeding coupons...');
    const existing = await readJson<CouponJson[]>('coupons.json');
    let docs: CouponJson[];
    if (existing) {
      docs = existing.map((c) => ({
        ...c,
        _id: new mongoose.Types.ObjectId(c._id as string),
      }));
    } else {
      docs = Array.from({ length: count }).map((_, i) => {
        const code = `CODE${(1000 + i).toString()}`;
        return {
          _id: new mongoose.Types.ObjectId().toHexString(),
          name: `Coupon ${i + 1}`,
          description: `Coupon ${i + 1} description`,
          code,
          discount_type: i % 2 === 0 ? 'percentage' : 'fixed_amount',
          discount_value: i % 2 === 0 ? randomInt(5, 30) : randomInt(100, 1000),
          usage_limit_per_user: randomInt(1, 5),
          total_usage_limit: randomInt(0, 1000),
          expiration_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * (60 + i),
          ),
          minimum_purchase_amount: randomInt(0, 3000),
          is_active: true,
        };
      });
      await writeJson(
        'coupons.json',
        docs.map((d) => ({ ...d, _id: toHexId(d._id) })),
      );
    }
    const created = await CouponModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.coupons = created.map(
      (c) => c._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} coupons`);
  }

  // PRODUCTS
  static async seedProducts(count = 20): Promise<void> {
    console.log('📦 Seeding products...');
    const existing = await readJson<ProductJson[]>('products.json');
    let docs: ProductJson[];
    if (existing) {
      docs = existing.map((p) => ({
        ...p,
        _id: new mongoose.Types.ObjectId(p._id),
        category: new mongoose.Types.ObjectId(p.category),
        brand: new mongoose.Types.ObjectId(p.brand),
        campaigns:
          ((p as any).campaigns as string[] | undefined)?.map(
            (id) => new mongoose.Types.ObjectId(id),
          ) ?? [],
        offers:
          ((p as any).offers as string[] | undefined)?.map(
            (id) => new mongoose.Types.ObjectId(id),
          ) ?? [],
      }));
    } else {
      const productPool = [
        { title: 'Galaxy S24 Ultra', kind: 'Phone' },
        { title: 'iPhone 15 Pro', kind: 'Phone' },
        { title: 'Xiaomi 14 Pro', kind: 'Phone' },
        { title: 'Dell XPS 15', kind: 'Laptop' },
        { title: 'HP Spectre x360', kind: 'Laptop' },
        { title: 'Lenovo ThinkPad X1', kind: 'Laptop' },
        { title: 'Sony WH-1000XM5', kind: 'Headphones' },
        { title: 'Apple AirPods Pro 2', kind: 'Headphones' },
        { title: 'Bose QuietComfort', kind: 'Headphones' },
        { title: 'Nike Air Max 270', kind: 'Shoes' },
        { title: 'Adidas Ultraboost 22', kind: 'Shoes' },
        { title: 'Puma RS-X', kind: 'Shoes' },
        { title: 'Canon EOS R6', kind: 'Camera' },
        { title: 'Nikon Z6 II', kind: 'Camera' },
        { title: 'Philips Hue Starter Kit', kind: 'Smart Home' },
        { title: 'LG 27" 4K Monitor', kind: 'Monitor' },
        { title: 'Asus ROG Strix Keyboard', kind: 'Keyboard' },
        { title: 'OnePlus Watch 2', kind: 'Watch' },
        { title: 'Huawei FreeBuds', kind: 'Headphones' },
        { title: 'Acer Predator Helios', kind: 'Laptop' },
      ];
      docs = Array.from({ length: count }).map((_, i) => {
        const brandId = randomChoice(this.result.brands);
        const categoryId = randomChoice(this.result.categories);
        const base = productPool[i % productPool.length];
        const title = base.title;
        const slug = slugify(`${title}-${i + 1}`);
        const basePrice = randomInt(500, 200000);
        const sale =
          Math.random() < 0.5
            ? basePrice - randomInt(50, Math.floor(basePrice * 0.3))
            : undefined;
        const variants = Array.from({ length: randomInt(1, 3) }).map(
          (__, vi) => ({
            sku: `SKU-${i + 1}-${vi + 1}-${Date.now().toString(36)}`,
            attributes: new Map<string, string>([
              ['color', ['Black', 'White', 'Blue', 'Red'][vi % 4]],
              ['size', ['S', 'M', 'L', 'XL'][vi % 4]],
            ]),
            price: basePrice,
            sale_price: sale,
            images: [
              `https://picsum.photos/seed/${encodeURIComponent(slug)}-${vi + 1}/800/800`,
            ],
            inventory: {
              quantity_available: randomInt(10, 200),
              quantity_reserved: randomInt(0, 10),
              quantity_damaged: randomInt(0, 3),
              last_updated: new Date(),
            },
          }),
        );
        return {
          _id: new mongoose.Types.ObjectId().toHexString(),
          name: title,
          description: `${title} — authentic ${base.kind.toLowerCase()} with warranty, fast delivery, and easy returns`,
          category: toHexId(categoryId),
          brand: toHexId(brandId),
          slug,
          featured: i % 5 === 0,
          is_active: true,
          campaigns: [toHexId(randomChoice(this.result.campaigns))],
          offers: [toHexId(randomChoice(this.result.offers))],
          reviews: [],
          faq: [],
          variants,
        };
      });
      await writeJson(
        'products.json',
        docs.map((d) => ({
          ...d,
          _id: toHexId(d._id),
          category: toHexId(d.category),
          brand: toHexId(d.brand),
          campaigns: ((d as any).campaigns as mongoose.Types.ObjectId[]).map(
            (x) => toHexId(x),
          ),
          offers: ((d as any).offers as mongoose.Types.ObjectId[]).map((x) =>
            toHexId(x),
          ),
        })),
      );
    }
    const created = await ProductModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.products = created.map((p) => p._id);
    console.log(`✅ Created ${created.length} products`);

    await this.linkProductsToCampaignsAndOffers();
  }

  static async linkProductsToCampaignsAndOffers(): Promise<void> {
    console.log('🔗 Linking products to campaigns and offers...');
    const productIds = this.result.products.map((p) => p.toString());
    await Promise.all(
      this.result.campaigns.slice(0, 3).map((cid) =>
        CampaignModel.findByIdAndUpdate(cid, {
          $set: {
            'applies_to.productsIds': productIds.slice(
              0,
              randomInt(10, productIds.length),
            ),
          },
        }),
      ),
    );
    await Promise.all(
      this.result.offers.slice(0, 3).map((oid) =>
        OfferModel.findByIdAndUpdate(oid, {
          $set: {
            applicable_products: productIds.slice(
              0,
              randomInt(8, productIds.length),
            ),
          },
        }),
      ),
    );
    console.log('✅ Products linked');
  }

  // CARTS
  static async seedCarts(count = 20): Promise<void> {
    console.log('🛒 Seeding carts...');
    const existing = await readJson<CartJson[]>('carts.json');
    let docs: CartJson[];
    if (existing) {
      docs = existing.map((c) => ({
        ...c,
        _id: new mongoose.Types.ObjectId(c._id as string),
        user: new mongoose.Types.ObjectId(c.user as string),
        items: (c.items as CartItemJson[]).map((it) => ({
          ...it,
          product: new mongoose.Types.ObjectId(it.product),
        })),
      }));
    } else {
      docs = this.result.users.slice(0, count).map((uid) => ({
        _id: new mongoose.Types.ObjectId().toHexString(),
        user: toHexId(uid),
        items: Array.from({ length: randomInt(1, 5) }).map(() => ({
          product: toHexId(randomChoice(this.result.products)),
          quantity: randomInt(1, 3),
        })),
      }));
      await writeJson(
        'carts.json',
        docs.map((d) => ({
          ...d,
          _id: toHexId(d._id),
          user: toHexId(d.user),
          items: (d.items as any[]).map(
            (it: { product: mongoose.Types.ObjectId; quantity: number }) => ({
              ...it,
              product: toHexId(it.product),
            }),
          ),
        })),
      );
    }
    const created = await CartModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.carts = created.map(
      (c) => c._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} carts`);
  }

  // WISHLISTS
  static async seedWishlists(count = 20): Promise<void> {
    console.log('💖 Seeding wishlists...');
    const existing = await readJson<WishlistJson[]>('wishlists.json');
    let docs: WishlistJson[];
    if (existing) {
      docs = existing.map((w) => ({
        ...w,
        _id: new mongoose.Types.ObjectId(w._id as string),
        user: new mongoose.Types.ObjectId(w.user as string),
        items: (w.items as WishlistItemJson[]).map((it) => ({
          ...it,
          product: new mongoose.Types.ObjectId(it.product),
        })),
      }));
    } else {
      docs = this.result.users.slice(0, count).map((uid) => ({
        _id: new mongoose.Types.ObjectId().toHexString(),
        user: toHexId(uid),
        items: Array.from({ length: randomInt(1, 6) }).map(() => ({
          product: toHexId(randomChoice(this.result.products)),
          timestamp: new Date(),
        })),
      }));
      await writeJson(
        'wishlists.json',
        docs.map((d) => ({
          ...d,
          _id: toHexId(d._id),
          user: toHexId(d.user),
          items: (d.items as any[]).map(
            (it: { product: mongoose.Types.ObjectId; timestamp: Date }) => ({
              ...it,
              product: toHexId(it.product),
            }),
          ),
        })),
      );
    }
    const created = await WishlistModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.wishlists = created.map(
      (w) => w._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} wishlists`);
  }

  // ORDERS
  static async seedOrders(count = 20): Promise<void> {
    console.log('📦🧾 Seeding orders...');
    const existing = await readJson<OrderJson[]>('orders.json');
    let docs: OrderJson[];
    if (existing) {
      docs = existing.map((o) => ({
        ...o,
        _id: new mongoose.Types.ObjectId(o._id as string),
        user_id: o.user_id as string,
        order_items: (o.order_items as OrderItemJson[]).map((it) => ({
          ...it,
        })),
      }));
    } else {
      const paymentMethods = [
        'bkash',
        'rocket',
        'nagad',
        'credit_card',
        'debit_card',
        'cash_on_delivery',
      ];
      const statuses = [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ];
      docs = Array.from({ length: count }).map((_, i) => {
        const user = randomChoice(this.result.users);
        const itemsCount = randomInt(1, 5);
        const items = Array.from({ length: itemsCount }).map(() => {
          const pid = randomChoice(this.result.products);
          const quantity = randomInt(1, 3);
          const price = randomInt(200, 100000);
          return {
            product_id: pid.toString(),
            quantity,
            price,
          };
        });
        const total = items.reduce(
          (sum, it) => sum + it.price * it.quantity,
          0,
        );
        return {
          _id: new mongoose.Types.ObjectId().toHexString(),
          id: i + 1,
          user_id: user.toString(),
          coupon: undefined,
          order_items: items,
          total_amount: total,
          payment_method: randomChoice(paymentMethods),
          order_status: randomChoice(statuses),
          transaction_id: `TXN-${Date.now()}-${i + 1}`,
          shipping_address: {
            street: `${randomInt(1, 999)} Example Street`,
            phone: `+8801700000${(500 + i).toString()}`,
            email: `buyer${i + 1}@example.com`,
            city: 'Dhaka',
            state: 'Dhaka',
            zip_code: `1${(200 + i).toString()}`,
            country: 'Bangladesh',
          },
          is_active: true,
        };
      });
      await writeJson(
        'orders.json',
        docs.map((d) => ({
          ...d,
          _id: toHexId(d._id),
        })),
      );
    }
    const created = await OrderModel.insertMany(docs as any[], {
      ordered: true,
    });
    this.result.orders = created.map(
      (o) => o._id as unknown as mongoose.Types.ObjectId,
    );
    console.log(`✅ Created ${created.length} orders`);
  }

  static async seedAll(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...\n');
      await this.clearDatabase();
      console.log('');

      await this.seedUsers();
      await this.seedCategories();
      await this.seedBrands();
      await this.seedStores();
      await this.seedBanners();
      await this.seedCampaigns();
      await this.seedOffers();
      await this.seedCoupons();
      await this.seedProducts();
      await this.seedCarts();
      await this.seedWishlists();
      await this.seedOrders();

      console.log('\n✅ Database seeding completed successfully!');
      console.log('\n📊 Summary:');
      console.log(`   Users: ${this.result.users.length}`);
      console.log(`   Categories: ${this.result.categories.length}`);
      console.log(`   Brands: ${this.result.brands.length}`);
      console.log(`   Stores: ${this.result.stores.length}`);
      console.log(`   Banners: ${this.result.banners.length}`);
      console.log(`   Campaigns: ${this.result.campaigns.length}`);
      console.log(`   Offers: ${this.result.offers.length}`);
      console.log(`   Coupons: ${this.result.coupons.length}`);
      console.log(`   Products: ${this.result.products.length}`);
      console.log(`   Carts: ${this.result.carts.length}`);
      console.log(`   Wishlists: ${this.result.wishlists.length}`);
      console.log(`   Orders: ${this.result.orders.length}`);
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}
