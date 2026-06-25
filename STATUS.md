# Atomic Steamers — Daily Status

> **Last updated:** 2026-06-25 (manual)
> This is the daily handoff. The 1am routine refreshes it so the next day picks up
> where we left off. Read this top-to-bottom before starting work.

---

## 🔁 Daily routine (what the 1am job does)

1. **Health-check** the project (commands below) and update the snapshot.
2. **Re-stamp** the "Last updated" date at the top.
3. **Carry forward** open tasks; move anything finished to ✅ Done.
4. **Append** a dated line under "Daily log" noting what changed (or "no changes").
5. **Commit + push** to `main` and the dev branch.

Health-check commands (safe, read-only):
```bash
# Website is live + which build
curl -s -I https://atomicsteamers.com/ | grep -iE 'HTTP/|last-modified'
# Domain registry status (active vs hold/lock) + nameservers
curl -s 'https://rdap.verisign.com/com/v1/domain/atomicsteamers.com' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('status',d.get('status'));print('registrar',[e['vcardArray'][1][1][3] for e in d.get('entities',[]) if 'registrar' in e.get('roles',[])])"
# Email MX resolves (0 = OK)
curl -s 'https://dns.google/resolve?name=atomicsteamers.com&type=MX' | python3 -c "import sys,json;print('MX status',json.load(sys.stdin).get('Status'))"
```

---

## 🩺 Health snapshot

| Check | Last result |
|---|---|
| Website (atomicsteamers.com) | ✅ live (GitHub Pages, `main`) |
| Domain registry status | ✅ active — registrar still **Squarespace** (transfer pending) |
| Email (MX → Google) | ✅ resolving, mailbox working |
| Google Analytics | ✅ live (G-1HK43ZRDYP) |
| Supabase backend | ✅ connected (form → leads) |

---

## 🔴 Blocked / waiting on me (Brandon)

- [ ] **Finish domain transfer Squarespace → Cloudflare** — in Cloudflare → Domain
      Registration → Transfer Domains, enter the EPP/auth code; make sure Squarespace
      transfer lock is OFF. (Was showing "Ready for transfer.")
- [ ] **Run Supabase migration `0002_expenses_goals.sql`** (SQL Editor) — until then
      the dashboard **Expenses** and **Goals** tabs show a permissions error.
- [ ] **Create/confirm staff login** `hello@atomicsteamers.com` in Supabase →
      Authentication → Users, then sign in at `/admin.html`.
- [ ] **Delete the `__CONNECTION TEST__` row** in Supabase → Table Editor → `leads`.
- [ ] **Clear Safari cache / re-add the favorite** so the favicon shows the green atom.

## 🟡 In progress

- [ ] Replace the 3 **sample testimonials** with real customer reviews.
- [ ] Add more **real photos** (treated mattress, bed bug close-up, the team) — send
      them and they get placed + optimized.

## 🟢 Next up / backlog

- [ ] Verify the **Training course** against the real Optima XD manual + OSHA; edit to match SOPs.
- [ ] Confirm the **GET rate (4.712%)** with a tax preparer.
- [ ] Optional dashboard: per-category expense breakdown, true recurring expenses,
      expandable customer detail panel.
- [ ] More **service-area SEO** content (per-town sections/pages) once ranking starts.

## ✅ Done (recent)

- Site rebuilt: green theme, bed-bug focus, real phone (844-88-STEAM) + hello@ email,
  352°F hook, SEO (geo meta, FAQ + business schema, robots.txt, sitemap), favicon,
  social OG image, Google Analytics.
- GitHub Pages live on `main` at atomicsteamers.com; Cloudflare DNS (apex + www); email flowing.
- Supabase schema `0001` (customers/jobs/invoices/leads + RLS); website form → New Leads.
- Admin dashboard `/admin.html`: pipeline kanban (drag-drop, rich tiles, Call/Text/Email),
  Customers, Money (income/expense/net-profit + monthly P&L + est. GET), Expenses, Goals,
  New Leads (convert), Training course; logo links to homepage.
- Homepage photos: stock (hero/why/Waikiki) + **real Optima XD** (panel, crew on-site, steam).
- Project docs: knowledge file + custom-instructions block (`docs/`).

---

## 🗓️ Daily log

- **2026-06-25** — Created STATUS.md + 1am refresh routine. Site, domain, email, GA all healthy. Open items: domain transfer, run migration 0002, staff login, test-row cleanup, favicon cache.
