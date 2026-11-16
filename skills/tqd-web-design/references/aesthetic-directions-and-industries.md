# Aesthetic Directions and Vietnamese Industry Playbooks

Translate plain-language business descriptions into one committed visual direction, tailored to the industry and free of AI template clichés.

## 1. Plain-Language Direction Translation

Zero-knowledge users think in mood and customer impression, not CSS terminology. Offer **2–3 plain-language options** tied to their business before generating tokens:

- **Internal Design Brief** (recorded in `docs/website/brand.md`, not recited as jargon to the user):
  `Register (Brand | Product)`, `Scene (who visits, device, light, mood)`, `Direction`, `Color strategy`, `Type pair`, `Signature element`, and `Dials (variance / motion / density)`.
- **User-Facing Options Example** (coffee roastery):
  1. *"Ấm áp thủ công — nền giấy kem dịu, chữ thanh lịch kiểu tạp chí, ảnh hạt cà phê làm điểm nhấn và nút đặt hàng rõ ràng."* (Warm Editorial / Organic)
  2. *"Hiện đại tối giản — nền sáng gọn, chữ đậm rõ nét trên điện thoại, tập trung menu giá và nút nhắn Zalo."* (Modern Shop)
  3. *"Trầm sang buổi tối — nền nâu than ấm, ánh đồng nhẹ, tạo cảm giác quán rang xay cao cấp."* (Editorial Dark)

## 2. Register and Design Dials

| Dimension | **Brand Register** (Landing, Shop, Portfolio) | **Product Register** (Booking Portal, App, Dashboard) |
|---|---|---|
| Type scale | Fluid `clamp()`, ratio `1.25–1.333` | Fixed `rem`, ratio `1.2`, single sans family |
| Color use | Restrained default; Committed or Drenched hero if brand owns color | Restrained: accent reserved strictly for primary action, selection, focus |
| Motion | One entrance choreography; `200–300ms` hover/state | Fast state transitions (`150–250ms`) only |
| Layout | Asymmetric fractions (`5fr 7fr`), `96–160px` vertical chapter rhythm | Consistent shell, `24–32px` gutters, tabular numeric alignment |
| Dial presets | Editorial `6/4/3` · Boutique Shop `7/5/3` · Studio `8/6/3` | Dashboard / Booking UI `3/2/6` · Service Portal `4/2/5` |

## 3. Core Aesthetic Direction Menu

| Direction | Vietnamese Font Pair | Palette Recipe | Layout Signature |
|---|---|---|---|
| **Swiss / Editorial** | `Be Vietnam Pro` / `Work Sans` or `Lora` | Bone `#F7F5F0`, charcoal `#1A1815`, single cobalt or vermilion accent | Hairline rules, flush-left type, asymmetric `5/7` split |
| **Luxury / Refined** | `Cormorant Garamond` / `Be Vietnam Pro` | Warm ivory or deep espresso, muted gold/bronze accent | Centered or editorial serif display, generous whitespace, thin dividers |
| **Organic / Craft** | `Lora` / `Be Vietnam Pro` or `Nunito` | Moss, clay, linen, terracotta — muted natural tones | Arch or soft photo frames, tactile imagery, natural grid breaks |
| **Modern Shop** | `Plus Jakarta Sans` / `Be Vietnam Pro` | Clean off-white `#FAF9F6`, deep ink, one vivid brand CTA hue | Product-forward hero, clear price cards, sticky mobile action bar |
| **Soft / Playful** | `Bricolage Grotesque` / `Nunito` | Soft pastel canvas + one saturated pop color | Chunky `16px` radii, tactile button press states, warm illustrations |
| **Editorial Dark** | `Lora` or `Cormorant Garamond` / `Be Vietnam Pro` | `#121216` blue-charcoal, warm white ink, desaturated amber/sage | Full-bleed imagery with dark scrim, calm large headings |
| **Utilitarian / B2B** | `Plus Jakarta Sans` / `Inter` | Cool slate neutrals `#F8FAFC`, navy `#0F172A`, crisp cobalt/teal | Structured spec tables, sharp `6px` corners, crisp hierarchy |

## 4. Vietnamese Industry Playbooks

### F&B / Quán cà phê – Tiệm bánh
- **Mood & Palette:** Warm Organic or Editorial (`hue 25–45`, roasted coffee, terracotta, warm butter cream).
- **Fonts:** `Lora` display + `Be Vietnam Pro` body.
- **Signature & Above the Fold:** Real signature dish/drink photograph paired with clear opening hours, district address, and one primary CTA ("Đặt bàn" or "Nhắn Zalo đặt món").
- **Key Sections:** Categorized menu with `tabular-nums` prices (never tiny unreadable PDF images), branch map + parking note, honest customer notes or `[Cần bổ sung]` slots.

