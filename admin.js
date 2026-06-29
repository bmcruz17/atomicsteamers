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
    loadBoard(); loadCustomers(); loadMoney(); loadExpenses(); loadGoals(); loadLeads();
  }
  function refreshFinances() { loadMoney(); loadGoals(); }
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
      document.querySelectorAll(".view").forEach(function (sec) { sec.classList.add("hidden"); });
      show($("view-" + tab.dataset.view), true);
    });
  });

  // ---------- Pipeline board ----------
  function loadBoard() {
    db.from("jobs")
      .select("id,status,service_type,scheduled_date,quote_amount,final_amount,notes,updated_at,customer:customers(name,phone,email,address,town,property_type)")
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
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function fmtPhone(p) {
    var d = (p || "").replace(/[^0-9]/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length === 10) return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
    return p || "";
  }
  function telHref(p) { return (p || "").replace(/[^0-9+]/g, ""); }

  function cardHtml(j) {
    var c = j.customer || {};
    var svc = j.service_type || "";
    var tagClass = svc === "sanitizing" ? "tag--amber" : (svc === "inspection" ? "tag--blue" : "tag--green");
    var amt = j.final_amount != null ? j.final_amount : j.quote_amount;
    var ph = telHref(c.phone);
    var loc = [c.address, c.town].filter(Boolean).join(", ");
    var prop = c.property_type ? capitalize(c.property_type.replace(/_/g, " ")) : "";
    return '<div class="card" draggable="true" data-id="' + j.id + '">' +
      '<div class="card__top">' +
        '<div class="card__name">' + esc(c.name || "Unknown") + "</div>" +
        '<span class="tag ' + tagClass + '">' + esc(svc.replace("_", " ") || "bed bug") + "</span>" +
      "</div>" +
      (amt != null ? '<div class="card__money"><b>' + money(amt) + "</b></div>" : "") +
      '<div class="card__info">' +
        (loc ? '<div class="info" title="' + esc(loc) + '">📍 ' + esc(loc) + "</div>" : "") +
        (prop ? '<div class="info">🏠 ' + esc(prop) + "</div>" : "") +
        (c.phone ? '<div class="info">📞 ' + esc(fmtPhone(c.phone)) + "</div>" : "") +
        (c.email ? '<div class="info" title="' + esc(c.email) + '">✉️ ' + esc(c.email) + "</div>" : "") +
      "</div>" +
      '<div class="acts">' +
        (ph ? '<a class="iconbtn" href="tel:' + esc(ph) + '" title="Call">📞</a>' : "") +
        (ph ? '<a class="iconbtn" href="sms:' + esc(ph) + '" title="Text">💬</a>' : "") +
        (c.email ? '<a class="iconbtn" href="mailto:' + esc(c.email) + '" title="Email">✉️</a>' : "") +
        '<button class="iconbtn" data-note="' + j.id + '" title="Add note">📝</button>' +
        '<button class="iconbtn" data-price="' + j.id + '" title="Set job amount">💲</button>' +
        '<span class="spacer"></span>' +
        '<button class="iconbtn" data-move="prev" data-id="' + j.id + '" data-cur="' + j.status + '" title="Move left">←</button>' +
        '<button class="iconbtn" data-move="next" data-id="' + j.id + '" data-cur="' + j.status + '" title="Move right">→</button>' +
      "</div>" +
      (j.notes ? '<div class="note-line">📝 ' + esc(j.notes).slice(0, 70) + "</div>" : "") +
      (j.updated_at ? '<div class="note-line"><span class="pill pill--gray">updated ' + ago(j.updated_at) + "</span></div>" : "") +
      "</div>";
  }
  function setStatus(id, status) {
    var patch = { status: status };
    if (status === "completed" || status === "paid") patch.completed_date = new Date().toISOString();
    db.from("jobs").update(patch).eq("id", id).then(function (r) {
      if (r.error) alert(r.error.message); loadBoard(); refreshFinances();
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
    document.querySelectorAll("[data-price]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = window.prompt("Job amount ($):");
        if (v !== null && v !== "") db.from("jobs").update({ final_amount: Number(v) || 0 }).eq("id", b.dataset.price).then(function () { loadBoard(); refreshFinances(); });
      });
    });
  }

  // ---------- Add customer + job ----------
  function addJob(stage) {
    var name = window.prompt("Customer name:"); if (!name) return;
    var phone = window.prompt("Phone:") || null;
    var email = window.prompt("Email:") || null;
    var address = window.prompt("Street address:") || null;
    var town = window.prompt("Town (e.g. Honolulu):") || null;
    var allowed = ["home", "condo", "apartment", "rental", "hotel", "commercial", "other"];
    var prop = (window.prompt("Property — home / condo / apartment / rental / hotel / commercial:", "home") || "").trim().toLowerCase();
    if (allowed.indexOf(prop) < 0) prop = null;
    var svc = (window.prompt("Service — bed_bug / sanitizing / inspection:", "bed_bug") || "bed_bug").trim();
    db.from("customers").insert({ name: name, phone: phone, email: email, address: address, town: town, property_type: prop, source: "manual" }).select().single().then(function (r) {
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

  // ---------- Finance helpers ----------
  var GET_RATE = 0.04712;
  function jobAmt(j) { return Number(j.final_amount != null ? j.final_amount : (j.quote_amount || 0)) || 0; }
  function jobMonth(j) { var d = j.completed_date || j.updated_at; return d ? String(d).slice(0, 7) : ""; }
  function curMonth() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function sumVals(o) { var t = 0; Object.keys(o).forEach(function (k) { t += o[k]; }); return t; }

  // ---------- Money: KPIs + monthly P&L ----------
  function loadMoney() {
    Promise.all([
      db.from("jobs").select("final_amount,quote_amount,completed_date,updated_at,status").eq("status", "paid"),
      db.from("expenses").select("date,amount")
    ]).then(function (res) {
      var jobs = res[0].data || [], exps = res[1].data || [], cm = curMonth();
      var inc = {}, exp = {};
      jobs.forEach(function (j) { var m = jobMonth(j) || cm; inc[m] = (inc[m] || 0) + jobAmt(j); });
      exps.forEach(function (e) { var m = (e.date || "").slice(0, 7) || cm; exp[m] = (exp[m] || 0) + (Number(e.amount) || 0); });
      var allInc = sumVals(inc), allExp = sumVals(exp), incM = inc[cm] || 0, expM = exp[cm] || 0;
      function kpi(cls, label, val, sub) { return '<div class="kpi ' + cls + '"><div class="k-label">' + label + '</div><div class="k-val">' + val + '</div>' + (sub ? '<div class="k-sub">' + sub + '</div>' : '') + '</div>'; }
      $("moneyKpis").innerHTML =
        kpi("", "Income · this month", money(incM)) +
        kpi("", "Expenses · this month", money(expM)) +
        kpi(incM - expM >= 0 ? "pos" : "neg", "Net profit · month", money(incM - expM)) +
        kpi("accent", "Net profit · all-time", money(allInc - allExp), money(allInc) + " in · " + money(allExp) + " out") +
        kpi("", "Est. GET owed", money(allInc * GET_RATE), "on " + money(allInc) + " paid");
      var months = {}; Object.keys(inc).forEach(function (m) { months[m] = 1; }); Object.keys(exp).forEach(function (m) { months[m] = 1; });
      var keys = Object.keys(months).sort().reverse();
      if (!keys.length) { $("pnlTable").innerHTML = '<div class="empty">No paid jobs or expenses yet. Mark a job <b>Paid</b> in the pipeline to see income here.</div>'; return; }
      $("pnlTable").innerHTML = "<table><thead><tr><th>Month</th><th class='num'>Income</th><th class='num'>Expenses</th><th class='num'>Net profit</th></tr></thead><tbody>" +
        keys.map(function (m) { var i = inc[m] || 0, e = exp[m] || 0; return "<tr><td>" + m + "</td><td class='num'>" + money(i) + "</td><td class='num'>" + money(e) + "</td><td class='num'><b>" + money(i - e) + "</b></td></tr>"; }).join("") + "</tbody></table>";
    });
  }

  // ---------- Expenses ----------
  function loadExpenses() {
    db.from("expenses").select("*").order("date", { ascending: false }).then(function (r) {
      if (r.error) { $("expenseTable").innerHTML = '<div class="empty">' + esc(r.error.message) + "</div>"; return; }
      var rows = r.data || [];
      if (!rows.length) { $("expenseTable").innerHTML = '<div class="empty">No expenses logged yet.</div>'; return; }
      $("expenseTable").innerHTML = "<table><thead><tr><th>Date</th><th>Expense</th><th>Category</th><th>Type</th><th class='num'>Amount</th><th></th></tr></thead><tbody>" +
        rows.map(function (x) {
          return "<tr><td>" + esc(x.date) + "</td><td><b>" + esc(x.label) + "</b></td><td>" + esc(x.category || "—") +
            "</td><td>" + esc((x.type || "").replace("_", " ")) + "</td><td class='num'>" + money(x.amount) +
            "</td><td class='num'><button class='iconbtn' data-delx='" + x.id + "' title='Delete'>✕</button></td></tr>";
        }).join("") + "</tbody></table>";
      document.querySelectorAll("[data-delx]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (window.confirm("Delete this expense?")) db.from("expenses").delete().eq("id", b.dataset.delx).then(function () { loadExpenses(); loadMoney(); });
        });
      });
    });
  }
  $("expenseForm").addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target;
    var payload = { date: f.date.value || null, label: f.label.value.trim(), category: f.category.value.trim() || null, type: f.type.value, amount: Number(f.amount.value) || 0 };
    if (!payload.label) return;
    db.from("expenses").insert(payload).then(function (r) {
      if (r.error) { alert(r.error.message); return; }
      f.reset(); loadExpenses(); loadMoney();
    });
  });

  // ---------- Goals ----------
  function loadGoals() {
    Promise.all([
      db.from("settings").select("*").maybeSingle(),
      db.from("jobs").select("final_amount,quote_amount,completed_date,updated_at,status").eq("status", "paid")
    ]).then(function (res) {
      var s = res[0].data || {}, jobs = res[1].data || [], cm = curMonth();
      var gf = $("goalsForm");
      gf.monthly_revenue_goal.value = s.monthly_revenue_goal || "";
      gf.avg_job_value.value = s.avg_job_value || "";
      var incM = 0; jobs.forEach(function (j) { if ((jobMonth(j) || cm) === cm) incM += jobAmt(j); });
      var goal = Number(s.monthly_revenue_goal) || 0, avg = Number(s.avg_job_value) || 0;
      if (!goal) { $("goalsPanel").innerHTML = '<div class="empty">Set a monthly revenue goal above to see your progress and a job-count plan.</div>'; return; }
      var pct = Math.min(100, Math.round(incM / goal * 100)), remaining = Math.max(0, goal - incM);
      var need = avg > 0 ? Math.ceil(remaining / avg) : null;
      $("goalsPanel").innerHTML = '<div class="goalcard">' +
        '<div class="row"><span>This month’s income</span><b>' + money(incM) + '</b></div>' +
        '<div class="row"><span>Monthly goal</span><b>' + money(goal) + '</b></div>' +
        '<div class="progress"><div class="bar" style="width:' + pct + '%"></div></div>' +
        '<div class="row"><span>Progress</span><b>' + pct + '%</b></div>' +
        '<div class="row"><span>Still to go</span><b>' + money(remaining) + '</b></div>' +
        (need != null
          ? '<div class="row"><span>Jobs needed to hit goal (at ' + money(avg) + '/job)</span><span class="big-need">' + need + '</span></div>'
          : '<div class="row"><span>Add an average job value to see jobs needed</span><span></span></div>') +
        '</div>';
    });
  }
  $("goalsForm").addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target;
    db.from("settings").update({
      monthly_revenue_goal: Number(f.monthly_revenue_goal.value) || 0,
      avg_job_value: Number(f.avg_job_value.value) || 0,
      updated_at: new Date().toISOString()
    }).eq("id", true).then(function (r) {
      if (r.error) { alert(r.error.message); return; }
      loadGoals();
    });
  });

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
          (l.address ? '<div class="card__phone">📍 ' + esc(l.address) + "</div>" : "") +
          (l.message ? '<div class="note-line">💬 ' + esc(l.message).slice(0, 160) + "</div>" : "") +
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
    db.from("customers").insert({ name: lead.name, phone: lead.phone, email: lead.email, address: lead.address, town: lead.town, source: lead.source || "website" })
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
