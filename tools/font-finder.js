/* BAGARI Font Finder, the public page: the app's interface, sending to the studio.
 * The model runs at the studio for now, so "send for analysis" posts the image to
 * the site's Worker (/api/font-finder), which stores it and emails the studio;
 * the result goes back to the visitor by email. */
(function () {
  "use strict";

  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
  var MAX = 10 * 1024 * 1024;

  var form = $("ffForm"), zone = $("uploadZone"), fileInput = $("fileInput");
  var content = $("uploadContent"), preview = $("preview"), sendPanel = $("sendPanel");
  var btn = $("analyzeBtn"), errorBox = $("errorBox"), spinner = $("spinner"), done = $("donePanel");
  var langToggle = $("langToggle"), themeToggle = $("themeToggle");

  var file = null, widget = null, turnstileLoaded = false;

  /* ---------- language: the site's stored choice, else the browser's ---------- */
  function lang() { return root.getAttribute("data-lang") === "ka" ? "ka" : "en"; }
  function setLang(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l);
    langToggle.setAttribute("aria-label", l === "ka" ? "Switch to English" : "ქართულზე გადართვა");
    langToggle.querySelectorAll(".lt-opt").forEach(function (o) {
      if (o.getAttribute("data-lang-opt") === l) o.setAttribute("aria-current", "true"); else o.removeAttribute("aria-current");
    });
    try { localStorage.setItem("bagari-lang", l); } catch (e) {}
  }
  function initialLang() {
    try { var s = localStorage.getItem("bagari-lang"); if (s === "ka" || s === "en") return s; } catch (e) {}
    return (navigator.language || "").toLowerCase().indexOf("ka") === 0 ? "ka" : "en";
  }
  langToggle.addEventListener("click", function () { setLang(lang() === "ka" ? "en" : "ka"); });

  /* ---------- surface: Ink by default, Stone by the switch ("light" on the site too) ---------- */
  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function paintTheme() {
    var t = theme();
    themeToggle.querySelectorAll(".lt-opt").forEach(function (o) {
      if (o.getAttribute("data-theme-opt") === t) o.setAttribute("aria-current", "true"); else o.removeAttribute("aria-current");
    });
    themeToggle.setAttribute("aria-label", t === "dark"
      ? (lang() === "ka" ? "ქვის ფონზე გადართვა" : "Switch to stone")
      : (lang() === "ka" ? "მელნის ფონზე გადართვა" : "Switch to ink"));
  }
  themeToggle.addEventListener("click", function () {
    var next = theme() === "dark" ? "light" : "dark";
    if (next === "light") root.setAttribute("data-theme", "light"); else root.removeAttribute("data-theme");
    try { localStorage.setItem("bagari-theme", next); } catch (e) {}
    paintTheme();
    renderTurnstile(true);
  });

  /* ---------- choosing the image: click, keyboard, drag & drop, paste ---------- */
  zone.addEventListener("click", function () { fileInput.click(); });
  zone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", function () { if (fileInput.files[0]) setFile(fileInput.files[0]); });
  zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", function () { zone.classList.remove("drag-over"); });
  zone.addEventListener("drop", function (e) {
    e.preventDefault();
    zone.classList.remove("drag-over");
    var f = e.dataTransfer.files[0];
    if (f) setFile(f);
  });
  document.addEventListener("paste", function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image/") === 0) {
        var blob = items[i].getAsFile();
        if (blob) { setFile(new File([blob], "pasted.png", { type: blob.type })); break; }
      }
    }
  });

  function showError(kind) {
    errorBox.setAttribute("data-show", kind);
    errorBox.classList.remove("hidden");
  }
  function hideError() { errorBox.classList.add("hidden"); }

  function setFile(f) {
    hideError();
    if (TYPES.indexOf(f.type) < 0 || f.size > MAX) { showError("type"); return; }
    file = f;
    preview.src = URL.createObjectURL(f);
    preview.classList.remove("hidden");
    content.classList.add("hidden");
    sendPanel.classList.remove("hidden");
    done.classList.add("hidden");
    btn.classList.remove("hidden");
    btn.disabled = false;
    renderTurnstile(false);
  }

  /* ---------- Turnstile: rendered once the panel opens, in the page's surface ---------- */
  window.ffTurnstileReady = function () { turnstileLoaded = true; if (file) renderTurnstile(false); };
  function renderTurnstile(force) {
    if (!turnstileLoaded || !window.turnstile) return;
    if (widget !== null && !force) return;
    if (widget !== null) { try { window.turnstile.remove(widget); } catch (e) {} widget = null; }
    widget = window.turnstile.render("#turnstileBox", {
      sitekey: "0x4AAAAAAFBI1eAS8Nb8IKLS",
      action: "fontfinder",
      theme: theme() === "light" ? "light" : "dark"
    });
  }

  /* ---------- sending ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError();
    if (!file) return;
    if (!form.reportValidity()) return;

    var data = new FormData();
    data.append("image", file);
    data.append("email", $("ff-email").value.trim());
    data.append("name", $("ff-name").value.trim());
    data.append("note", $("ff-note").value.trim());
    data.append("lang", lang());
    data.append("cf-turnstile-response", widget !== null && window.turnstile ? (window.turnstile.getResponse(widget) || "") : "");

    btn.disabled = true;
    spinner.classList.remove("hidden");

    fetch("/api/font-finder", { method: "POST", body: data })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok) throw new Error("send failed");
        sendPanel.classList.add("hidden");
        btn.classList.add("hidden");
        done.classList.remove("hidden");
        done.scrollIntoView({ block: "center", behavior: "smooth" });
      })
      .catch(function () {
        showError("send");
        btn.disabled = false;
        if (widget !== null && window.turnstile) { try { window.turnstile.reset(widget); } catch (e) {} }
      })
      .then(function () { spinner.classList.add("hidden"); });
  });

  setLang(initialLang());
  paintTheme();
})();
