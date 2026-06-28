// ---------------------------------------------------------------
//  Meta (Facebook) Pixel for Atomic Steamers
//  1) Get your Pixel ID: Meta Events Manager → Data Sources → your
//     pixel → Settings → "Dataset ID / Pixel ID" (a long number).
//  2) Paste it below in place of YOUR_PIXEL_ID. That's it — every page
//     fires PageView, and the inspection form fires a "Lead" event.
// ---------------------------------------------------------------
(function () {
  var PIXEL_ID = "YOUR_PIXEL_ID"; // <-- replace with your numeric Pixel ID
  if (!PIXEL_ID || PIXEL_ID === "YOUR_PIXEL_ID") return; // not set up yet

  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
})();
