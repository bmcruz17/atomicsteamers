# Atomic Steamers — Bed Bug Removal, Oahu

Marketing website for **Atomic Steamers**, a locally owned, chemical-free
(352°F steam) **bed bug removal** service serving the island of Oahu, Hawaii.
Secondary service: steam sanitizing & rental/move-out turnover.

Founded August 2025 by Brandon & Daniel Lopez. Registered Hawaii business
(available for State of Hawaii contracts). Equipment: **Optima Steamer XD**
+ a second mobile steamer, with concrete-floor and window attachments.

- **Phone:** (808) 470-2500 (808-470-2500)
- **Email:** hello@atomicsteamers.com

## Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page site (hybrid dark-steam hero + light content sections). |
| `styles.css` | All styling. Brand colors/fonts are CSS variables at the top. |
| `script.js` | Mobile nav, form handling, sticky call button. |
| `CNAME` | Custom domain for GitHub Pages (`atomicsteamers.com`). |
| `robots.txt` | Allows crawling, points to the sitemap. |
| `sitemap.xml` | Helps Google index the site. |
| `.nojekyll` | Serve files as-is (no Jekyll processing). |

## SEO built in
- Bed-bug-focused `<title>`, meta description, and local keywords
- Geo meta tags (US-HI / Honolulu) + canonical + Open Graph
- **LocalBusiness/PestControlService** + **FAQPage** structured data (JSON-LD)
- Single-keyword focus (bed bug removal Oahu), semantic headings, fast static load

## Still to do before/after launch
- **Add real photos** — your Optima XD, team, and job shots (see comments in
  `index.html`, e.g. the equipment section). Real photos rank & convert better.
- **Testimonials** — replace the three samples with real reviews.
- **Contact form** — currently shows a confirmation only. Wire it to a backend
  (see the customer-intake / pipeline plan) or a service like Formspree/Web3Forms.

## Deploying with GitHub Pages
1. Settings → Pages → Source = **Deploy from a branch** → `main` / `/ (root)`.
2. Custom domain auto-fills `atomicsteamers.com` from the `CNAME` file.
3. Wait for the DNS check + cert, then enable **Enforce HTTPS**.

DNS (Cloudflare): apex `@` → GitHub A records (185.199.108–111.153),
`www` → `bmcruz17.github.io`, all **DNS only** (grey cloud), SSL/TLS = Full.
