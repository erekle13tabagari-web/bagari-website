/* BAGARI — language, surface, menu, and the motion layer.
 *
 * The motion layer writes two things and decides nothing else:
 *   --p    on each [data-scrub] element: 0→1 as it crosses the viewport
 *   --vel  on :root: scroll velocity, normalised to roughly -1…1
 * CSS decides what those mean. Nothing here hijacks the scroll: native
 * scrolling, the keyboard, the scrollbar and assistive tech are untouched.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  /* ---------- language ---------- */
  var LANG_KEY = "bagari-lang";
  var langToggle = document.getElementById("langToggle");
  var menuToggle = document.getElementById("menuToggle");
  var toTop = document.getElementById("toTop");

  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "ka" ? "ka" : "en");
    /* the switch names the language you would move to, in its own script */
    langToggle.setAttribute(
      "aria-label",
      lang === "ka" ? "Switch to English" : "ქართულზე გადართვა"
    );
    /* both are declared below, so the first call — before they exist — skips them */
    if (toTop) paintToTop();
    if (menuToggle) paintMenuLabel();
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  function initialLang() {
    try {
      var stored = localStorage.getItem(LANG_KEY);
      if (stored === "ka" || stored === "en") return stored;
    } catch (e) {}
    return (navigator.language || "").toLowerCase().indexOf("ka") === 0 ? "ka" : "en";
  }

  setLang(initialLang());
  langToggle.addEventListener("click", function () {
    setLang(root.getAttribute("data-lang") === "ka" ? "en" : "ka");
  });

  /* ---------- surface: Ink by default, Stone as the alternate ---------- */
  var THEME_KEY = "bagari-theme";
  var themeToggle = document.getElementById("themeToggle");
  /* Ink unless the reader has asked for Stone. The stylesheet commits the
     same way, so the OS preference is deliberately not consulted here. */
  function effectiveTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function paintTheme() {
    var now = effectiveTheme();
    /* the icon shows the surface you would move to */
    var light = themeToggle.querySelector(".theme-icon-light");
    var dark = themeToggle.querySelector(".theme-icon-dark");
    light.style.display = now === "dark" ? "block" : "none";
    dark.style.display = now === "dark" ? "none" : "block";
  }

  paintTheme();
  themeToggle.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    paintTheme();
  });

  /* ---------- the phone menu ---------- */
  var menuPanel = document.getElementById("menuPanel");

  function paintMenuLabel() {
    var ka = root.getAttribute("data-lang") === "ka";
    var open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute(
      "aria-label",
      ka ? (open ? "მენიუს დახურვა" : "მენიუ") : (open ? "Close menu" : "Menu")
    );
  }

  function setMenu(open) {
    root.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    paintMenuLabel();
  }

  paintMenuLabel();
  menuToggle.addEventListener("click", function () {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  Array.prototype.forEach.call(menuPanel.querySelectorAll(".site-nav a"), function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  if (window.matchMedia) {
    var wide = window.matchMedia("(min-width: 721px)");
    if (wide.addEventListener) {
      wide.addEventListener("change", function (m) { if (m.matches) setMenu(false); });
    }
  }

  /* ---------- back to top ---------- */
  function paintToTop() {
    toTop.setAttribute(
      "aria-label",
      root.getAttribute("data-lang") === "ka" ? "დასაწყისში დაბრუნება" : "Back to top"
    );
  }
  paintToTop();

  /* ---------- reveals ----------
   * One observer for everything that just needs to know it has arrived.
   * Unobserved once seen: a reveal that replays on every pass is a tic. */
  var revealables = document.querySelectorAll(".rv, .wipe");

  if (!("IntersectionObserver" in window) || reduced.matches) {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add("is-in"); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        seen.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
    Array.prototype.forEach.call(revealables, function (el) { seen.observe(el); });
  }

  /* ---------- the scrub loop ----------
   * One rAF loop for the whole page, reading layout once per frame and only
   * while something is actually on screen. Elements register themselves by
   * carrying [data-scrub]; an observer keeps the active set small so a long
   * page costs the same as a short one. */
  var scrubs = Array.prototype.slice.call(document.querySelectorAll("[data-scrub]"));
  var active = [];
  var lastY = window.scrollY;
  var vel = 0;
  var running = false;

  function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }

  function measure(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var p;
    if (el.getAttribute("data-scrub-range") === "hero") {
      /* The hero drawing is the first thing anyone sees, and a half-drawn
         eye on load reads as a broken image rather than an idea. So it
         arrives nearly complete and the scroll only finishes it; the real
         demonstration of the scroll drawing the ink is the studio drawing
         further down, where the reader is already scrolling and can watch
         it happen. */
      var gone = clamp(-r.top / Math.max(r.height, 1), 0, 1);
      p = clamp(0.78 + gone * 1.2, 0, 1);
    } else {
      /* everything else: 0 as the top edge enters, 1 once it is a third up */
      p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
    }
    el.style.setProperty("--p", p.toFixed(4));
  }

  function frame() {
    var y = window.scrollY;
    /* velocity, smoothed and normalised — CSS uses it to lean the marquee */
    vel += ((y - lastY) / 28 - vel) * 0.18;
    lastY = y;
    if (Math.abs(vel) < 0.002) vel = 0;
    root.style.setProperty("--vel", clamp(vel, -1.6, 1.6).toFixed(3));

    for (var i = 0; i < active.length; i++) measure(active[i]);

    if (active.length || vel !== 0) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function start() {
    if (running) return;
    running = true;
    lastY = window.scrollY;
    requestAnimationFrame(frame);
  }

  if (!reduced.matches && "IntersectionObserver" in window) {
    var onScreen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var i = active.indexOf(entry.target);
        if (entry.isIntersecting && i === -1) active.push(entry.target);
        else if (!entry.isIntersecting && i !== -1) active.splice(i, 1);
      });
      if (active.length) start();
    }, { rootMargin: "20% 0px" });

    scrubs.forEach(function (el) {
      el.style.setProperty("--p", "0");
      onScreen.observe(el);
    });

    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("resize", start, { passive: true });
    start();
  } else {
    /* reduced motion, or no observer: the drawings are simply there */
    scrubs.forEach(function (el) { el.style.setProperty("--p", "1"); });
  }

  /* ---------- the work carousel ----------
   * Touch scrolls it natively (with snap); a mouse drags it. The cards are
   * cloned into COPIES sets with the real ones in the middle, and whenever the
   * track comes to rest it is moved back to the equivalent position in the
   * middle set. The move lands on an identical card, so it cannot be seen,
   * and the loop never runs out in either direction. */
  Array.prototype.forEach.call(document.querySelectorAll("[data-carousel]"), function (carousel) {
    var track = carousel.querySelector(".work-track");
    var originals = Array.prototype.slice.call(track.children);
    if (!originals.length) return;
    var COPIES = 7, MIDDLE = 3;

    for (var c = 0; c < COPIES; c++) {
      if (c === MIDDLE) { originals.forEach(function (o) { track.appendChild(o); }); continue; }
      originals.forEach(function (o) {
        var copy = o.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.classList.add("is-clone");
        Array.prototype.forEach.call(copy.querySelectorAll("a, button, [tabindex]"), function (f) {
          f.setAttribute("tabindex", "-1");
        });
        track.appendChild(copy);
      });
    }
    var cards = Array.prototype.slice.call(track.children);
    var n = originals.length;

    function posOf(card) {
      var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      return card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - pad;
    }
    function metrics() {
      var base = posOf(cards[MIDDLE * n]);
      return { base: base, set: posOf(cards[(MIDDLE + 1) * n]) - base, step: posOf(cards[1]) - posOf(cards[0]) };
    }
    function jump(x) {
      track.style.scrollBehavior = "auto";
      track.scrollLeft = x;
      track.style.scrollBehavior = "";
    }
    function recentre() {
      var m = metrics(), x = track.scrollLeft;
      if (m.set <= 0) return;
      var off = ((x - m.base) % m.set + m.set) % m.set;
      if (Math.abs(m.base + off - x) > 1) jump(m.base + off);
    }
    jump(metrics().base);

    var dragging = false, settleTimer = 0;
    function settle() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () { if (!dragging) recentre(); }, 140);
    }
    track.addEventListener("scroll", settle, { passive: true });

    var resizeTimer = 0, lastWidth = track.clientWidth;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (track.clientWidth === lastWidth) return;
        lastWidth = track.clientWidth;
        jump(metrics().base);
      }, 150);
    });

    /* mouse drag; touch and pen keep the browser's own swipe */
    var startX = 0, lastX = 0, lastT = 0, vel = 0, moved = false, pointerId = null, swallowClick = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX; lastT = e.timeStamp; vel = 0; moved = false;
    });
    track.addEventListener("pointermove", function (e) {
      if (e.pointerId !== pointerId) return;
      if (!moved) {
        if (Math.abs(e.clientX - startX) < 5) return;
        moved = dragging = true;
        track.classList.add("dragging");
        track.setPointerCapture(pointerId);
      }
      var dx = e.clientX - lastX, dt = Math.max(1, e.timeStamp - lastT);
      track.scrollLeft -= dx;
      vel = vel * 0.6 + (dx / dt) * 0.4;
      lastX = e.clientX; lastT = e.timeStamp;
    });
    function release(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (!moved) return;
      dragging = false;
      swallowClick = true;
      setTimeout(function () { swallowClick = false; }, 60);
      recentre();
      var m = metrics();
      /* a flick goes on to the next card in its direction, never further;
         a slow drag settles on whichever card is nearest */
      var at = (track.scrollLeft - m.base) / m.step;
      var i = Math.abs(vel) > 0.3 ? (vel < 0 ? Math.ceil(at) : Math.floor(at)) : Math.round(at);
      track.classList.remove("dragging");
      track.scrollTo({ left: m.base + i * m.step, behavior: reduced.matches ? "auto" : "smooth" });
    }
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    track.addEventListener("click", function (e) {
      if (swallowClick) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    track.addEventListener("dragstart", function (e) { e.preventDefault(); });
  });

  /* ---------- scrollbar: shown only while the pointer is on it ----------
   * Chromium reports mouse movement over the page scrollbar to the document,
   * with clientX past the content width; that is the only hover signal the
   * strip gives. A held button keeps it shown while the thumb is dragged. */
  var sbHide = 0;
  var sbSheet = document.createElement("style");
  sbSheet.media = "not all";
  sbSheet.textContent =
    "::-webkit-scrollbar-track{background:var(--ink)}" +
    "::-webkit-scrollbar-thumb{background:var(--redprint);border:2px solid var(--ink)}";
  document.head.appendChild(sbSheet);
  function showBar(on) {
    root.classList.toggle("sb-show", on);
    sbSheet.media = on ? "all" : "not all";
  }
  document.addEventListener("mousemove", function (e) {
    var onBar = e.clientX >= root.clientWidth - 1 && root.scrollHeight > root.clientHeight;
    if (onBar || (e.buttons && root.classList.contains("sb-show"))) {
      clearTimeout(sbHide);
      if (!root.classList.contains("sb-show")) showBar(true);
    } else if (root.classList.contains("sb-show")) {
      clearTimeout(sbHide);
      sbHide = setTimeout(function () { showBar(false); }, 350);
    }
  }, { passive: true });
  document.addEventListener("mouseleave", function () {
    clearTimeout(sbHide);
    sbHide = setTimeout(function () { showBar(false); }, 350);
  });

  /* ---------- show the back-to-top past the first screen ---------- */
  /* at the end of the page the button would sit on the footer's last line,
     so it rises to stay just above the footer's bottom rule */
  var footerBase = document.querySelector(".footer-base");
  function liftToTop() {
    if (!toTop || !footerBase) return;
    var gap = 16;
    var buttonBottom = window.innerHeight - (parseFloat(getComputedStyle(toTop).bottom) || 0);
    var lift = buttonBottom - (footerBase.getBoundingClientRect().top - gap);
    toTop.style.transform = lift > 0 ? "translateY(" + (-lift).toFixed(1) + "px)" : "";
  }
  function onScroll() {
    var y = window.scrollY;
    root.classList.toggle("scrolled", y > 24);
    root.classList.toggle("show-top", y > window.innerHeight);
    liftToTop();
  }
  window.addEventListener("resize", liftToTop);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
