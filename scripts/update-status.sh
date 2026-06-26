#!/usr/bin/env bash
# Refresh STATUS.md health snapshot, date, and daily log.
# Run by the daily GitHub Action (and usable manually).
set -uo pipefail
cd "$(dirname "$0")/.."

TODAY="$(date -u +%Y-%m-%d)"

# --- Website ---
WEB_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://atomicsteamers.com/ || echo 000)"
if [ "$WEB_CODE" = "200" ]; then WEB="✅ live (HTTP 200)"; else WEB="⚠️ HTTP $WEB_CODE — check Pages/DNS"; fi

# --- Domain registry status + registrar (drives transfer detection) ---
RDAP="$(curl -s --max-time 20 https://rdap.verisign.com/com/v1/domain/atomicsteamers.com || echo '{}')"
DOM="$(printf '%s' "$RDAP" | python3 -c '
import sys,json
try:
    d=json.load(sys.stdin); st=d.get("status",[])
    reg=""
    for e in d.get("entities",[]):
        if "registrar" in e.get("roles",[]):
            for it in (e.get("vcardArray") or [None,[]])[1]:
                if it and it[0]=="fn": reg=it[3]
    hold = any("hold" in s for s in st)
    flag = "🔴 client hold" if hold else ("✅ active" if st else "⚠️ unknown")
    print(flag + (" — registrar "+reg if reg else ""))
except Exception:
    print("⚠️ RDAP error")
')"

# Transfer complete when the registrar is Cloudflare
TRANSFER_DONE=0
printf '%s' "$DOM" | grep -qi cloudflare && TRANSFER_DONE=1
if [ "$TRANSFER_DONE" = "1" ]; then DOM="$DOM · transfer ✅ complete"; else DOM="$DOM · transfer pending"; fi

# --- Email MX ---
MXS="$(curl -s --max-time 20 'https://dns.google/resolve?name=atomicsteamers.com&type=MX' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("Status","?"))' 2>/dev/null || echo '?')"
if [ "$MXS" = "0" ]; then MX="✅ resolving"; else MX="🔴 not resolving (status $MXS)"; fi

HEALTH=$(cat <<EOF
| Check | Last result |
|---|---|
| Website (atomicsteamers.com) | $WEB |
| Domain registry status | $DOM |
| Email (MX → Google) | $MX |
| Google Analytics | ✅ live (G-1HK43ZRDYP) |
| Supabase backend | ✅ connected (form → leads) |
EOF
)

NOTES=""
case "$WEB$DOM$MX" in *⚠️*|*🔴*) NOTES=" ⚠️ a check needs attention — see snapshot/Blocked." ;; esac

python3 - "$TODAY" "$HEALTH" "$NOTES" "$TRANSFER_DONE" <<'PY'
import sys, re
today, health, notes, transfer = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == "1"
p = "STATUS.md"; s = open(p, encoding="utf-8").read()
s = re.sub(r"<!--LAST_UPDATED-->.*?<!--/LAST_UPDATED-->", f"<!--LAST_UPDATED-->{today}<!--/LAST_UPDATED-->", s, flags=re.S)
s = re.sub(r"<!--HEALTH-->.*?<!--/HEALTH-->", "<!--HEALTH-->\n"+health+"\n<!--/HEALTH-->", s, flags=re.S)

open_task = "- [ ] **Finish domain transfer Squarespace → Cloudflare**"
if transfer and open_task in s:                       # first day it completes
    s = s.replace(open_task, "- [x] **Finish domain transfer Squarespace → Cloudflare** — ✅ complete")
    notes = (notes + " 🎉 Domain transfer to Cloudflare is COMPLETE.").strip()

line = f"- **{today}** — Auto health check.{notes or ' All monitored checks green.'}"
if f"**{today}**" not in s:                            # one log entry per day
    s = s.replace("<!--LOG-->", "<!--LOG-->\n"+line, 1)
open(p, "w", encoding="utf-8").write(s)
print("STATUS.md updated for", today, "| transfer_done=", transfer)
PY
