# Speed (Core Web Vitals) & Accessibility Fixes

Target thresholds at the 75th percentile of mobile visits: **LCP <= 2.5s**, **CLS <= 0.1**, and **INP <= 200ms**, paired with WCAG 2.2 AA keyboard, contrast, and semantic HTML support. Apply the concrete static and framework fixes below during `--fix`.

## 1. LCP <= 2.5s (Fast First Screen)

Slow hero rendering usually happens because the browser discovers the hero image late, downloads an oversized JPEG/PNG, or waits for client JavaScript to fade the hero in.

### Concrete Fixes
- **Preload and prioritize the hero image:** Load the main hero visual as a real `<img>` (not a CSS `background-image` or lazy-loaded image) with `fetchpriority="high"` and `decoding="async"`, and preload it in `<head>`:

```html
<head>
  <link rel="preload" as="image" href="/images/hero-1200.webp" imagesrcset="/images/hero-800.webp 800w, /images/hero-1200.webp 1200w" imagesizes="100vw" fetchpriority="high">
</head>
<body>
  <img src="/images/hero-1200.webp" srcset="/images/hero-800.webp 800w, /images/hero-1200.webp 1200w" sizes="(max-width: 768px) 100vw, 50vw" width="1200" height="800" alt="Quầy bánh buổi sáng tại cửa hàng" fetchpriority="high">
</body>
```

- **Modern formats & sized delivery:** Convert oversized PNG/JPEG hero photos to **WebP** or **AVIF** (`cwebp`, `magick`, or framework `<Image />`), keeping hero images around `<= 150 KB` and thumbnails `<= 60 KB`. Only add `loading="lazy"` to images below the fold.
- **No hidden hero:** Render the hero headline, CTA, and hero image at `opacity: 1` immediately in HTML/CSS instead of hiding them behind `opacity: 0` JavaScript scroll-reveal wrappers.
- **Framework patterns:**
  - **Astro:** Use `<Image src={heroImg} alt="..." widths={[640, 1200]} formats={['avif', 'webp']} loading="eager" fetchpriority="high" />`.
  - **Next.js:** Set `priority` (or `preload`) and accurate `sizes` on the hero `next/image` component; keep hero above-the-fold sections as Server Components.

## 2. CLS <= 0.1 (Zero Layout Shift)

Visual jumping happens when images, embeds, or webfonts push surrounding text downward after initial paint.

### Concrete Fixes
- **Reserve media slots explicitly:** Always declare `width` and `height` attributes on every `<img>`, `<video>`, and `<iframe>`, paired with fluid CSS so aspect ratio stays locked before pixels arrive:

```css
img, video, iframe {
  max-width: 100%;
  height: auto;
}

.video-slot {
  aspect-ratio: 16 / 9;
  width: 100%;
  background: #f3f4f6;
}
```

- **Webfont loading without invisible text:** Append `&display=swap` on Google Fonts URLs and declare `font-display: swap;` inside self-hosted `@font-face` blocks so Vietnamese copy stays legible immediately while webfonts download:

```css
@font-face {
  font-family: "Be Vietnam Pro";
  src: url("/fonts/be-vietnam-pro-400.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
```

- **Stable dynamic regions:** Avoid injecting announcement bars, cookie banners, or promo cards above existing content after load; render them in reserved space or as bottom/corner overlays that do not displace the document flow.

## 3. INP <= 200ms (Responsive Taps & Clicks)

Sluggish taps come from render-blocking `<script>` tags, heavy client bundles for simple UI, and scroll listeners forcing repeated layout reflows.

### Concrete Fixes
- **Minimal JS first:** Replace heavy JS accordions, dropdowns, and modals with native HTML `<details>/<summary>`, `<dialog>`, and CSS transitions (`transform` and `opacity` only, `150–250ms`).
- **Zero blocking scripts:** Load external scripts with `defer` or `type="module"` so HTML parsing finishes without stalling:

```html
<script src="/js/main.js" defer></script>
```

- **Clean event handling:** Keep click handlers light (no synchronous loops or large DOM writes before visual state updates) and inspect CSS instead of polling `scroll` events for animations.
- **Framework patterns:** In Astro, omit `client:load` on static cards and reserve `client:visible` or `client:idle` for interactive islands. In Next.js, keep marketing pages Server Components and isolate `'use client'` boundaries to small interactive widgets.

## 4. Semantic HTML Landmarks & Heading Structure

Screen readers, keyboard users, and search engines rely on clear document regions and sequential headings:

- Include a skip link as the first focusable element inside `<body>` pointing to `<main id="main-content">`.
- Use one `<header>`, `<nav aria-label="Điều hướng chính">`, one `<main id="main-content">`, and one `<footer>` per page.
- Keep exactly one `<h1>` per page describing the page's core outcome, followed sequentially by `<h2>` and `<h3>` without skipping levels (for example, `<h1>` directly to `<h3>`).
- Give every informative `<img>` concise, natural Vietnamese `alt` text; use `alt=""` (`aria-hidden="true"`) on purely decorative shapes or dividers.

## 5. Keyboard Focus-Visible & Reduced Motion

- **Visible keyboard focus:** Ensure every link, button, form input, and mobile menu toggle can be reached with `Tab` and activated with `Enter`/`Space`. Retain clear focus outlines:

```css
:focus-visible {
  outline: 2px solid var(--color-accent, #0f766e);
  outline-offset: 3px;
}

.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  padding: 10px 16px;
  background: #111827;
  color: #ffffff;
}
```

- **Mobile drawer keyboard safety:** When opening a menu drawer or modal, move focus inside it, close on `Escape`, and return focus to the trigger button on close.
- **Honor `prefers-reduced-motion`:** Disable decorative movement and parallax for visitors who request reduced motion while keeping functional state updates intact:

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 6. Safe, Accessible Form Validation

Customer contact, quote, and booking forms must guide visitors clearly without clearing their typed message on mistakes:

- Pair every input with a visible `<label for="...">` rather than relying on `placeholder` text alone, and include helpful `autocomplete` (`name`, `tel`, `email`) and mobile-friendly `type` (`tel`, `email`).
- Validate gently on `blur` and on `submit`, marking invalid fields with `aria-invalid="true"` and linking a human-readable Vietnamese hint via `aria-describedby`:

```html
<label for="customer-phone">Số điện thoại / Zalo</label>
<input id="customer-phone" name="phone" type="tel" autocomplete="tel" required aria-describedby="phone-error">
<p id="phone-error" class="field-error" role="status" aria-live="polite"></p>
```

- Keep user input intact after failed submissions, announce success or failure in an `aria-live="polite"` status banner, and keep direct Call (`tel:`) or Zalo links nearby as an immediate fallback.
