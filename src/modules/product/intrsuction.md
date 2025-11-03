# Product Module

## Fields

### Main Product Fields

| Field Name  | Type     | Description                         |
| ----------- | -------- | ----------------------------------- |
| name        | string   | Product name                        |
| description | string   | Product description                 |
| category    | string   | Category ID (reference)             |
| brand       | string   | Brand ID (reference)                |
| slug        | string   | Product slug (unique, URL-friendly) |
| featured    | boolean  | Is product featured                 |
| is_active   | boolean  | Product active status               |
| campaigns   | array    | Array of campaign IDs (reference)   |
| offers      | array    | Array of offer IDs (reference)      |
| created_at  | datetime | Product creation timestamp          |
| updated_at  | datetime | Last update timestamp               |
| reviews     | array    | Array of review objects             |
| faq         | array    | Array of FAQ objects                |
| variants    | array    | Array of product variant objects    |

### Review Object Structure

| Field Name | Type     | Description         |
| ---------- | -------- | ------------------- |
| rating     | number   | Rating value (1-5)  |
| comment    | string   | Review comment      |
| user       | string   | User ID (reference) |
| timestamp  | datetime | Review timestamp    |

### FAQ Object Structure

| Field Name | Type     | Description   |
| ---------- | -------- | ------------- |
| question   | string   | FAQ question  |
| answer     | string   | FAQ answer    |
| timestamp  | datetime | FAQ timestamp |

### Variant Object Structure

| Field Name | Type   | Description                      |
| ---------- | ------ | -------------------------------- |
| sku        | string | Stock Keeping Unit (unique)      |
| attributes | Map    | Variant attributes (color, size) |
| price      | number | Regular price                    |
| sale_price | number | Sale/discounted price            |
| images     | array  | Array of image URLs              |
| inventory  | object | Inventory details object         |

### Inventory Object Structure

| Field Name         | Type     | Description                |
| ------------------ | -------- | -------------------------- |
| quantity_available | number   | Available stock quantity   |
| quantity_reserved  | number   | Reserved stock quantity    |
| quantity_damaged   | number   | Damaged stock quantity     |
| last_updated       | datetime | Last inventory update time |

## Routes

| Method | Endpoint                                                           | Description                                                         | Access        | Cache            |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------- | ---------------- |
| GET    | /products?search&category&brand&fields&sortBy&sortOrder&page&limit | List all products with optional search, filter, sorting, pagination | Public        | Redis cache      |
| POST   | /products                                                          | Create a new product                                                | Admin only    | Invalidate cache |
| GET    | /products/{id}?fields&includeCampaigns&includeOffers               | Retrieve a specific product with optional campaign/offer details    | Public        | Redis cache      |
| PUT    | /products/{id}                                                     | Update a specific product                                           | Admin only    | Invalidate cache |
| PATCH  | /products/{id}/status                                              | Change a product's active status                                    | Admin only    | Invalidate cache |
| DELETE | /products/{id}                                                     | Delete a specific product                                           | Admin only    | Invalidate cache |
| POST   | /products/{id}/variants                                            | Add a new variant to a product                                      | Admin only    | Invalidate cache |
| PUT    | /products/{id}/variants/{variantId}                                | Update a specific variant                                           | Admin only    | Invalidate cache |
| DELETE | /products/{id}/variants/{variantId}                                | Delete a specific variant                                           | Admin only    | Invalidate cache |
| POST   | /products/{id}/reviews                                             | Add a review to a product                                           | Authenticated | Invalidate cache |
| PUT    | /products/{id}/reviews/{reviewId}                                  | Update a review                                                     | Authenticated | Invalidate cache |
| DELETE | /products/{id}/reviews/{reviewId}                                  | Delete a review                                                     | Authenticated | Invalidate cache |
| POST   | /products/{id}/faq                                                 | Add a FAQ to a product                                              | Admin only    | Invalidate cache |
| PUT    | /products/{id}/faq/{faqId}                                         | Update a FAQ                                                        | Admin only    | Invalidate cache |
| DELETE | /products/{id}/faq/{faqId}                                         | Delete a FAQ                                                        | Admin only    | Invalidate cache |
| PATCH  | /products/{id}/inventory                                           | Update product inventory                                            | Admin only    | Invalidate cache |
| POST   | /products/{id}/campaigns                                           | Link campaigns to a product                                         | Admin only    | Invalidate cache |
| DELETE | /products/{id}/campaigns/{campaignId}                              | Unlink a campaign from a product                                    | Admin only    | Invalidate cache |
| POST   | /products/{id}/offers                                              | Link offers to a product                                            | Admin only    | Invalidate cache |
| DELETE | /products/{id}/offers/{offerId}                                    | Unlink an offer from a product                                      | Admin only    | Invalidate cache |

## Notes

- Products can be associated with multiple campaigns and offers
- When fetching a product, use `includeCampaigns=true` and `includeOffers=true` to populate campaign and offer details
- Campaigns and offers should be active and within their date ranges to be applicable
