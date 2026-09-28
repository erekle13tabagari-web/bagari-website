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

  var file = null, sent = null, widget = null, turnstileLoaded = false, lastData = null;

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

  /* ---------- language and surface belong to the site (js/main.js runs the header
     switches); the tool only reads them: results are worded in the page's language,
     the bot check follows the surface ---------- */
  function theme() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

  /* ---------- choosing the image: click, keyboard, drag & drop, paste ---------- */
  zone.addEventListener("click", function () { if (!file) fileInput.click(); });
  zone.addEventListener("keydown", function (e) {
    if (!file && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
    fileInput.value = "";          /* the same file can be chosen again */
  });
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
    sent = null;
    lastData = null;
    ticket = "";
    resetFixes(false);
    if (preview.src) URL.revokeObjectURL(preview.src);
    canCrop = false;
    setSel(0, 0, 1, 1);
    preview.src = URL.createObjectURL(f);
    crop.classList.remove("hidden");
    cropBar.classList.remove("hidden");
    cropBar.querySelector(".note").classList.remove("hidden");
    zone.classList.add("has-image");
    zone.removeAttribute("role");
    zone.removeAttribute("tabindex");
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

  /* ---------- framing the text: a selection over the image, kept as fractions
     (left, top, right, bottom) so it survives any resize of the page ---------- */
  var crop = $("crop"), cropBox = $("cropBox"), cropBar = $("cropBar");
  var sel = { l: 0, t: 0, r: 1, b: 1 }, canCrop = false, drag = null;
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  cropBox.setAttribute("aria-label", lang() === "ka"
    ? "ანალიზის არე. ისრები გადაადგილებს, Shift და ისრები ზომას უცვლის."
    : "Area to analyse. Arrow keys move it, Shift and arrows resize it.");

  function isWhole() { return sel.l <= 0.005 && sel.t <= 0.005 && sel.r >= 0.995 && sel.b >= 0.995; }
  function setSel(l, t, r, b) {
    sel = { l: l, t: t, r: r, b: b };
    cropBox.style.left = l * 100 + "%";
    cropBox.style.top = t * 100 + "%";
    cropBox.style.width = (r - l) * 100 + "%";
    cropBox.style.height = (b - t) * 100 + "%";
    crop.classList.toggle("is-whole", isWhole());
  }

  preview.addEventListener("load", function () { canCrop = true; cropBox.classList.remove("hidden"); });
  preview.addEventListener("error", function () {
    /* a format this browser cannot draw (HEIC outside Safari): it is still analysed, whole */
    canCrop = false;
    crop.classList.add("hidden");
    cropBar.querySelector(".note").classList.add("hidden");
    content.classList.remove("hidden");
  });

  function point(e) {
    var r = crop.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1), w: r.width, h: r.height };
  }
  crop.addEventListener("pointerdown", function (e) {
    if (!canCrop || e.button > 0) return;
    e.preventDefault();
    var p = point(e), h = e.target.getAttribute && e.target.getAttribute("data-h");
    var kind = h ? "resize" : (e.target === cropBox && !isWhole() ? "move" : "draw");
    drag = { kind: kind, h: h || "", start: p, from: { l: sel.l, t: sel.t, r: sel.r, b: sel.b } };
    if (kind === "draw") setSel(p.x, p.y, p.x, p.y);
    crop.setPointerCapture(e.pointerId);
  });
  crop.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var p = point(e), f = drag.from, s = drag.start;
    var mw = 12 / p.w, mh = 12 / p.h;          /* at least 12 px on screen */
    if (drag.kind === "draw") {
      setSel(Math.min(s.x, p.x), Math.min(s.y, p.y), Math.max(s.x, p.x), Math.max(s.y, p.y));
    } else if (drag.kind === "move") {
      var dx = clamp(p.x - s.x, -f.l, 1 - f.r), dy = clamp(p.y - s.y, -f.t, 1 - f.b);
      setSel(f.l + dx, f.t + dy, f.r + dx, f.b + dy);
    } else {
      var h = drag.h, l = f.l, t = f.t, r = f.r, b = f.b;
      if (h.indexOf("w") >= 0) l = Math.min(p.x, r - mw);
      if (h.indexOf("e") >= 0) r = Math.max(p.x, l + mw);
      if (h.indexOf("n") >= 0) t = Math.min(p.y, b - mh);
      if (h.indexOf("s") >= 0) b = Math.max(p.y, t + mh);
      setSel(clamp(l, 0, 1), clamp(t, 0, 1), clamp(r, 0, 1), clamp(b, 0, 1));
    }
  });
  function endDrag(e) {
    if (!drag) return;
    var p = point(e);
    /* a click without a drag keeps the frame it had */
    if (drag.kind === "draw" && ((sel.r - sel.l) * p.w < 12 || (sel.b - sel.t) * p.h < 12)) {
      var f = drag.from;
      setSel(f.l, f.t, f.r, f.b);
    }
    drag = null;
  }
  crop.addEventListener("pointerup", endDrag);
  crop.addEventListener("pointercancel", endDrag);

  cropBox.addEventListener("keydown", function (e) {
    var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k || !canCrop) return;
    e.preventDefault();
    var st = 0.01, dx = k[0] * st, dy = k[1] * st;
    if (e.shiftKey) {
      setSel(sel.l, sel.t, clamp(sel.r + dx, sel.l + 0.02, 1), clamp(sel.b + dy, sel.t + 0.02, 1));
    } else {
      dx = clamp(dx, -sel.l, 1 - sel.r); dy = clamp(dy, -sel.t, 1 - sel.b);
      setSel(sel.l + dx, sel.t + dy, sel.r + dx, sel.b + dy);
    }
  });

  $("cropAll").addEventListener("click", function () { setSel(0, 0, 1, 1); });
  $("newImage").addEventListener("click", function () { fileInput.click(); });

  /* the image that is analysed: the framed part, at the photo's full resolution */
  function framed() {
    if (!canCrop || isWhole()) return Promise.resolve(file);
    var W = preview.naturalWidth, H = preview.naturalHeight;
    var sx = Math.round(sel.l * W), sy = Math.round(sel.t * H);
    var sw = Math.max(1, Math.round((sel.r - sel.l) * W)), sh = Math.max(1, Math.round((sel.b - sel.t) * H));
    var c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    var g = c.getContext("2d");
    g.fillStyle = "#fff";                         /* transparent PNGs read as black text on white */
    g.fillRect(0, 0, sw, sh);
    g.drawImage(preview, sx, sy, sw, sh, 0, 0, sw, sh);
    var type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    var blob = function (t, q) { return new Promise(function (ok) { c.toBlob(ok, t, q); }); };
    return blob(type, 0.95)
      .then(function (b) { return b && b.size <= MAX ? b : blob("image/jpeg", 0.9); })
      .then(function (b) {
        if (!b) return file;
        return new File([b], "framed." + (b.type === "image/png" ? "png" : "jpg"), { type: b.type });
      });
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

  /* ---------- the typeface: its name links to the font's page, and each match is
     shown in its own letters (the specimens from tools/fonts/), so the eye can
     compare them with the image; drawn again once the font list has arrived ---------- */
  function fontPage(name) {
    var f = fontIndex[String(name || "").toLowerCase()];
    return f && f.s ? f : null;
  }
  function specimen(f) {
    return '<span class="ink spec is-near" aria-hidden="true" style="--art:url(/tools/fonts/img/' + f.s +
      '-card.webp);aspect-ratio:' + f.r + ';--w:' + Math.round(f.r * 62) + '"></span>';
  }
  function renderFont(fn) {
    var main = fontPage(fn.label);
    $("fontLabel").innerHTML = main
      ? '<a href="fonts/' + main.s + '.html" target="_blank" rel="noopener">' + esc(fn.label) + "</a>"
      : esc(fn.label || "");
    var scores = $("fontScores");
    if (fn.top && fn.top.length) {
      scores.innerHTML = fn.top.map(function (r) {
        var pct = Math.round(r.score * 100);
        var f = fontPage(r.font);
        var title = r.aliases && r.aliases.length ? ' title="' + esc(r.aliases.join(", ")) + '"' : "";
        var name = f
          ? '<a class="name" href="fonts/' + f.s + '.html" target="_blank" rel="noopener"' + title + ">" + esc(r.font) + "</a>"
          : '<span class="name"' + title + ">" + esc(r.font) + "</span>";
        var spec = f ? '<a class="score-spec" href="fonts/' + f.s + '.html" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">' + specimen(f) + "</a>" : "";
        return '<div class="score-row">' + spec + name + '<span class="bar"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + "%</span></div>";
      }).join("");
      scores.classList.remove("hidden");
    } else {
      scores.classList.add("hidden");
    }
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
    var fnPct = Math.round((fn.confidence || 0) * 100);
    $("fontBar").style.width = fnPct + "%";
    $("fontConf").textContent = fn.confidence > 0 ? t("confidence", { p: fnPct }) : "";
    $("uncertainBadge").classList.toggle("hidden", !fn.uncertain);
    $("fontAlias").textContent = fn.aliases && fn.aliases.length ? t("alsoKnown", { list: fn.aliases.join(", ") }) : "";
    $("fontNote").textContent = fn.note || (fn.words_used > 0 ? t("noteWords", { n: fn.words_used }) : t("noteWhole"));

    renderFont(fn);

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
  var fontListLoaded = false, knownFonts = {}, fontIndex = {};

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
    fetch("/tools/ff-fonts.json").then(function (r) { return r.json(); }).then(function (d) {
      var seen = {}, html = "";
      (d.fonts || []).forEach(function (f) {
        [f.n].concat(f.a || []).forEach(function (n) {
          if (!seen[n]) { seen[n] = 1; knownFonts[n.toLowerCase()] = n; html += '<option value="' + esc(n) + '"></option>'; }
          fontIndex[n.toLowerCase()] = f;
        });
      });
      $("ffFontList").innerHTML = html;
      if (lastData && lastData.font) renderFont(lastData.font);
    }).catch(function () { fontListLoaded = false; });
  }

  function resetFix(box, offered) {
    var open = box.querySelector(".fix-open");
    open.classList.toggle("hidden", !offered);
    /* "that's right" needs an answer to agree with: a named font, or text that was read */
    var okOffered = offered && !!lastData && (box.id === "fixFont" ? !!(lastData.font && lastData.font.label) : !!String(lastData.ocr_text || "").trim());
    box.querySelector(".fix-ok").classList.toggle("hidden", !okOffered);
    box.querySelector(".fix-ok").disabled = false;
    box.querySelector(".fix-hint").classList.toggle("hidden", !offered);
    box.querySelector(".fix-ok-done").classList.add("hidden");
    open.setAttribute("aria-expanded", "false");
    box.querySelector(".fix-form").classList.add("hidden");
    box.querySelector(".fix-done").classList.add("hidden");
    box.querySelector(".fix-error").classList.add("hidden");
    box.querySelector(".fix-warn").classList.add("hidden");
    box.removeAttribute("data-confirmed");
    box.querySelector(".fix-send").disabled = false;
    if (box.id === "fixFont") box.classList.toggle("hidden", !offered);
  }
  /* a fix or a "that's right" for the image that was analysed; the ticket is bound to it */
  function postFix(kind, value) {
    var data = new FormData();
    data.append("image", sent || file);
    data.append("ticket", ticket);
    data.append("kind", kind);
    data.append("value", value);
    data.append("predicted", (lastData.font && lastData.font.label) || "");
    data.append("ocr", $("ocrText").textContent);
    data.append("lang", lang());
    return fetch("/api/font-finder/correct", { method: "POST", body: data })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (r) { if (!r || !r.ok) throw new Error("fix failed"); return r; });
  }

  function resetFixes(offered) { fixes.forEach(function (b) { resetFix(b, offered); }); }

  fixes.forEach(function (box) {
    var kind = box.getAttribute("data-kind");
    var open = box.querySelector(".fix-open"), formEl = box.querySelector(".fix-form");
    var input = box.querySelector(".fix-value"), sendBtn = box.querySelector(".fix-send");

    var okBtn = box.querySelector(".fix-ok"), hint = box.querySelector(".fix-hint");

    /* the visitor agrees with the tool: kept like a fix, with the tool's own answer as the value */
    okBtn.addEventListener("click", function () {
      if (!file || !ticket || !lastData) return;
      var value = kind === "font" ? (lastData.font && lastData.font.label) || "" : $("ocrText").textContent;
      if (!value.trim()) return;
      okBtn.disabled = true;
      box.querySelector(".fix-error").classList.add("hidden");
      postFix(kind + "-ok", value)
        .then(function () {
          okBtn.classList.add("hidden");
          open.classList.add("hidden");
          hint.classList.add("hidden");
          formEl.classList.add("hidden");
          box.querySelector(".fix-ok-done").classList.remove("hidden");
        })
        .catch(function () {
          okBtn.disabled = false;
          box.querySelector(".fix-error").classList.remove("hidden");
        });
    });

    open.addEventListener("click", function () {
      var show = formEl.classList.contains("hidden");
      formEl.classList.toggle("hidden", !show);
      hint.classList.toggle("hidden", show);      /* the form carries its own consent line */
      open.setAttribute("aria-expanded", show ? "true" : "false");
      box.querySelector(".fix-error").classList.add("hidden");
      if (!show) return;
      if (kind === "font") { loadFontList(); input.value = ""; }
      else input.value = $("ocrText").textContent;
      input.focus();
    });
    box.querySelector(".fix-cancel").addEventListener("click", function () {
      formEl.classList.add("hidden");
      hint.classList.remove("hidden");
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
      postFix(kind, value)
        .then(function () {
          formEl.classList.add("hidden");
          open.classList.add("hidden");
          okBtn.classList.add("hidden");
          hint.classList.add("hidden");
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
    return framed().then(function (f) {
    sent = f;                              /* corrections send exactly this image: the ticket is bound to it */
    var data = new FormData();
    data.append("image", f);
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
    });
  }

  function send() {
    return framed().then(function (f) {
    var data = new FormData();
    data.append("image", f);
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
  loadFontList();
})();
