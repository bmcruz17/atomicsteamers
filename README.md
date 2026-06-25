# Atomic Steamers — Bed Bug Removal, Oahu

Marketing website for **Atomic Steamers**, a locally owned, chemical-free
(steam-based) bed bug removal service serving the island of Oahu, Hawaii.

Founded August 2025 by Brandon & Daniel Lopez. We run the **Optima Steamer XD**
plus a second mobile steaming machine, with specialty attachments (rotating
concrete floor cleaner, window-cleaning tools).

## Files

| File | Purpose |
|------|---------|
| `index.html` | The single-page site (hero, how-it-works, why steam, equipment, services, areas, about, reviews, FAQ, contact). |
| `styles.css` | All styling. Brand colors are CSS variables at the top of the file. |
| `script.js` | Mobile nav, form handling, sticky call button. |
| `CNAME` | Custom domain for GitHub Pages (`atomicsteamers.com`). |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (no Jekyll processing). |

## Things to update before going live

These are placeholders — search & replace them with real values:

- **Phone:** `(808) 555-0100` / `tel:+18085550100`
- **Email:** `info@atomicsteamers.com`
- **Testimonials:** the three reviews are samples — swap in real ones.
- **Contact form:** currently shows a confirmation message only. To actually
  receive submissions, wire the form to a service like
  [Formspree](https://formspree.io), [Web3Forms](https://web3forms.com), or
  Netlify Forms (set the `<form action="...">` and `method="POST"`).

## Deploying with GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source = Deploy from a branch**.
4. Choose the branch (e.g. `main`) and folder `/ (root)`, then **Save**.
5. Under **Custom domain**, enter `atomicsteamers.com` (the `CNAME` file already
   sets this) and save. Enable **Enforce HTTPS** once the cert is issued.

## Pointing the atomicsteamers.com domain at GitHub

At your domain registrar's DNS settings, add:

**Apex domain (`atomicsteamers.com`) — four A records:**

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

(Optionally also add the AAAA/IPv6 records GitHub lists for Pages.)

**`www` subdomain — one CNAME record:**

```
www.atomicsteamers.com  ->  <your-github-username>.github.io
```

DNS changes can take from a few minutes up to 24–48 hours to propagate. Once
they do, GitHub Pages will serve the site at https://atomicsteamers.com.
