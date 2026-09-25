/* BAGARI Font Finder, the public page: the app's interface, analysing live.
 * "Analyze" posts the image to the site's Worker (/api/font-finder/analyze), which
 * checks Turnstile and relays it to the engine on the studio's server. The results
 * render with the app's own panels and wording. If the engine cannot be reached,
 * the form switches to the email route (/api/font-finder) instead. */
(function () {
  "use strict";

  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
  var MAX = 10 * 1024 * 1024;
  var LOW = 75;   /* OCR word confidence below which a word is marked uncertain */

  /* the app's result strings (georgian-font-finder/frontend/app.js) */
  var T = {
    en: {
      confidence: "Confidence: {p}%", alsoKnown: "Also known as: {list}",
      noteWords: "Averaged over {n} word crop and the full image", noteWords_pl: "Averaged over {n} word crops and the full image",
      noteWhole: "Classified from the whole image (no words detected)",
      ocrMeta: "OCR confidence {c}% · {n} word", ocrMeta_pl: "OCR confidence {c}% · {n} words",
      ocrFixed: "{n} corrected (dotted)", ocrLow: "{n} uncertain (dashed)", ocrOld: "read with the Old Georgian model",
      tipFixed: "OCR read “{orig}”, corrected from the dictionary", tipLow: "OCR confidence {c}%, check this word",
      noText: "(no text detected)",
      scripts: { Mkhedruli: "Mkhedruli", Mtavruli: "Mtavruli", Asomtavruli: "Asomtavruli", Nuskhuri: "Nuskhuri", Unknown: "Unknown" },
      note_from_font: "Inferred from the identified font", note_mtavruli_from_font: "Mkhedruli capitals, inferred from the identified font",
      note_no_georgian: "No Georgian characters recognised in the text", note_counts: "{n} of {total} Georgian characters",
      fixSame: "That is what the tool already read. Change only the words that are wrong.",
      fixMixed: "“{w}” mixes Georgian and Latin letters. Check the keyboard layout.",
      fixBig: "That changes most of the text. If the image really says this, press Send again.",
      fixSameFont: "That is the font the tool already named.",
      fixUnknownFont: "“{f}” is not one of the fonts the tool knows. If you are sure, press Send again."
    },
    ka: {
      confidence: "სანდოობა: {p}%", alsoKnown: "ასევე ცნობილია როგორც: {list}",
      noteWords: "საშუალო {n} სიტყვის ფრაგმენტზე და მთელ სურათზე",
      noteWhole: "კლასიფიცირებულია მთელი სურათით (სიტყვები ვერ მოიძებნა)",
      ocrMeta: "OCR სანდოობა {c}% · {n} სიტყვა",
      ocrFixed: "{n} შესწორებული (წერტილოვანი)", ocrLow: "{n} საეჭვო (წყვეტილი)", ocrOld: "წაკითხულია ძველი ქართულის მოდელით",
      tipFixed: "OCR-მა წაიკითხა „{orig}“, შესწორდა ლექსიკონით", tipLow: "OCR სანდოობა {c}%, გადაამოწმეთ ეს სიტყვა",
      noText: "(ტექსტი ვერ მოიძებნა)",
      scripts: { Mkhedruli: "მხედრული", Mtavruli: "მთავრული", Asomtavruli: "ასომთავრული", Nuskhuri: "ნუსხური", Unknown: "უცნობი" },
      note_from_font: "დადგენილია ამოცნობილი შრიფტით", note_mtavruli_from_font: "მხედრულის მთავრული ასოები, დადგენილია ამოცნობილი შრიფტით",
      note_no_georgian: "ტექსტში ქართული ასოები ვერ მოიძებნა", note_counts: "{n} {total}-დან ქართული ასოა",
      fixSame: "ინსტრუმენტმა ზუსტად ეს წაიკითხა. შეცვალეთ მხოლოდ არასწორი სიტყვები.",
      fixMixed: "„{w}“ ქართულ და ლათინურ ასოებს ურევს. შეამოწმეთ კლავიატურის ენა.",
      fixBig: "ეს ტექსტის უმეტეს ნაწილს ცვლის. თუ სურათზე მართლა ასე წერია, კიდევ ერთხელ დააჭირეთ გაგზავნას.",
      fixSameFont: "ინსტრუმენტმა სწორედ ეს შრიფტი დაასახელა.",
      fixUnknownFont: "„{f}“ არ არის იმ შრიფტებს შორის, რომლებსაც ინსტრუმენტი იცნობს. თუ დარწმუნებული ხართ, კიდევ ერთხელ დააჭირეთ გაგზავნას."
    }
  };

  var form = $("ffForm"), zone = $("uploadZone"), fileInput = $("fileInput");
  var content = $("uploadContent"), preview = $("preview"), checkBox = $("turnstileBox");
  var sendPanel = $("sendPanel"), btn = $("analyzeBtn"), errorBox = $("errorBox");
  var spinner = $("spinner"), results = $("results"), done = $("donePanel");
  var langToggle = $("langToggle"), themeToggle = $("themeToggle");

  var file = null, widget = null, turnstileLoaded = false, lastData = null;

  function lang() { return root.getAttribute("data-lang") === "ka" ? "ka" : "en"; }
  function t(key, p) {
    p = p || {};
    var d = T[lang()];
    var s = (p.n !== undefined && p.n !== 1 && d[key + "_pl"]) ? d[key + "_pl"] : (d[key] || T.en[key] || key);
    return s.replace(/\{(\w+)\}/g, function (_, k) { return p[k] !== undefined ? p[k] : ""; });
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* ---------- language: the site's stored choice, else the browser's ---------- */
  function setLang(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l);
    langToggle.setAttribute("aria-label", l === "ka" ? "Switch to English" : "ქართულზე გადართვა");
    try { localStorage.setItem("bagari-lang", l); } catch (e) {}
    paintTheme();
    if (lastData) showResults(lastData);
  }
  function initialLang() {
    try { var s = localStorage.getItem("bagari-lang"); if (s === "ka" || s === "en") return s; } catch (e) {}
    return (navigator.language || "").toLowerCase().indexOf("ka") === 0 ? "ka" : "en";
  }
  langToggle.addEventListener("click", function () { setLang(lang() === "ka" ? "en" : "ka"); });

  /* ---------- surface: black (Ink) by default; the tool keeps its own choice, apart from the site's ---------- */
  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function paintTheme() {
    var th = theme();
    /* the icon shows the surface you would move to, as on the main site */
    themeToggle.querySelector(".theme-icon-light").style.display = th === "dark" ? "block" : "none";
    themeToggle.querySelector(".theme-icon-dark").style.display = th === "dark" ? "none" : "block";
    themeToggle.setAttribute("aria-label", th === "dark"
      ? (lang() === "ka" ? "ქვის ფონზე გადართვა" : "Switch to stone")
      : (lang() === "ka" ? "მელნის ფონზე გადართვა" : "Switch to ink"));
  }
  themeToggle.addEventListener("click", function () {
    var next = theme() === "dark" ? "light" : "dark";
    if (next === "light") root.setAttribute("data-theme", "light"); else root.removeAttribute("data-theme");
    try { localStorage.setItem("bagari-ff-theme", next); } catch (e) {}
    paintTheme();
    if (widget !== null) renderTurnstile(true);
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

  function showError(kind) { errorBox.setAttribute("data-show", kind); errorBox.classList.remove("hidden"); }
  function hideError() { errorBox.classList.add("hidden"); }
  function setMode(m) { form.setAttribute("data-mode", m); }

  function setFile(f) {
    hideError();
    if (TYPES.indexOf(f.type) < 0 || f.size > MAX) { showError("type"); return; }
    file = f;
    lastData = null;
    ticket = "";
    resetFixes(false);
    preview.src = URL.createObjectURL(f);
    preview.classList.remove("hidden");
    content.classList.add("hidden");
    results.classList.add("hidden");
    done.classList.add("hidden");
    form.classList.remove("has-results");
    sendPanel.classList.add("hidden");
    setMode("analyze");
    checkBox.classList.remove("hidden");
    btn.classList.remove("hidden");
    btn.disabled = false;
    renderTurnstile(widget !== null);
  }

  /* ---------- Turnstile: explicit render, in the page's surface; one token per request ---------- */
  window.ffTurnstileReady = function () { turnstileLoaded = true; if (file) renderTurnstile(false); };
  function renderTurnstile(fresh) {
    if (!turnstileLoaded || !window.turnstile) return;
    if (widget !== null && !fresh) return;
    if (widget !== null) { try { window.turnstile.remove(widget); } catch (e) {} widget = null; }
    widget = window.turnstile.render("#turnstileBox", {
      sitekey: "0x4AAAAAAFBI1eAS8Nb8IKLS",
      action: "fontfinder",
      theme: theme() === "light" ? "light" : "dark",
      appearance: "interaction-only"
    });
  }
  function token() {
    return widget !== null && window.turnstile ? (window.turnstile.getResponse(widget) || "") : "";
  }

  /* ---------- results, rendered as the app renders them ---------- */
  function showResults(data) {
    lastData = data;
    var sc = data.script || {};
    $("scriptLabel").textContent = T[lang()].scripts[sc.label] || sc.label || "";
    var scPct = Math.round((sc.confidence || 0) * 100);
    $("scriptBar").style.width = scPct + "%";
    $("scriptConf").textContent = t("confidence", { p: scPct });
    $("scriptNote").textContent = sc.note_key ? t("note_" + sc.note_key, sc.note_params || {}) : (sc.note || "");

    var fn = data.font || {};
    $("fontLabel").textContent = fn.label || "";
    var fnPct = Math.round((fn.confidence || 0) * 100);
    $("fontBar").style.width = fnPct + "%";
    $("fontConf").textContent = fn.confidence > 0 ? t("confidence", { p: fnPct }) : "";
    $("uncertainBadge").classList.toggle("hidden", !fn.uncertain);
    $("fontAlias").textContent = fn.aliases && fn.aliases.length ? t("alsoKnown", { list: fn.aliases.join(", ") }) : "";
    $("fontNote").textContent = fn.note || (fn.words_used > 0 ? t("noteWords", { n: fn.words_used }) : t("noteWhole"));

    var scores = $("fontScores");
    if (fn.top && fn.top.length) {
      scores.innerHTML = fn.top.map(function (r) {
        var pct = Math.round(r.score * 100);
        var title = r.aliases && r.aliases.length ? ' title="' + esc(r.aliases.join(", ")) + '"' : "";
        return '<div class="score-row"><span class="name"' + title + ">" + esc(r.font) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + "%</span></div>";
      }).join("");
      scores.classList.remove("hidden");
    } else {
      scores.classList.add("hidden");
    }

    /* OCR: dictionary-corrected words dotted, low-confidence words dashed */
    var o = data.ocr || {};
    var ocr = $("ocrText");
    var renderWord = function (w) {
      if (w.orig) return '<span class="ocr-fixed" title="' + esc(t("tipFixed", { orig: w.orig })) + '">' + esc(w.text) + "</span>";
      if (w.conf < LOW) return '<span class="ocr-low" title="' + esc(t("tipLow", { c: Math.round(w.conf) })) + '">' + esc(w.text) + "</span>";
      return esc(w.text);
    };
    if (o.lines && o.lines.length) ocr.innerHTML = o.lines.map(function (line) { return line.map(renderWord).join(" "); }).join("\n");
    else ocr.textContent = data.ocr_text || t("noText");

    var flat = [].concat.apply([], o.lines || []);
    var lowCount = flat.filter(function (w) { return !w.orig && w.conf < LOW; }).length;
    var fixCount = flat.filter(function (w) { return w.orig; }).length;
    var meta = [];
    if (o.confidence != null) meta.push(t("ocrMeta", { c: Math.round(o.confidence), n: o.words }));
    if (fixCount) meta.push(t("ocrFixed", { n: fixCount }));
    if (lowCount) meta.push(t("ocrLow", { n: lowCount }));
    if (o.lang === "kat_old") meta.push(t("ocrOld"));
    $("ocrMeta").textContent = meta.join(" · ");

    form.classList.add("has-results");
    results.classList.remove("hidden");
  }

  /* ---------- corrections: a wrong typeface, a misread word ----------
   * Offered only with a ticket from the Worker, which proves this image was just
   * analysed there. The image and the fix are kept for review, never trained on unseen. */
  var ticket = "";
  var fixes = [$("fixFont"), $("fixText")];
  var fontListLoaded = false, knownFonts = {};

  /* ---------- sanity checks before a fix is sent ----------
   * A visitor can be wrong too: a Latin letter typed on the wrong keyboard layout,
   * the tool's own reading sent back unchanged, a font name with a typo. Hard errors
   * stop the send; doubtful ones ask for a second press. */
  var GEO = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/, LAT = /[A-Za-z]/;
  function norm(s) {
    /* Mtavruli folds to Mkhedruli, so a capitals-only reading equals its lowercase form */
    return String(s).replace(/[Ა-ᲺᲽ-Ჿ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xBC0);
    }).replace(/\s+/g, " ").trim();
  }
  function distance(a, b) {
    a = a.slice(0, 600); b = b.slice(0, 600);
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  /* returns { hard: message } or { soft: message } or null */
  function checkFix(kind, value) {
    if (kind === "text") {
      var ocr = norm($("ocrText").textContent), v = norm(value);
      if (v === ocr) return { hard: t("fixSame") };
      var mixed = v.split(" ").filter(function (w) { return GEO.test(w) && LAT.test(w); })[0];
      if (mixed) return { hard: t("fixMixed", { w: mixed }) };
      if (ocr && distance(ocr, v) > 0.6 * Math.max(ocr.length, v.length)) return { soft: t("fixBig") };
      return null;
    }
    var predicted = ((lastData && lastData.font && lastData.font.label) || "").toLowerCase();
    if (value.toLowerCase() === predicted) return { hard: t("fixSameFont") };
    if (fontListLoaded && Object.keys(knownFonts).length && !knownFonts[value.toLowerCase()]) return { soft: t("fixUnknownFont", { f: value }) };
    return null;
  }

  function loadFontList() {
    if (fontListLoaded) return;
    fontListLoaded = true;
    fetch("ff-fonts.json").then(function (r) { return r.json(); }).then(function (d) {
      var seen = {}, html = "";
      (d.fonts || []).forEach(function (f) {
        [f.n].concat(f.a || []).forEach(function (n) {
          if (!seen[n]) { seen[n] = 1; knownFonts[n.toLowerCase()] = n; html += '<option value="' + esc(n) + '"></option>'; }
        });
      });
      $("ffFontList").innerHTML = html;
    }).catch(function () { fontListLoaded = false; });
  }

  function resetFix(box, offered) {
    var open = box.querySelector(".fix-open");
    open.classList.toggle("hidden", !offered);
    open.setAttribute("aria-expanded", "false");
    box.querySelector(".fix-form").classList.add("hidden");
    box.querySelector(".fix-done").classList.add("hidden");
    box.querySelector(".fix-error").classList.add("hidden");
    box.querySelector(".fix-warn").classList.add("hidden");
    box.removeAttribute("data-confirmed");
    box.querySelector(".fix-send").disabled = false;
    if (box.id === "fixFont") box.classList.toggle("hidden", !offered);
  }
  function resetFixes(offered) { fixes.forEach(function (b) { resetFix(b, offered); }); }

  fixes.forEach(function (box) {
    var kind = box.getAttribute("data-kind");
    var open = box.querySelector(".fix-open"), formEl = box.querySelector(".fix-form");
    var input = box.querySelector(".fix-value"), sendBtn = box.querySelector(".fix-send");

    open.addEventListener("click", function () {
      var show = formEl.classList.contains("hidden");
      formEl.classList.toggle("hidden", !show);
      open.setAttribute("aria-expanded", show ? "true" : "false");
      box.querySelector(".fix-error").classList.add("hidden");
      if (!show) return;
      if (kind === "font") { loadFontList(); input.value = ""; }
      else input.value = $("ocrText").textContent;
      input.focus();
    });
    box.querySelector(".fix-cancel").addEventListener("click", function () {
      formEl.classList.add("hidden");
      open.setAttribute("aria-expanded", "false");
      open.focus();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (kind === "font" || e.ctrlKey || e.metaKey)) { e.preventDefault(); sendBtn.click(); }
    });

    sendBtn.addEventListener("click", function () {
      var value = input.value.trim();
      if (kind === "font" && knownFonts[value.toLowerCase()]) value = knownFonts[value.toLowerCase()];   /* the list's exact spelling */
      if (!value || !file || !ticket || !lastData) { input.focus(); return; }
      var warn = box.querySelector(".fix-warn");
      var issue = checkFix(kind, value);
      if (issue && (issue.hard || box.getAttribute("data-confirmed") !== value)) {
        warn.textContent = issue.hard || issue.soft;
        warn.classList.remove("hidden");
        if (issue.soft) box.setAttribute("data-confirmed", value);   /* a second press with the same value sends */
        input.focus();
        return;
      }
      warn.classList.add("hidden");
      box.removeAttribute("data-confirmed");
      sendBtn.disabled = true;
      box.querySelector(".fix-error").classList.add("hidden");
      var data = new FormData();
      data.append("image", file);
      data.append("ticket", ticket);
      data.append("kind", kind);
      data.append("value", value);
      data.append("predicted", (lastData.font && lastData.font.label) || "");
      data.append("ocr", $("ocrText").textContent);
      data.append("lang", lang());
      fetch("/api/font-finder/correct", { method: "POST", body: data })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (r) {
          if (!r || !r.ok) throw new Error("fix failed");
          formEl.classList.add("hidden");
          open.classList.add("hidden");
          box.querySelector(".fix-done").classList.remove("hidden");
        })
        .catch(function () {
          sendBtn.disabled = false;
          box.querySelector(".fix-error").classList.remove("hidden");
        });
    });
  });

  $("copyBtn").addEventListener("click", function () {
    var b = this;
    navigator.clipboard.writeText($("ocrText").textContent).then(function () {
      b.classList.add("is-alt");
      setTimeout(function () { b.classList.remove("is-alt"); }, 1500);
    });
  });

  /* ---------- the two requests ---------- */
  function goOffline() {
    setMode("send");
    sendPanel.classList.remove("hidden");
    $("ff-email").required = true;
    $("ff-consent").required = true;
    renderTurnstile(true);
    btn.disabled = false;
    sendPanel.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function analyze() {
    var data = new FormData();
    data.append("image", file);
    data.append("cf-turnstile-response", token());
    return fetch("/api/font-finder/analyze", { method: "POST", body: data })
      .then(function (r) { return r.json().catch(function () { return { ok: false, offline: true }; }); })
      .then(function (r) {
        if (r && r.ok && r.result) {
          ticket = r.ticket || "";
          showResults(r.result);
          resetFixes(!!ticket);
          (window.matchMedia("(min-width: 900px)").matches ? form : results).scrollIntoView({ block: "start", behavior: "smooth" });
          renderTurnstile(true);          /* a fresh token for the next image */
          btn.disabled = false;
        } else if (r && r.offline) {
          goOffline();
        } else {
          throw new Error(r && r.error || "failed");
        }
      });
  }

  function send() {
    var data = new FormData();
    data.append("image", file);
    data.append("email", $("ff-email").value.trim());
    data.append("name", $("ff-name").value.trim());
    data.append("note", $("ff-note").value.trim());
    data.append("lang", lang());
    data.append("cf-turnstile-response", token());
    return fetch("/api/font-finder", { method: "POST", body: data })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok) throw new Error("send failed");
        sendPanel.classList.add("hidden");
        checkBox.classList.add("hidden");
        btn.classList.add("hidden");
        done.classList.remove("hidden");
        done.scrollIntoView({ block: "center", behavior: "smooth" });
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError();
    if (!file) return;
    var sending = form.getAttribute("data-mode") === "send";
    if (sending && !form.reportValidity()) return;
    btn.disabled = true;
    spinner.classList.remove("hidden");
    (sending ? send() : analyze())
      .catch(function (e) {
        showError(e && e.message === "check" ? "check" : "send");
        btn.disabled = false;
        renderTurnstile(true);
      })
      .then(function () { spinner.classList.add("hidden"); });
  });

  setMode("analyze");
  setLang(initialLang());
})();
