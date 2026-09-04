// BAGARI — language toggle + reveal animations

(function () {
  var STORAGE_KEY = "bagari-lang";

  // ----- language -----
  var toggle = document.getElementById("langToggle");

  function setLang(lang) {
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "ka" ? "ka" : "en");
    // the switcher names the language you'd switch to, in its own script
    toggle.setAttribute("aria-label", lang === "ka" ? "Switch to English" : "ქართულზე გადართვა");
    Array.prototype.forEach.call(toggle.querySelectorAll(".lt-opt"), function (opt) {
      if (opt.getAttribute("data-lang-opt") === lang) opt.setAttribute("aria-current", "true");
      else opt.removeAttribute("aria-current");
    });
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function initialLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ka" || stored === "en") return stored;
    } catch (e) {}
    var nav = (navigator.language || "").toLowerCase();
    return nav.indexOf("ka") === 0 ? "ka" : "en";
  }

  setLang(initialLang());

  toggle.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-lang");
    setLang(current === "ka" ? "en" : "ka");
  });

  // ----- the phone dropdown: nav, theme and language live here -----
  var menuToggle = document.getElementById("menuToggle");
  var menuPanel = document.getElementById("menuPanel");

  function setMenu(open) {
    document.documentElement.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  menuToggle.addEventListener("click", function () {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  // a nav link closes it; the switches do not, so their effect is visible
  Array.prototype.forEach.call(menuPanel.querySelectorAll(".site-nav a"), function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  // never leave it stuck open when the layout goes back to a desktop header
  if (window.matchMedia) {
    var wide = window.matchMedia("(min-width: 721px)");
    var onWide = function (m) { if (m.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
  }

  // ----- surface: Stone or Ink. System preference by default, the switch overrides. -----
  var THEME_KEY = "bagari-theme";
  var themeToggle = document.getElementById("themeToggle");
  var systemDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function effectiveTheme() {
    var set = document.documentElement.getAttribute("data-theme");
    if (set === "dark" || set === "light") return set;
    return systemDark && systemDark.matches ? "dark" : "light";
  }

  function paintTheme() {
    var theme = effectiveTheme();
    Array.prototype.forEach.call(themeToggle.querySelectorAll(".lt-opt"), function (opt) {
      if (opt.getAttribute("data-theme-opt") === theme) opt.setAttribute("aria-current", "true");
      else opt.removeAttribute("aria-current");
    });
    var lang = document.documentElement.getAttribute("data-lang");
    themeToggle.setAttribute("aria-label", theme === "dark"
      ? (lang === "ka" ? "ქვის ფონზე გადართვა" : "Switch to stone")
      : (lang === "ka" ? "მელნის ფონზე გადართვა" : "Switch to ink"));
  }

  themeToggle.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    paintTheme();
  });
  if (systemDark && systemDark.addEventListener) systemDark.addEventListener("change", paintTheme);
  paintTheme();

  // ----- signature moment: the hero drawing wipes on, once per session -----
  var SIG_KEY = "bagari-sig";
  var played = false;
  try { played = sessionStorage.getItem(SIG_KEY) === "1"; } catch (e) {}
  if (!played) {
    document.documentElement.classList.add("sig-play");
    try { sessionStorage.setItem(SIG_KEY, "1"); } catch (e) {}
  }

  // ----- reveal on scroll -----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }
})();
