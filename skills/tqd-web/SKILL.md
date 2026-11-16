---
name: tqd-web
description: "Orchestrate end-to-end website design, content, visual preview, quality checks, and publishing for non-technical creators. Use when building a new website or full redesign from scratch; not for single-phase tasks such as only visual styling (tqd-web-design), copy/SEO (tqd-web-content), health audits (tqd-web-audit), hosting/forms (tqd-web-launch), or opt-in app backends (tqd-web-app)."
when_to_use: "Invoke when taking a website from an everyday idea to a live site with a plain-language edit guide; route single-phase requests straight to their tqd-web-* owner."
argument-hint: "[mo ta website] [--auto] [--from <phase>]"
license: "MIT"
metadata:
  author: tqd
  version: "2.0.0"
---

# tqd-web: Studio Thiết Kế Website Cho Người Không Chuyên

Guide a business owner or creator with zero coding or design background from an everyday description to a fast, authentic, search-ready website and a plain-language maintenance guide.

## When to use

- Build a new website from scratch ("làm trang web bán hàng", "làm web giới thiệu dịch vụ", "thiết kế portfolio cá nhân") or rebuild an outdated site end to end.
- Hand off single-phase requests directly so context stays focused: visual identity or UI styling alone goes to `tqd-web-design`; copywriting or SEO alone goes to `tqd-web-content`; inspecting an existing site goes to `tqd-web-audit`; connecting forms, domains, or analytics alone goes to `tqd-web-launch`; adding user login, databases, or online payments alone goes to `tqd-web-app`.

## Operating principles

1. **Zero jargon with the user:** Translate every technical decision into business outcomes, customer actions, and visual feel so non-technical owners stay confident rather than overwhelmed.
2. **One business question at a time:** Ask one focused everyday question per turn (3–4 questions total in Phase 1). Decide all reversible technical choices silently and document assumptions in `docs/website/brief.md`.
3. **Visual preview before full build:** Present a live Hero + key section preview in the browser and get visual confirmation before building remaining pages, because tasting one real screen prevents costly full-site rework.
4. **Honest content over fake filler:** Use `[Cần bổ sung: ...]` placeholders wherever real prices, photos, or reviews are missing so fabricated metrics never reach customers.

## Modes

- **Default (Guided):** Lock `brief.md` via 3–4 single-turn questions, pause once for Hero visual preview sign-off, and pause only at authorization gates (domains, paid plans, live production publish, or opt-in app maintenance).
- **`--auto`:** Infer reasonable gaps from available project files and prompt context, record each assumption in `docs/website/brief.md`, and run straight through to a local preview and report while still stopping at external cost or production boundaries.
- **`--from <phase>`:** Resume at phase 2–6 whenever earlier files in `docs/website/` already exist, updating existing files instead of creating duplicates.

## Hand-off workspace in the target website

Keep working artifacts inside `docs/website/` of the target website folder plus the owner guide at the project root so progress survives across sessions:

| File | Produced in | Consumed by |
|---|---|---|
| `docs/website/brief.md` | Phase 1 | All phases (records selected tier 1–3) |
| `docs/website/brand.md` and SVG logo | Phase 2 | Phases 3, 4 |
| `docs/website/sitemap.md` and `content/` copy | Phase 2 | Phases 3, 4, 5 |
| `HUONG-DAN-SUA-WEB.md` | Phase 4 | Site owner |
| `docs/website/launch-report.md` | Phase 6 | Site owner |

## Phases

Execute phases in order because each phase consumes the artifacts locked by the previous one:

### Phase 1: Plain-language discovery and silent tier selection

Consult `references/discovery-questions-vn.md` for question templates. Ask one short business question per turn to capture: (a) what the business offers and the main customer action (call, Zalo message, booking, quote request, or order), (b) target audience and mood/industry examples, (c) pages needed and real materials available (logo, photos, price list), and (d) contact channels and domain readiness.

