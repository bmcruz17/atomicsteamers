# Atomic Steamers — Project Knowledge

Upload this file into your Claude Project's knowledge. It's the single source of
truth for the business, the website, the backend, and how the project is wired.
Keep it updated as things change.

---

## 1. The business

- **Name:** Atomic Steamers
- **What we do:** Chemical-free, steam-based **bed bug removal** on **Oahu, Hawaii**.
  We kill bed bugs and eggs with high-temperature dry steam — no pesticides, no
  residue, safe for keiki and pets, and customers keep their furniture.
- **Brand hook:** "352°F — pure steam, zero germs."
- **Flagship service:** Bed bug removal (this is the #1 focus for SEO + messaging).
- **Secondary service:** Steam sanitizing & rental / move-out turnover (Airbnb/STR,
  PCS moves). We can also do auto/marine detailing, concrete/exterior, and window
  steam cleaning, but the brand leads with **bed bugs** — do not dilute it.
- **Founded:** August 2025.
- **Founders:** Brandon (brandonmcruz@mac.com) and Daniel Lopez.
  ⚠️ **Founders' personal names are PRIVATE — never put them on the public website
  or any marketing.** "Locally owned & operated" is the approved framing.
- **Status:** Registered Hawaii business; pursuing State of Hawaii contracts.
- **Service area:** All of Oahu — Honolulu, Waikiki, Kailua, Kaneohe, Kapolei, Ewa
  Beach, Pearl City, Aiea, Mililani, Waipahu, Hawaii Kai, North Shore, etc.

## 2. Contact (real, live)

- **Phone:** (808) 265-5339 → **808-265-5339** (`tel:+18082655339`)
- **Email:** **hello@atomicsteamers.com** (Google Workspace)
- **Hours:** 7 days, 7am–7pm

## 3. Equipment

- **Optima Steamer XD** — commercial diesel vapor steamer, dry steam up to ~352°F
  (panel shows operating temp, e.g. 330°F under load). Primary machine.
- **Second mobile steamer** — extra capacity / island coverage.
- **Attachments:** rotating concrete-floor cleaner, window-cleaning tools.

## 4. Brand & design

- **Look:** clean, bright, "green/tropical" — NOT dark/serif. The owner explicitly
  prefers the green theme.
- **Fonts:** Poppins (headings), Inter (body).
- **Colors:** green `#0b6e4f` / `#15b07e`, dark green `#084d37`, amber accent
  `#f4a72c`, sand `#f6f4ee`, ink `#1c2a25`.
- **Logo:** atom glyph "⚛︎" in a green rounded square (favicon + nav mark).
- **Tone:** confident, simple, local (uses light Hawaiian words like keiki, ʻohana,
  ʻāina, mahalo — sparingly). **No fluff. Short and direct.**

## 5. Tech stack & infrastructure

- **Website:** static HTML/CSS/JS. No framework, no build step.
- **Hosting:** GitHub Pages, repo `bmcruz17/atomicsteamers`, served from **`main`**
  (`/` root). Dev branch: `claude/atomic-steamers-website-ej67fg`. Push to BOTH.
  - `pages build and deployment` Action runs on push to `main`; site is at
    https://atomicsteamers.com. After pushing, allow ~1 min + hard-refresh.
- **Domain:** `atomicsteamers.com` — DNS on **Cloudflare**, registrar moving from
  **Squarespace → Cloudflare** (transfer in progress).
  - Apex `@` → GitHub A records `185.199.108–111.153` (DNS only / grey cloud)
  - `www` → `bmcruz17.github.io` (CNAME, DNS only)
  - Cloudflare SSL/TLS = **Full**. GitHub Pages "Enforce HTTPS" on.
  - Email MX → Google Workspace. Leave MX/TXT (SPF/DKIM/DMARC) records alone.
- **Analytics:** Google Analytics (gtag.js), measurement ID **G-1HK43ZRDYP**.
- **Backend:** **Supabase** (separate Atomic Steamers account; project ref
  `vhkqnodnzrfshrsptcui`). The website's Supabase URL + anon key live in
  `supabase-config.js` (anon key is public/safe — RLS protects data).

## 6. Supabase schema (see `supabase/migrations/`)

- `customers` — name, phone, email, address, town, property_type, source, notes
- `jobs` — one row per kanban card; `status` enum: new_lead → contacted_quoted →
  scheduled → in_progress → completed → invoiced → paid (+ recurring, lost);
  service_type (bed_bug / sanitizing / inspection), quote_amount, final_amount,
  completed_date, notes
- `invoices` — billing + Hawaii GET (generated get_amount/total)
- `leads` — public website intake (anon can INSERT only; staff read/manage)
- `expenses` — date, label, category, type (one_time/monthly/yearly), amount
- `settings` — single row: monthly_revenue_goal, avg_job_value, get_rate
- Views: `get_tax_by_period`, `kanban_board`
- **RLS:** anonymous users can ONLY insert a lead. Everything else requires a
  signed-in staff user (Supabase Auth). Staff login: hello@atomicsteamers.com.

## 7. Admin dashboard (`/admin.html`)

Staff-only (Supabase Auth). Tabs:
- **Pipeline** — kanban board, drag-and-drop, cards show name/address/property/
  phone/email + Call/Text(SMS)/Email/Note/Set-amount actions.
- **Customers** — full list.
- **Money** — income (paid jobs) / expenses / **net profit** KPIs + monthly P&L +
  estimated GET owed.
- **Expenses** — add/list/delete (category, recurring type).
- **Goals** — set monthly revenue goal + avg job value → progress bar + "jobs
  needed to hit goal."
- **New Leads** — website intake; one-click "Add to Pipeline."
- **Training** — Optima XD employee course (PPE/decon, unload, setup, treat
  beds/mattresses/couches, boats, shutdown, storage).
- Income flows in when a job's **amount** is set and it's dragged to **Paid**.

## 8. Hawaii GET (General Excise Tax)

- Oahu rate **4.5%** base; businesses commonly pass on up to **4.712%** (the
  reimbursement is itself taxable). Stored per-invoice / in `settings.get_rate`.
- File **Form G-45** each period + **Form G-49** annually with Hawaii DOTAX.
- ⚠️ Not tax advice — confirm with a tax preparer.

## 9. Repo file map

```
index.html  styles.css  script.js        # public site
admin.html  admin.css   admin.js         # staff dashboard
supabase-config.js                        # Supabase URL + anon key (public-safe)
supabase/migrations/0001_init.sql         # customers/jobs/invoices/leads + RLS
supabase/migrations/0002_expenses_goals.sql
images/                                    # hero-bedroom, why-bedroom, oahu-waikiki
                                           # (stock); equip-panel, equip-machine,
                                           # steam-action (real Optima XD photos)
favicon.svg .ico -16/-32.png  apple-touch-icon.png
og-image.png (+ og-image.html source)     # social link preview
CNAME  robots.txt  sitemap.xml  .nojekyll  README.md
```

## 10. Open / recurring tasks

- Finish domain transfer Squarespace → Cloudflare (needs EPP/auth code).
- Replace sample testimonials with real reviews.
- Add more real job photos (treated mattress, bed bug close-up, team).
- Verify the Training course against the real Optima XD manual + OSHA before relying.

---

## How to work with me (owner preferences)

- **Be concise and direct. No fluff, no filler, no long preambles.** "Simple and
  to the point." Cut anything that isn't useful.
- **Be decisive — act, don't over-ask.** Make sensible defaults, do the work, push
  it, and tell me what you did in a few lines. Only ask when a choice genuinely
  changes the outcome.
- **I work from an iPad/phone and send screenshots.** Read images carefully — I'll
  often point out a problem with a photo instead of text.
- **Always commit AND push** to `main` and the dev branch after changes. Tell me to
  wait ~1 min and hard-refresh.
- **Verify before declaring done** — screenshot the page / sanity-check the code.
- **Never put founders' personal names on public-facing pages.**
- **Keep the green design.** Prefer real photos over stock.
- **Be honest about limits** (e.g., a separate Supabase account you can't reach, or
  browser-cache effects) instead of pretending it's fixed.
