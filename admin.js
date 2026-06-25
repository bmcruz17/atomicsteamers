/* Atomic Steamers — Admin dashboard logic (Supabase) */
(function () {
  "use strict";

  var URL = window.SUPABASE_URL, KEY = window.SUPABASE_ANON_KEY;
  var configured = URL && KEY && URL.indexOf("YOUR-PROJECT") === -1;
  var db = configured ? window.supabase.createClient(URL, KEY) : null;

  // Kanban columns in pipeline order [key, label]
  var STAGES = [
    ["new_lead", "New Leads"],
    ["contacted_quoted", "Contacted / Quoted"],
    ["scheduled", "Scheduled"],
    ["in_progress", "In Progress"],
    ["completed", "Completed"],
    ["invoiced", "Invoiced"],
    ["paid", "Paid"]
  ];
  var STAGE_KEYS = STAGES.map(function (s) { return s[0]; });

  var $ = function (id) { return document.getElementById(id); };
  function show(el, on) { if (el) el.classList[on ? "remove" : "add"]("hidden"); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ago(ts) {
    if (!ts) return "";
    var s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  // ---------- Auth ----------
  function refreshAuth() {
    if (!configured) {
      $("loginMsg").textContent = "Add your Supabase URL + anon key in supabase-config.js first.";
      $("loginMsg").className = "msg error"; return;
    }
    db.auth.getSession().then(function (r) {
      if (r.data.session) enterApp(r.data.session.user);
      else { show($("loginWrap"), true); show($("app"), false); }
    });
  }
  function enterApp(user) {
    show($("loginWrap"), false); show($("app"), true);
    $("whoami").textContent = user.email;
    loadBoard(); loadCustomers(); loadMoney(); loadLeads();
  }
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!configured) { refreshAuth(); return; }
    var msg = $("loginMsg"); msg.textContent = "Signing in…"; msg.className = "msg";
    db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value })
      .then(function (r) {
        if (r.error) { msg.textContent = r.error.message; msg.className = "msg error"; }
        else enterApp(r.data.user);
      });
  });
  $("logoutBtn").addEventListener("click", function () {
    db.auth.signOut().then(function () { show($("app"), false); show($("loginWrap"), true); });
  });

  // ---------- Tabs ----------
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      ["board", "customers", "money", "leads"].forEach(function (v) { show($("view-" + v), v === tab.dataset.view); });
    });
  });

  // ---------- Pipeline board ----------
  function loadBoard() {
    db.from("jobs")
      .select("id,status,service_type,scheduled_date,quote_amount,final_amount,notes,updated_at,customer:customers(name,phone,email,town)")
      .then(function (r) {
        if (r.error) { $("board").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
        renderBoard(r.data || []);
      });
  }
  function renderBoard(jobs) {
    var byStage = {}; STAGE_KEYS.forEach(function (k) { byStage[k] = []; });
    jobs.forEach(function (j) { if (byStage[j.status]) byStage[j.status].push(j); });
    $("board").innerHTML = STAGES.map(function (s) {
      var key = s[0], list = byStage[key];
      return '<div class="col"><div class="col__head"><span class="label"><span class="dot ' + key + '"></span>' + s[1] +
        '</span><span class="n">' + list.length + '</span></div><div class="col__body" data-stage="' + key + '">' +
        list.map(cardHtml).join("") +
        '<button class="add" data-add="' + key + '">+ Add</button></div></div>';
    }).join("");
    wireBoard();
  }
  function cardHtml(j) {
    var c = j.customer || {};
    var svc = j.service_type || "";
    var tagClass = svc === "sanitizing" ? "tag--amber" : (svc === "inspection" ? "tag--blue" : "tag--green");
    var amt = j.final_amount != null ? j.final_amount : j.quote_amount;
    var phone = c.phone || "";
    return '<div class="card" draggable="true" data-id="' + j.id + '">' +
      '<div class="card__name">' + esc(c.name || "Unknown") + "</div>" +
      '<div class="card__sub">' + esc(c.town || "Oahu") + "</div>" +
      '<span class="tag ' + tagClass + '">' + esc(svc.replace("_", " ") || "bed bug") + "</span>" +
      (amt != null ? '<div class="card__money"><b>' + money(amt) + "</b></div>" : "") +
      (phone ? '<div class="card__phone">📞 ' + esc(phone) + "</div>" : "") +
      '<div class="acts">' +
        (phone ? '<a class="iconbtn" href="tel:' + esc(phone) + '" title="Call">📞</a>' : "") +
        (c.email ? '<a class="iconbtn" href="mailto:' + esc(c.email) + '" title="Email">✉️</a>' : "") +
        '<button class="iconbtn" data-note="' + j.id + '" title="Add note">📝</button>' +
        '<span class="spacer"></span>' +
        '<button class="iconbtn" data-move="prev" data-id="' + j.id + '" data-cur="' + j.status + '" title="Move left">←</button>' +
        '<button class="iconbtn" data-move="next" data-id="' + j.id + '" data-cur="' + j.status + '" title="Move right">→</button>' +
      "</div>" +
      (j.notes ? '<div class="note-line">📝 ' + esc(j.notes).slice(0, 70) + "</div>" : "") +
      (j.updated_at ? '<div class="note-line"><span class="pill pill--gray">updated ' + ago(j.updated_at) + "</span></div>" : "") +
      "</div>";
  }
  function setStatus(id, status) {
    db.from("jobs").update({ status: status }).eq("id", id).then(function (r) {
      if (r.error) alert(r.error.message); loadBoard();
    });
  }
  function wireBoard() {
    var dragId = null;
    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("dragstart", function () { dragId = card.dataset.id; });
    });
    document.querySelectorAll(".col__body").forEach(function (body) {
      body.addEventListener("dragover", function (e) { e.preventDefault(); body.classList.add("dragover"); });
      body.addEventListener("dragleave", function () { body.classList.remove("dragover"); });
      body.addEventListener("drop", function (e) {
        e.preventDefault(); body.classList.remove("dragover");
        if (dragId) setStatus(dragId, body.dataset.stage); dragId = null;
      });
    });
    document.querySelectorAll("[data-move]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = STAGE_KEYS.indexOf(b.dataset.cur);
        var ni = b.dataset.move === "next" ? Math.min(i + 1, STAGE_KEYS.length - 1) : Math.max(i - 1, 0);
        if (ni !== i) setStatus(b.dataset.id, STAGE_KEYS[ni]);
      });
    });
    document.querySelectorAll("[data-note]").forEach(function (b) {
      b.addEventListener("click", function () {
        var note = window.prompt("Add a note to this job:");
        if (note) db.from("jobs").update({ notes: note }).eq("id", b.dataset.note).then(loadBoard);
      });
    });
    document.querySelectorAll("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () { addJob(b.dataset.add); });
    });
  }

  // ---------- Add customer + job ----------
  function addJob(stage) {
    var name = window.prompt("Customer name:"); if (!name) return;
    var phone = window.prompt("Phone:") || null;
    var town = window.prompt("Town (e.g. Honolulu):") || null;
    var svc = (window.prompt("Service — bed_bug / sanitizing / inspection:", "bed_bug") || "bed_bug").trim();
    db.from("customers").insert({ name: name, phone: phone, town: town, source: "manual" }).select().single().then(function (r) {
      if (r.error) { alert(r.error.message); return; }
      db.from("jobs").insert({ customer_id: r.data.id, service_type: svc, status: stage || "new_lead" }).then(function (jr) {
        if (jr.error) alert(jr.error.message); loadBoard(); loadCustomers();
      });
    });
  }
  $("addCustomerBtn").addEventListener("click", function () { addJob("new_lead"); });

  // ---------- Customers ----------
  function loadCustomers() {
    db.from("customers").select("*").order("created_at", { ascending: false }).then(function (r) {
      if (r.error) { $("customerTable").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
      var rows = r.data || [];
      if (!rows.length) { $("customerTable").innerHTML = '<div class="empty">No customers yet.</div>'; return; }
      $("customerTable").innerHTML = "<table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Town</th><th>Source</th></tr></thead><tbody>" +
        rows.map(function (c) {
          return "<tr><td><b>" + esc(c.name) + "</b></td><td>" + esc(c.phone || "—") + "</td><td>" +
            esc(c.email || "—") + "</td><td>" + esc(c.town || "—") + "</td><td>" + esc(c.source || "—") + "</td></tr>";
        }).join("") + "</tbody></table>";
    });
  }

  // ---------- Money (GET) ----------
  function loadMoney() {
    db.from("get_tax_by_period").select("*").then(function (r) {
      if (r.error) { $("moneyTable").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
      var rows = r.data || [];
      if (!rows.length) { $("moneyTable").innerHTML = '<div class="empty">No paid invoices yet.</div>'; return; }
      $("moneyTable").innerHTML = "<table><thead><tr><th>Period</th><th class='num'>Invoices</th><th class='num'>Gross income</th><th class='num'>GET collected</th></tr></thead><tbody>" +
        rows.map(function (t) {
          return "<tr><td>" + esc(t.period_month) + "</td><td class='num'>" + t.invoice_count +
            "</td><td class='num'>" + money(t.gross_income) + "</td><td class='num'>" + money(t.get_collected) + "</td></tr>";
        }).join("") + "</tbody></table>";
    });
  }

  // ---------- New Leads ----------
  function loadLeads() {
    db.from("leads").select("*").eq("processed", false).order("created_at", { ascending: false }).then(function (r) {
      if (r.error) { $("leadList").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
      renderLeads(r.data || []);
    });
  }
  function renderLeads(leads) {
    var tab = document.querySelector('.tab[data-view="leads"]');
    if (tab) tab.textContent = "New Leads" + (leads.length ? " (" + leads.length + ")" : "");
    if (!leads.length) { $("leadList").innerHTML = '<div class="empty">No new leads right now. 🌺</div>'; return; }
    $("leadList").innerHTML = '<div class="board"><div class="col" style="width:340px;min-width:340px;"><div class="col__body" style="padding:.6rem;">' +
      leads.map(function (l) {
        return '<div class="card" style="cursor:default;">' +
          '<div class="card__name">' + esc(l.name) + "</div>" +
          '<div class="card__sub">' + esc([l.town, l.service_type].filter(Boolean).join(" · ") || "website") + "</div>" +
          (l.phone ? '<div class="card__phone">📞 ' + esc(l.phone) + "</div>" : "") +
          (l.email ? '<div class="card__phone">✉️ ' + esc(l.email) + "</div>" : "") +
          (l.message ? '<div class="note-line">💬 ' + esc(l.message).slice(0, 120) + "</div>" : "") +
          '<div class="acts"><span class="pill pill--gray">' + ago(l.created_at) + '</span><span class="spacer"></span>' +
          '<button class="btn btn--green btn--sm" data-convert="' + l.id + '">→ Add to Pipeline</button></div>' +
          "</div>";
      }).join("") + "</div></div></div>";
    document.querySelectorAll("[data-convert]").forEach(function (b) {
      b.addEventListener("click", function () { convertLead(b.dataset.convert, leads); });
    });
  }
  function mapService(s) {
    s = (s || "").toLowerCase();
    if (s.indexOf("sanit") > -1) return "sanitizing";
    if (s.indexOf("inspect") > -1) return "inspection";
    return "bed_bug";
  }
  function convertLead(id, leads) {
    var lead = leads.filter(function (l) { return l.id === id; })[0]; if (!lead) return;
    db.from("customers").insert({ name: lead.name, phone: lead.phone, email: lead.email, town: lead.town, source: lead.source || "website" })
      .select().single().then(function (r) {
        if (r.error) { alert(r.error.message); return; }
        db.from("jobs").insert({ customer_id: r.data.id, service_type: mapService(lead.service_type), status: "new_lead", description: lead.message })
          .then(function (jr) {
            if (jr.error) { alert(jr.error.message); return; }
            db.from("leads").update({ processed: true }).eq("id", id).then(function () { loadLeads(); loadBoard(); loadCustomers(); });
          });
      });
  }

  refreshAuth();
})();
