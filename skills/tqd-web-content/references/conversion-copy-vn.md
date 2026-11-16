# Conversion Copywriting for Business Owners (Plain Vietnamese)

Write website copy that sounds like a trustworthy business owner explaining their offer to a real customer over coffee. Clarity converts better than clever slogans, especially for visitors arriving from mobile search, Facebook ads, or Zalo referrals.

## 1. Hero 5-Second Clarity

A first-time visitor decides within 5 seconds whether they are in the right place. Structure the opening screen around four concrete pieces:

1. **Eyebrow (optional context):** City, niche, or customer group (for example, `Xưởng gỗ theo yêu cầu tại TP.HCM`).
2. **H1 Headline (outcome + specificity):** State what you sell and who benefits in 6–12 plain words.
   - Weak: `Nâng tầm trải nghiệm không gian sống đẳng cấp`
   - Clear: `Đóng bàn làm việc gỗ sồi theo kích thước phòng, giao lắp trong 5 ngày`
3. **Subheadline (how + scope):** Explain the mechanism, turnaround, or guarantee in 1–2 short sentences without buzzwords.
4. **Primary CTA + calm secondary option:** Keep one main action button (`Nhắn Zalo nhận báo giá`, `Đặt lịch khám`, `Gọi 09xx xxx xxx`) and at most one secondary link (`Xem bảng giá`).

## 2. Trust Proof Without Fakes

Real trust comes from verifiable specifics, not inflated round numbers.

- **Use supplied proof only:** Quote real customers with their permission (full name, neighborhood/company, specific result), real before/after photos, and actual warranty policies.
- **Mark gaps openly:** When the owner has not provided testimonials, photos, or numbers yet, write explicit placeholders so nothing fake ever reaches production:
  - `[Cần bổ sung: 2–3 phản hồi thật từ khách đã mua kèm tên và khu vực]`
  - `[Cần bổ sung: ảnh chụp thực tế xưởng/cửa hàng]`
  - `[Cần bổ sung: số năm hoạt động hoặc chính sách bảo hành chính thức]`
- **Show process instead of bragging:** A clear 3-step workflow (`1. Gửi kích thước qua Zalo -> 2. Nhận báo giá chi tiết trong 30 phút -> 3. Giao lắp tận nơi và thanh toán`) builds more confidence than claiming to be `"số 1"` or `"hàng đầu"`.

## 3. Handling Buyer Objections Early

Place answers to real buyer doubts right next to the pricing table or final CTA rather than hiding them at the bottom of a separate policy page:

- **Price anxiety:** State starting prices, what is included, and what triggers extra cost (such as shipping outside city limits).
- **Risk and warranty:** Clarify return, repair, or deposit terms in plain language (`Đặt cọc 30%, kiểm tra hàng trước khi trả phần còn lại`).
- **Time expectation:** Say how fast you reply and deliver (`Phản hồi Zalo trong 15 phút từ 8:00–20:00`).

## 4. Pricing Framing and Zalo / Call / Book CTAs

Non-technical visitors in Vietnam often prefer messaging Zalo or calling directly before filling long forms. Make next-step buttons concrete:

| Conversion goal | Strong button label | Micro-copy below button |
|---|---|---|
| Quick quote via Zalo | `Nhắn Zalo báo giá ngay` | `Gửi mẫu hoặc kích thước, phản hồi trong 15 phút` |
| Direct phone consultation | `Gọi tư vấn 09xx xxx xxx` | `Hỗ trợ 8:00–20:00 mỗi ngày, không mất phí tư vấn` |
| Appointment booking | `Đặt lịch hẹn xem mẫu` | `Xác nhận giờ hẹn qua SMS hoặc Zalo sau khi gửi` |
| Package selection | `Chọn Gói Tiêu Chuẩn` | `Trọn gói 2.900.000đ, không phát sinh phụ phí` |

If offering multiple tiers, label the practical middle option clearly (`Phổ biến cho văn phòng nhỏ`) based on real package differences rather than artificial countdown timers.

## 5. Editable Content Separation (`docs/website/content/` and `src/content/`)

Store finalized page copy in structured Markdown or JSON files under `docs/website/content/<page>.md` (planning) and `src/content/` (site data) using clear labels so owners can edit prices, phone numbers, and descriptions safely:

```yaml
---
page: trang-chu
hero:
  eyebrow: "Nha khoa gia đình tại Quận 3"
  headline: "Khám và chăm sóc răng nhẹ nhàng, báo giá rõ trước khi làm"
  subheadline: "Bác sĩ trực tiếp tư vấn phác đồ và chi phí trọn gói để bạn chủ động lựa chọn."
  primary_cta: "Đặt lịch qua Zalo"
  zalo_url: "https://zalo.me/09xxxxxxxx"
  phone_display: "09xx xxx xxx"
trust_note: "[Cần bổ sung: chứng chỉ phòng khám và ảnh đội ngũ bác sĩ thật]"
---
```

## 6. Anti-AI-Slop Lexicon (Ban and Replace)

Review every draft against common AI-generated Vietnamese and English clichés:

| Banned phrase / habit | Why it hurts trust | Plain replacement |
|---|---|---|
| `"nâng tầm trải nghiệm"` | Empty abstraction; says nothing concrete | State the exact comfort, speed, or result |
| `"giải pháp đột phá"` / `"hàng đầu"` | Unverified superlative readers ignore | Name the actual method, warranty, or standard |
| `"tối ưu hóa quy trình"` | Corporate jargon for everyday buyers | `"Giảm thời gian chờ xuống 15 phút"` |
| `"Seamless"` / `"Elevate"` | Generic template filler | Plain verb describing the customer step |
| Stacked em-dashes (`—`) | Signals machine-generated cadence | Use commas, periods, or short separate sentences |

Keep sentences crisp (10–20 words on average) and paragraphs concise (2–4 sentences) so mobile visitors can scan without wall-of-text fatigue.

## 7. Built-in 12-Point CRO and Fallback Check

Use this checklist before finalizing any landing or service page (and as the built-in fallback whenever `viet-pro` (`~/.local/bin/viet-pro` or on `PATH`) is unavailable on the host):

1. **5-second Hero clarity:** A stranger can tell what is sold, who it fits, and the next step immediately without scrolling.
2. **One dominant CTA:** Primary button stands out cleanly above the fold and repeats at logical stopping points.
3. **Specific subheadline:** Explains how the service works or states a real delivery/warranty detail.
4. **Message match:** Headline phrasing matches the ad, social link, or search keyword that brought the visitor.
5. **Truthful proof near CTA:** Testimonials, photos, or credentials are real and attributed, or clearly tagged `[Cần bổ sung: ...]`.
6. **Zero fabricated numbers:** No invented user counts (`10,000+`), fake star ratings, or made-up partner logos.
7. **Transparent pricing or anchor:** Clear price, starting range, or how quotes are calculated with included/excluded items.
8. **Objections preempted:** Top 3 buyer worries (cost, timeline, warranty/after-sales) answered before the final button.
9. **Action-clear Zalo/Call/Book labels:** Buttons state the channel and response expectation plainly.
10. **Genuine urgency only:** Deadlines or limited slots appear only when tied to real inventory or schedules.
11. **Mobile scan readability:** Short paragraphs, clear H2 claims, and benefit-first bullets instead of dense feature walls.
12. **Clean Vietnamese cadence:** Zero banned clichés, minimal em-dashes (`—`), natural everyday tone verified by `viet-pro gate` when installed.
