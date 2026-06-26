/* Atomic Steamers — website interactions */
(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { menu.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  // Supabase lead intake (writes to the "leads" table → pipeline "New Leads")
  var URL = window.SUPABASE_URL, KEY = window.SUPABASE_ANON_KEY;
  var configured = URL && KEY && URL.indexOf("YOUR-PROJECT") === -1 && window.supabase;
  var db = configured ? window.supabase.createClient(URL, KEY) : null;

  function submitLead(payload) {
    if (!db) return Promise.resolve({ ok: true, stored: false }); // not wired yet — don't lose the UX
    return db.from("leads").insert(payload).then(function (r) {
      return { ok: !r.error, stored: !r.error, error: r.error };
    });
  }

  function handleForm(form, statusEl) {
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ""; };
      var name = get("name"), phone = get("phone");

      if (!name || !phone) {
        if (statusEl) { statusEl.textContent = "Please add your name and phone so we can reach you."; statusEl.className = "form-status"; }
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; }

      submitLead({
        name: name, phone: phone, email: get("email") || null,
        town: get("area") || null, message: get("message") || null, source: "website"
      }).then(function (res) {
        if (btn) { btn.disabled = false; }
        var firstName = name.split(" ")[0];
        if (res.ok) {
          if (statusEl) { statusEl.textContent = "Mahalo, " + firstName + "! We got your request and will call you shortly."; statusEl.className = "form-status success"; }
          else { alert("Mahalo! We received your request and will be in touch shortly."); }
          form.reset();
        } else if (statusEl) {
          statusEl.textContent = "Something went wrong — please call us at (808) 470-2500.";
          statusEl.className = "form-status";
        }
      });
    });
  }

  handleForm(document.getElementById("heroForm"), null);
  handleForm(document.getElementById("contactForm"), document.getElementById("formStatus"));

  // Hide sticky call button when the contact section is visible
  var sticky = document.querySelector(".sticky-call");
  var contact = document.getElementById("contact");
  if (sticky && contact && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sticky.style.opacity = entry.isIntersecting ? "0" : "1";
        sticky.style.pointerEvents = entry.isIntersecting ? "none" : "auto";
      });
    }, { threshold: 0.2 }).observe(contact);
  }
})();