### Spa / Làm đẹp
- **Mood & Palette:** Calm Luxury or Soft Organic (`hue 140–170` sage/eucalyptus or warm stone + muted rose/bronze).
- **Fonts:** `Cormorant Garamond` display + `Be Vietnam Pro` body (`--leading-display: 1.25`).
- **Signature & Above the Fold:** Serene space or treatment photo, clear promise without medical overclaims, single primary CTA ("Đặt lịch tư vấn").
- **Key Sections:** Treatment list showing duration + price cleanly, therapist/hygiene commitment, transparent booking flow (Zalo/phone/simple form).

### Bán lẻ / Sản phẩm thủ công
- **Mood & Palette:** Committed Brand Color or Tactile Craft (draw `--hue` from product materials or packaging via `scripts/extract-colors.cjs`).
- **Fonts:** `Plus Jakarta Sans` or `Lora` display + `Be Vietnam Pro` body.
- **Signature & Above the Fold:** Crisp product showcase with real pricing, material/origin line, and fast order path.
- **Key Sections:** Filterable or cleanly grouped catalog (`repeat(auto-fit, minmax(260px, 1fr))`), care/shipping policy summary, direct Zalo/order button.

### Dịch vụ / Tư vấn B2B
- **Mood & Palette:** Swiss Editorial or Utilitarian Precision (`hue 215–240` navy/slate + crisp cobalt or forest green accent).
- **Fonts:** `Plus Jakarta Sans` display + `Inter` or `Be Vietnam Pro` body.
- **Signature & Above the Fold:** Specific outcome headline ("Giúp ai và giải quyết vấn đề gì"), 1 primary CTA ("Đặt lịch trao đổi"), clean visual diagram or real workspace shot.
- **Key Sections:** Service scope comparison, 3-step working process with verb-noun labels ("Khảo sát, Đề xuất, Triển khai"), verifiable case notes (`[Cần bổ sung]` if none yet).

### Khóa học / Cá nhân (Giảng viên, Coach, Studio)
- **Mood & Palette:** Editorial or Editorial Dark (warm charcoal `#1C1917` or clean bone `#F8F7F4` + one personal signature accent).
- **Fonts:** `Lora` display + `Be Vietnam Pro` body.
- **Signature & Above the Fold:** Authentic portrait/work preview + crisp bio positioning + single registration or contact CTA.
- **Key Sections:** Curriculum or service deliverables in structured rows, transparent tuition/fee table, FAQ accordion using native `<details>` or accessible disclosure.

## 5. Layout Discipline & Anti-AI-Slop Rules

- **Hero viewport:** use `min-height: 100dvh` (not `100vh`) so mobile browser toolbars never cut off the CTA. Keep the hero focused on 1 headline, concise subtext, 1 primary CTA (plus optional secondary), and 1 strong visual. Leave avatar rows, pricing teasers, badge clusters, and stat strips out of the hero.
- **Rhythm & Grid:** rank content instead of dropping everything into identical 3-column icon-circle cards. Alternate between asymmetric splits (`7fr 5fr`), clean definition lists, and structured tables. Ration uppercase eyebrow kickers to at most one per three sections.
- **One depth strategy, one radius family:** choose either hairline borders OR soft tinted shadows OR surface-tint elevation on cards — combining thick borders with heavy grey shadows muddies hierarchy. Lock radii to one family (`0px` sharp, `8–12px` soft, or pill).

Reject these AI slop patterns on every build, because each signals an unedited template and harms reader trust:
1. **Unprompted purple-cyan gradients & gradient headings** (`background-clip: text`) — replace with clean tinted surfaces and crisp ink text.
2. **Emoji spam in headings, bullets, and nav items** — let typography and consistent single-family SVG icons carry meaning.
3. **Identical 3-card rounded-icon feature grids everywhere** — elevate the key differentiator visually and present secondary items cleanly.
4. **Em-dashes (`—`) in visible UI headings and cards** — replace with colons, periods, commas, or rewrite concisely.
5. **Fabricated proof & cliché filler** — never invent testimonials, partner logos, `10,000+ khách hàng`, `99.99%`, `lorem ipsum`, or empty buzzwords ("Nâng tầm đẳng cấp", "Giải pháp đột phá", "Elevate", "Seamless"). Mark missing proof with `[Cần bổ sung: ...]`.
