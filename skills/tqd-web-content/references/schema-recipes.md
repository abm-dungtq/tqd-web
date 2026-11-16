# JSON-LD Schema Recipes and Validation

Generate and validate Schema.org JSON-LD directly as static `.json` files or inline `<script type="application/ld+json">` tags using Node.js scripts (`scripts/generate-schema.cjs` and `scripts/validate-schema.cjs`). No WP or PHP CMS plugins are needed.

## Ground Rules

- **Match visible content:** Every price, rating, address, author name, and image URL inside JSON-LD must also appear visibly on the page.
- **Use absolute HTTPS URLs:** Set `url`, `image`, `logo`, and breadcrumb `item` values to full `https://...` URLs rather than relative `/images/...` paths.
- **One primary entity per page (plus `BreadcrumbList`):** Pair the page's main schema (`Organization`, `LocalBusiness`, `Product`, or `Article`) with `BreadcrumbList` when breadcrumbs are visible.
- **Skip retired Google rich-result types:** Google retired `HowTo` rich results in 2023 and stopped showing `FAQPage` rich results on `2026-05-07`. Keep FAQ sections visible in HTML for readers; emit `FAQPage` only if an external consumer explicitly parses it.

## Supported Schema Recipes

### 1. `Organization` (Brand / Site-wide Home)

Required by validator: `name`, `url`. Optional: `logo`, `social` (`sameAs`).

Input JSON (`org-input.json`):

```json
{
  "name": "Xưởng Gỗ Minh Anh",
  "url": "https://example.com",
  "logo": "https://example.com/images/logo.png",
  "social": [
    "https://facebook.com/xuonggominhanh",
    "https://youtube.com/@xuonggominhanh"
  ]
}
```

Command:

```bash
node scripts/generate-schema.cjs organization --data org-input.json --output org-schema.json
node scripts/validate-schema.cjs -f org-schema.json
```

### 2. `LocalBusiness` (Physical Store, Clinic, Showroom, Studio)

Required by validator: `name`, `address`, `telephone`. Optional: `description`, `url`, `image`, `priceRange`, `openingHoursSpecification`.

Input JSON (`local-input.json`):

```json
{
  "name": "Nha Khoa An Tâm",
  "description": "Phòng khám nha khoa gia đình tại Quận 3, TP.HCM.",
  "url": "https://example.com",
  "telephone": "+84-901-234-567",
  "streetAddress": "120 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3",
  "city": "TP. Hồ Chí Minh",
  "country": "VN",
  "priceRange": "$$",
  "image": "https://example.com/images/phong-kham.jpg"
}
```

Command:

```bash
node scripts/generate-schema.cjs localbusiness --data local-input.json --output local-schema.json
node scripts/validate-schema.cjs -f local-schema.json
```

If you need a pre-formatted `PostalAddress` object with extra fields (`postalCode`, `addressRegion`), pass `"address": { "streetAddress": "...", "addressLocality": "...", "addressRegion": "...", "postalCode": "...", "addressCountry": "VN" }` directly in the JSON input; `generate-schema.cjs` preserves all object fields and sets `@type: "PostalAddress"`.

### 3. `Product` (Single Item or Transparent Service Package)

Required by validator: `name`, `image`, `offers` (`price` or `priceRange`). Optional: `description`, `currency` (defaults to `"USD"`, set `"VND"` for Vietnamese sites), `availability`.

Input JSON (`product-input.json`):

```json
{
  "name": "Bàn làm việc gỗ sồi 1m4",
  "description": "Gỗ sồi tự nhiên phủ dầu lau bảo vệ, giao lắp nội thành TP.HCM.",
  "image": "https://example.com/images/ban-go-soi.jpg",
  "price": "4200000",
  "currency": "VND"
}
```

Command:

```bash
node scripts/generate-schema.cjs product --data product-input.json --output product-schema.json
node scripts/validate-schema.cjs -f product-schema.json
```

### 4. `Article` (Blog Post / Buyer Guide)

Required by validator: `headline` (`title` in input), `author`, `datePublished` (`date` in input, ISO 8601), `image`. Optional: `org`, `logo`.

Input JSON (`article-input.json`):

```json
{
  "title": "Nên chọn gỗ MDF lõi xanh hay gỗ nhựa cho tủ bếp?",
  "author": "Nguyễn Văn A",
  "date": "2026-05-12",
  "image": "https://example.com/images/blog/mdf-vs-picomat.jpg",
  "org": "Xưởng Gỗ Minh Anh",
  "logo": "https://example.com/images/logo.png"
}
```

Command:

```bash
node scripts/generate-schema.cjs article --data article-input.json --output article-schema.json
node scripts/validate-schema.cjs -f article-schema.json
```

### 5. `BreadcrumbList` (`breadcrumb`)

Required by validator: non-empty `itemListElement`, with each item having `name` and a valid URL (`item`).

Input JSON (`breadcrumb-input.json`):

```json
{
  "items": [
    { "name": "Trang chủ", "url": "https://example.com/" },
    { "name": "Sản phẩm", "url": "https://example.com/san-pham" },
    { "name": "Bàn làm việc gỗ sồi 1m4", "url": "https://example.com/san-pham/ban-go-soi-1m4" }
  ]
}
```

Command:

```bash
node scripts/generate-schema.cjs breadcrumb --data breadcrumb-input.json --output breadcrumb-schema.json
node scripts/validate-schema.cjs -f breadcrumb-schema.json
```

## Validating Any JSON-LD Block

`scripts/validate-schema.cjs` accepts either `-f <path>` or JSON piped via `stdin`, returning exit code `0` when valid and `1` when errors exist:

```bash
# Validate a saved JSON file with warning details
node scripts/validate-schema.cjs -f schema.json --verbose

# Pipe generated output straight into the validator
node scripts/generate-schema.cjs article --data article-input.json | node scripts/validate-schema.cjs
```

Common validation failures and fixes:

- **Invalid URL format (`image`, `url`, `logo`, `item`):** Replace relative paths (`/images/a.jpg`) or empty strings with full `https://` URLs.
- **Invalid ISO 8601 date format (`datePublished`):** Use `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ` rather than `12/05/2026`.
- **Missing required field (`telephone`, `address`, `offers`):** Populate real business data or omit unfinished schema blocks until the owner supplies verified details.
