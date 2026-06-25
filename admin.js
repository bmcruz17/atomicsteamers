/* Atomic Steamers — Admin dashboard logic (Supabase) */
(function () {
  "use strict";

  var URL = window.SUPABASE_URL, KEY = window.SUPABASE_ANON_KEY;
  var configured = URL && KEY && URL.indexOf("YOUR-PROJECT") === -1;
  var db = configured ? window.supabase.createClient(URL, KEY) : null;

  // Kanban columns in pipeline order
  var STAGES = [
    ["new_lead", "🆕 New Leads"],
    ["contacted_quoted", "📞 Contacted / Quoted"],
    ["scheduled", "📅 Scheduled"],
    ["in_progress", "🔧 In Progress"],
    ["completed", "✅ Completed"],
    ["invoiced", "🧾 Invoiced"],
    ["paid", "💰 Paid"],
    ["recurring", "🔁 Recurring"],
    ["lost", "🚫 Lost"]
  ];

  var $ = function (id) { return document.getElementById(id); };
  var loginWrap = $("loginWrap"), app = $("app");

  function show(el, on) { el.classList[on ? "remove" : "add"]("hidden"); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ---------- Auth ----------
  function refreshAuth() {
    if (!configured) {
      $("loginMsg").textContent = "Add your Supabase URL + anon key in supabase-config.js first.";
      $("loginMsg").className = "msg error";
      return;
    }
    db.auth.getSession().then(function (r) {
      var s = r.data.session;
      if (s) { enterApp(s.user); } else { show(loginWrap, true); show(app, false); }
    });
  }

  function enterApp(user) {
    show(loginWrap, false); show(app, true);
    $("whoami").textContent = user.email;
    loadBoard(); loadLeads(); loadTaxes();
  }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!configured) { refreshAuth(); return; }
    var msg = $("loginMsg"); msg.textContent = "Signing in…"; msg.className = "msg";
    db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value })
      .then(function (r) {
        if (r.error) { msg.textContent = r.error.message; msg.className = "msg error"; }
        else { enterApp(r.data.user); }
      });
  });

  $("logoutBtn").addEventListener("click", function () {
    db.auth.signOut().then(function () { show(app, false); show(loginWrap, true); });
  });

  // ---------- Tabs ----------
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      ["board", "leads", "taxes"].forEach(function (v) { show($("view-" + v), v === tab.dataset.view); });
    });
  });

  // ---------- Pipeline board ----------
  function loadBoard() {
    db.from("jobs")
      .select("id,status,service_type,scheduled_date,quote_amount,final_amount,tags,customer:customers(name,phone,town)")
      .then(function (r) {
        if (r.error) { $("board").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
        renderBoard(r.data || []);
      });
  }

  function renderBoard(jobs) {
    var byStage = {};
    STAGES.forEach(function (s) { byStage[s[0]] = []; });
    jobs.forEach(function (j) { (byStage[j.status] || (byStage[j.status] = [])).push(j); });

    var html = "";
    STAGES.forEach(function (s) {
      var key = s[0], list = byStage[key] || [];
      html += '<div class="col"><div class="col__head"><span>' + s[1] +
        '</span><span class="n">' + list.length + '</span></div>' +
        '<div class="col__body" data-stage="' + key + '">' +
        list.map(cardHtml).join("") + "</div></div>";
    });
    $("board").innerHTML = html;
    wireDnD();
  }

  function cardHtml(j) {
    var c = j.customer || {};
    var svc = j.service_type === "sanitizing" ? "sanitizing" : "";
    var amt = j.final_amount != null ? j.final_amount : j.quote_amount;
    var when = j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString() : null;
    return '<div class="jobcard ' + (svc ? "tag-sanitizing" : "") + '" draggable="true" data-id="' + j.id + '">' +
      '<span class="pill ' + svc + '">' + esc((j.service_type || "").replace("_", " ")) + "</span>" +
      "<h4>" + esc(c.name || "Unknown") + "</h4>" +
      '<div class="meta">' +
        (c.phone ? "<span>📞 " + esc(c.phone) + "</span>" : "") +
        (c.town ? "<span>📍 " + esc(c.town) + "</span>" : "") +
        (when ? "<span>📅 " + when + "</span>" : "") +
        (amt != null ? '<span class="amt">' + money(amt) + "</span>" : "") +
      "</div></div>";
  }

  function wireDnD() {
    var dragId = null;
    document.querySelectorAll(".jobcard").forEach(function (card) {
      card.addEventListener("dragstart", function () { dragId = card.dataset.id; });
    });
    document.querySelectorAll(".col__body").forEach(function (body) {
      body.addEventListener("dragover", function (e) { e.preventDefault(); body.classList.add("dragover"); });
      body.addEventListener("dragleave", function () { body.classList.remove("dragover"); });
      body.addEventListener("drop", function (e) {
        e.preventDefault(); body.classList.remove("dragover");
        if (!dragId) return;
        var newStage = body.dataset.stage;
        db.from("jobs").update({ status: newStage }).eq("id", dragId).then(function (r) {
          if (r.error) alert(r.error.message);
          loadBoard();
        });
        dragId = null;
      });
    });
  }

  // ---------- Leads inbox ----------
  function loadLeads() {
    db.from("leads").select("*").eq("processed", false).order("created_at", { ascending: false })
      .then(function (r) {
        if (r.error) { $("leadList").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
        renderLeads(r.data || []);
      });
  }

  function renderLeads(leads) {
    $("leadCount").textContent = leads.length;
    if (!leads.length) { $("leadList").innerHTML = '<div class="empty">No new leads right now. 🌺</div>'; return; }
    $("leadList").innerHTML = leads.map(function (l) {
      return '<div class="lead"><h4>' + esc(l.name) + "</h4>" +
        '<div class="meta">' +
          (l.phone ? "📞 " + esc(l.phone) + " &nbsp; " : "") +
          (l.email ? "✉️ " + esc(l.email) + " &nbsp; " : "") +
          (l.town ? "📍 " + esc(l.town) + " &nbsp; " : "") +
          (l.service_type ? "🧰 " + esc(l.service_type) : "") +
        "</div>" +
        (l.message ? "<p>" + esc(l.message) + "</p>" : "") +
        '<div class="actions"><button class="btn btn--sm" data-convert="' + l.id + '">→ Add to Pipeline</button></div>' +
        "</div>";
    }).join("");
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
    var lead = leads.filter(function (l) { return l.id === id; })[0];
    if (!lead) return;
    db.from("customers").insert({
      name: lead.name, phone: lead.phone, email: lead.email, town: lead.town, source: lead.source || "website"
    }).select().single().then(function (r) {
      if (r.error) { alert(r.error.message); return; }
      var customer = r.data;
      db.from("jobs").insert({
        customer_id: customer.id, service_type: mapService(lead.service_type),
        status: "new_lead", description: lead.message
      }).then(function (jr) {
        if (jr.error) { alert(jr.error.message); return; }
        db.from("leads").update({ processed: true }).eq("id", id).then(function () {
          loadLeads(); loadBoard();
        });
      });
    });
  }

  // ---------- Taxes ----------
  function loadTaxes() {
    db.from("get_tax_by_period").select("*").then(function (r) {
      if (r.error) { $("taxTable").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
      var rows = r.data || [];
      if (!rows.length) { $("taxTable").innerHTML = '<div class="empty">No paid invoices yet.</div>'; return; }
      $("taxTable").innerHTML = "<table><thead><tr><th>Period</th><th class='num'>Invoices</th>" +
        "<th class='num'>Gross income</th><th class='num'>GET collected</th></tr></thead><tbody>" +
        rows.map(function (t) {
          return "<tr><td>" + esc(t.period_month) + "</td><td class='num'>" + t.invoice_count +
            "</td><td class='num'>" + money(t.gross_income) + "</td><td class='num'>" + money(t.get_collected) + "</td></tr>";
        }).join("") + "</tbody></table>";
    });
  }

  refreshAuth();
})();
