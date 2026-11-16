# Keyword Intent and Article Playbook

Plan website pages and Vietnamese blog posts around real buyer questions so every URL earns its place without competing against another page on the same site.

## 1. Grouping Vietnamese Search Intent

Before writing pages or articles, sort candidate topics into four practical customer mindsets. Assign one primary search intent per URL to avoid keyword cannibalization:

| Intent group | Typical Vietnamese query signals | Best destination page | Primary goal |
|---|---|---|---|
| **Buying (Transactional)** | `báo giá`, `mua`, `đặt lịch`, `thuê`, `dịch vụ [X] tại [Quận/TP]` | Service, Product, or Landing page | Direct Zalo, call, booking, or checkout |
| **Comparing (Commercial)** | `so sánh [A] và [B]`, `nên chọn loại nào`, `review`, `kinh nghiệm thuê` | Comparison guide or Buyer's checklist | Help visitor pick the right tier/option and click through to service page |
| **Learning (Informational)** | `cách làm`, `quy trình`, `là gì`, `lỗi thường gặp`, `bảo quản` | Blog article or How-to guide | Answer clearly, build trust, link naturally to relevant offer |
| **Local / Trust (Navigational)** | `địa chỉ`, `giờ mở cửa`, `chính sách bảo hành`, `[Tên thương hiệu]` | Contact, About, or Warranty page | Confirm legitimacy, map directions, phone/Zalo |

Group close variations onto one strong page instead of spinning separate thin articles for singular/plural or word-order tweaks (for example, cover `"giá làm tủ bếp gỗ an cường"` and `"báo giá tủ bếp mdf lõi xanh"` on one transparent pricing guide unless materials require distinct specs).

## 2. Planning `docs/website/sitemap.md`

Create `docs/website/sitemap.md` before drafting individual pages so content, internal links, and schemas align across the whole project.

```markdown
# Sitemap Plan — [Tên doanh nghiệp]

| URL Slug | Page Type | Primary Intent & Target Query | Main CTA | Copy File | Schema |
|---|---|---|---|---|---|
| `/` | Home / Landing | Brand + core service overview | Nhắn Zalo báo giá | `src/content/pages/home.md` | `Organization` or `LocalBusiness` |
| `/dich-vu-thiet-ke-noi-that` | Service | Buying: `thiết kế nội thất căn hộ trọn gói` | Đặt lịch khảo sát | `src/content/pages/service-interior.md` | `BreadcrumbList` |
| `/bang-gia` | Pricing | Buying/Comparing: `báo giá thi công nội thất 2026` | Nhận dự toán mẫu | `src/content/pages/pricing.md` | `Product` (if packages) |
| `/blog/so-sanh-go-mdf-va-go-nhua` | Article | Comparing: `nên chọn gỗ MDF lõi xanh hay gỗ nhựa` | Xem mẫu vật liệu | `src/content/blog/so-sanh-go-mdf-va-go-nhua.md` | `Article`, `BreadcrumbList` |
| `/lien-he` | Contact | Local: `địa chỉ showroom & giờ mở cửa` | Chỉ đường / Gọi ngay | `src/content/pages/contact.md` | `LocalBusiness` |
```

Match site size to business stage:

- **Tier 1 (1–3 pages):** Focus on Home + Pricing/Contact with crystal-clear conversion copy; skip empty blog folders that cannot be maintained.
- **Tier 2 (Multi-page + Blog):** Start with core buying pages first, then publish 3–5 deeply useful comparison and how-to articles that answer real sales-call questions.

## 3. High-Utility Vietnamese Article Structure

Write articles for an adult reader looking for a clear answer on their phone, not for keyword counters:

1. **Title (`<h1>`) and opening answer (40–60 words):** Lead immediately with the direct verdict or answer in plain Vietnamese before sharing background history. AI search engines and hurried readers both extract the first paragraph after the heading.
2. **Who this fits / Quick summary box:** Help readers verify within seconds whether the article matches their budget, region, or situation.
3. **Structured `<h2>` and `<h3>` sub-questions:** Phrase headings around actual decisions (`Chi phí thực tế gồm những khoản nào?`, `3 lỗi khiến cửa gỗ nhanh cong vênh`) rather than vague headings (`Giới thiệu chung`, `Tổng kết`).
4. **Concrete examples, ranges, and comparison tables:** Replace generic statements (`giá cả hợp lý`) with real itemized breakdowns, dimensions, timelines, or side-by-side tables. Tag any unconfirmed numbers with `[Cần bổ sung: ...]` so the owner fills in exact prices before publishing.
5. **Natural internal linking:** Link from learning/comparison sections directly to the matching service, product, or pricing page using descriptive anchor text (`xem bảng giá thi công tủ bếp gỗ MDF`) rather than `"bấm vào đây"` or `"xem thêm"`.
6. **Visible FAQ section (for readers, not retired rich snippets):** Include 3–5 genuine customer questions and concise answers at the bottom using clean `<h3>` headings. Note that Google stopped showing FAQ rich results on `2026-05-07`, so keep FAQs visible for human clarity and AI summary extraction rather than expecting Google search FAQ accordions.
7. **Calm closing CTA:** Connect the article topic to one helpful next step (`Nhắn Zalo gửi bản vẽ mặt bằng để nhận dự toán sơ bộ trong ngày`).

## 4. Article Frontmatter Template (`src/content/blog/<slug>.md`)

Keep article metadata structured cleanly for static sites (Astro/Next.js) and schema generation:

```yaml
---
title: "Nên chọn gỗ MDF lõi xanh hay gỗ nhựa cho tủ bếp?"
description: "So sánh độ bền ẩm, giá thành và tuổi thọ thực tế giữa MDF lõi xanh và Picomat cho khu vực bếp gia đình."
slug: "so-sanh-go-mdf-va-go-nhua"
publishedAt: "2026-05-12"
updatedAt: "2026-05-12"
author: "Nguyễn Văn A — Kỹ thuật viên xưởng mộc"
coverImage: "/images/blog/mdf-vs-picomat.jpg"
coverAlt: "Mặt cắt mẫu gỗ MDF lõi xanh và tấm nhựa Picomat đặt cạnh nhau"
primaryKeyword: "so sánh gỗ MDF lõi xanh và gỗ nhựa"
intent: "commercial-comparison"
---
```

## 5. Verification Before Publishing

- Confirm every factual claim, price range, or technical measurement matches supplied owner notes or cited primary sources, with `[Cần bổ sung: ...]` marking any open item.
- Run `viet-pro gate <file.md>` (via `PATH` or `~/.local/bin/viet-pro`, or `--stdin`) when installed on the host to verify Vietnamese rhythm and catch AI clichés; if `viet-pro` is unavailable, run a manual pass against `references/conversion-copy-vn.md` and note that automated gate scoring was skipped.
- Generate and validate `Article` (and `BreadcrumbList`) JSON-LD via `scripts/generate-schema.cjs` and `scripts/validate-schema.cjs` before adding the article URL to `sitemap.xml`.