Write `docs/website/brief.md` in plain Vietnamese, and silently classify the technical stack using `references/stack-tiers-and-content-separation.md`:

- **Tier 1 (Landing / Portfolio / Event / Menu, 1–3 pages):** Semantic HTML5 + CSS tokens + editable data config (`site-data.js` or clearly commented HTML sections). Zero build tools needed; opens immediately in any browser.
- **Tier 2 (Multi-page Business / Blog / Catalog):** Astro (default for content/SEO) or static/hybrid Next.js with all text, prices, photos, and Zalo/phone links isolated inside `content/` or `src/content/`.
- **Tier 3 (Web App with accounts, database, or checkout):** Only when the owner explicitly asks for login, stored records, or automated online payment; route to `tqd-web-app` first so ongoing responsibilities are understood before coding.

Gate: Ask the owner once to confirm the short plain-language summary of `brief.md` (skipped only in `--auto`).

### Phase 2: Visual identity and real copy

1. Invoke `tqd-web-design` to establish `docs/website/brand.md` (color palette, Vietnamese-verified font pair, SVG logo/monogram if none exists, and `tokens.css`).
2. Invoke `tqd-web-content` (powered by `viet-pro` authoring and gate standards) to write conversion-focused Vietnamese page copy, UI microcopy, and SEO/GEO blog articles for every entry in `docs/website/sitemap.md`, keeping search intent, headings, and honest placeholders aligned with the brand voice.

### Phase 3: Visual preview approval

Build the primary Hero and 2–3 signature sections using real copy and `tokens.css` (delegating implementation to `web-builder` when multi-file). Verify layout integrity with `tqd-web-design` checks, open the preview in the browser, and ask the owner in plain words whether the colors, mood, and readability match what they imagined. Fold feedback into `brand.md` and `tokens.css` before building remaining pages.

### Phase 4: Full build and editable content layer

Delegate or build every remaining page in `sitemap.md`, attach zero-server customer contact channels (Zalo, click-to-call, static lead form via `tqd-web-launch`), and generate `HUONG-DAN-SUA-WEB.md` from `references/edit-guide-template.md` so the owner knows exactly where to edit words, prices, photos, and phone numbers.

### Phase 5: Health audit and isolated visual review

Run `tqd-web-audit` across mobile (`375x812`), tablet (`768x1024`), and desktop (`1440x900`), then have `visual-ux-critic` inspect the rendered pages independently. Fix every blocker (overflow, contrast, broken links, clipped Vietnamese accents, placeholder leaks) and re-run checks until clean.

### Phase 6: Launch, measurement, and handover

Work through `references/launch-checklist.md` together with `tqd-web-launch`. Deploy to a preview URL (or user-authorized production host), run one live test of the contact/Zalo path, record verifiable evidence in `docs/website/launch-report.md`, and present the result to the owner in clear Vietnamese.

## Authority boundaries

Pause and ask the owner before buying a domain or paid plan, changing live DNS, deploying to a live custom domain, enabling live payment keys, or deleting existing website data. Keep secrets and API tokens out of git-tracked files and reports.

## References

- `references/discovery-questions-vn.md` — 4 conversational Vietnamese discovery prompts and brief template
- `references/stack-tiers-and-content-separation.md` — silent Tier 1/2/3 decision rules and `content/` separation patterns
- `references/edit-guide-template.md` — plain-language `HUONG-DAN-SUA-WEB.md` blueprint for non-technical owners
- `references/launch-checklist.md` — pre-launch and live verification checklist across all tiers

## Done when

- `docs/website/brief.md`, `brand.md`, `sitemap.md`, and real page content exist in the target project.
- The rendered site passes `tqd-web-audit` checks and an isolated `visual-ux-critic` review with zero blocking defects.
- `HUONG-DAN-SUA-WEB.md` accurately matches the delivered project files.
- `docs/website/launch-report.md` records the preview or live URL, contact verification, and checklist results with observed evidence (any skipped or blocked step is labeled honestly as pending).
