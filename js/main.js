// BAGARI — language toggle + reveal animations

(function () {
  var STORAGE_KEY = "bagari-lang";

  // ----- language -----
  function setLang(lang) {
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "ka" ? "ka" : "en");
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

  document.getElementById("langToggle").addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-lang");
    setLang(current === "ka" ? "en" : "ka");
  });

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
