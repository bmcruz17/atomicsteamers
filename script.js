/* Atomic Steamers — interactions */
(function () {
  "use strict";

  // Current year in footer
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
    // Close menu when a link is tapped
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Lightweight form handling (no backend yet — see README for wiring options)
  function handleForm(form, statusEl) {
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector('[name="name"]') || {}).value;
      var phone = (form.querySelector('[name="phone"]') || {}).value;

      if (!name || !phone) {
        if (statusEl) {
          statusEl.textContent = "Please add your name and phone so we can reach you.";
          statusEl.className = "form-status";
        }
        return;
      }

      // Placeholder behavior: confirm to the user. Wire to email/Formspree/etc. later.
      if (statusEl) {
        statusEl.textContent = "Mahalo, " + name.split(" ")[0] + "! We received your request and will call you shortly.";
        statusEl.className = "form-status success";
      } else {
        alert("Mahalo! We received your request and will be in touch shortly.");
      }
      form.reset();
    });
  }

  handleForm(document.getElementById("heroForm"), null);
  handleForm(document.getElementById("contactForm"), document.getElementById("formStatus"));

  // Hide sticky call button when the contact section is in view
  var sticky = document.querySelector(".sticky-call");
  var contact = document.getElementById("contact");
  if (sticky && contact && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sticky.style.opacity = entry.isIntersecting ? "0" : "1";
        sticky.style.pointerEvents = entry.isIntersecting ? "none" : "auto";
      });
    }, { threshold: 0.2 });
    obs.observe(contact);
  }
})();
