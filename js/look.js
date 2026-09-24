/* BAGARI — "the look": the hero drawing blinks, looks around and follows the pointer.
 *
 * Four files drawn by Erekle on one artboard (brand/art/look-*.svg):
 *   look-rest.svg        brow, nose, lips, the profile line
 *   look-eye-open.svg    the open eye: lids, lashes, hatching, the tear
 *   look-eye-closed.svg  the same eye closed
 *   look-iris.svg        the iris, plus the window the artist cut in the paper
 *                        (#look-open), which clips the iris to the eye opening
 * Motion: the iris slides toward the pointer and wanders on its own; the
 * whole head leans a little with the pointer; the brow lifts when the pointer
 * is over the drawing; a blink swaps the open eye for the closed one.
 * Every line on screen is the ink as drawn.
 */
(function () {
  "use strict";

  var host = document.querySelector(".hero-art[data-art-rest]");
  if (!host || !window.fetch || !window.DOMParser) return;

  var NS = "http://www.w3.org/2000/svg";
  var reduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  var GAZE = { x: 18, y: 7 };            /* how far the iris may slide, drawing units */
  var LEAN = { x: 6, y: 4 };             /* how far the head follows the pointer */
  var BROW_LIFT = -7;                    /* brow rise while the pointer is on the drawing */
  var EYE_CENTRE = { x: 730, y: 566 };   /* middle of the iris at rest */
  var BROW_LIMIT = { bottom: 530, right: 1010 }; /* sub-paths of the rest layer above and left of this are the brow */

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function fetchSvg(url) {
    return fetch(url).then(function (r) {
      return r.ok ? r.text() : Promise.reject(r.status);
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
      if (!doc || doc.nodeName !== "svg") throw new Error("not svg");
      return doc;
    });
  }
  function shapesOf(svg) {
    var g = el("g", {});
    var nodes = svg.querySelectorAll("path, polygon, polyline, circle, ellipse, rect");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].closest("clipPath")) continue;
      var s = document.importNode(nodes[i], true);
      s.removeAttribute("style");
      s.removeAttribute("fill");
      g.appendChild(s);
    }
    /* keep a file-level transform (the rest layer carries one) */
    var wrap = svg.querySelector("svg > g[transform]");
    if (wrap) g.setAttribute("transform", wrap.getAttribute("transform"));
    return g;
  }

  /* ---- split a path's sub-paths into absolute-coordinate strings ---- */
  var ARGC = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  function subpaths(d) {
    var toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    var out = [], cur = "", i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
    function emit(s) { cur += s; }
    while (i < toks.length) {
      var t = toks[i];
      if (/[a-zA-Z]/.test(t)) { cmd = t; i++; if (/z/i.test(cmd)) { x = sx; y = sy; emit("Z"); continue; } }
      var n = ARGC[cmd.toLowerCase()], nums = toks.slice(i, i + n).map(Number); i += n;
      var C = cmd.toUpperCase(), rel = cmd !== C;
      if (C === "M") {
        if (rel) { x += nums[0]; y += nums[1]; } else { x = nums[0]; y = nums[1]; }
        sx = x; sy = y;
        if (cur) out.push(cur);
        cur = "M" + x + " " + y;
        cmd = rel ? "l" : "L";
      } else if (C === "L" || C === "T") {
        if (rel) { x += nums[0]; y += nums[1]; } else { x = nums[0]; y = nums[1]; }
        emit(C + x + " " + y);
      } else if (C === "H") { x = rel ? x + nums[0] : nums[0]; emit("L" + x + " " + y); }
      else if (C === "V") { y = rel ? y + nums[0] : nums[0]; emit("L" + x + " " + y); }
      else if (C === "C" || C === "S" || C === "Q") {
        var pts = [];
        for (var k = 0; k < nums.length; k += 2) pts.push(rel ? x + nums[k] : nums[k], rel ? y + nums[k + 1] : nums[k + 1]);
        x = pts[pts.length - 2]; y = pts[pts.length - 1];
        emit(C + pts.join(" "));
      } else if (C === "A") {
        x = rel ? x + nums[5] : nums[5]; y = rel ? y + nums[6] : nums[6];
        emit("A" + nums.slice(0, 5).join(" ") + " " + x + " " + y);
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  /* the brow lives in the rest layer's compound path; lift it out so it can move */
  function splitBrow(restG, svg) {
    var brow = el("g", { id: "look-brow" });
    var probe = el("path", {}, svg);
    var paths = Array.prototype.slice.call(restG.querySelectorAll("path"));
    paths.forEach(function (p) {
      var keep = [], lift = [];
      subpaths(p.getAttribute("d")).forEach(function (s) {
        probe.setAttribute("d", s);
        var b = probe.getBBox();
        (b.y + b.height < BROW_LIMIT.bottom && b.x + b.width < BROW_LIMIT.right ? lift : keep).push(s);
      });
      if (!lift.length) return;
      if (keep.length) p.setAttribute("d", keep.join("")); else p.remove();
      el("path", { d: lift.join("") }, brow);
    });
    probe.remove();
    if (restG.hasAttribute("transform")) brow.setAttribute("transform", restG.getAttribute("transform"));
    return brow;
  }

  Promise.all([
    fetchSvg(host.getAttribute("data-art-rest")),
    fetchSvg(host.getAttribute("data-art-eye-open")),
    fetchSvg(host.getAttribute("data-art-eye-closed")),
    fetchSvg(host.getAttribute("data-art-iris"))
  ]).then(build).catch(function () { /* the CSS mask stays in place */ });

  function build(parts) {
    var restSrc = parts[0], openSrc = parts[1], closedSrc = parts[2], irisSrc = parts[3];
    var svg = el("svg", {
      "class": "look", viewBox: restSrc.getAttribute("viewBox"), "aria-hidden": "true",
      preserveAspectRatio: "xMaxYMax meet"
    });
    var defs = el("defs", {}, svg);
    var win = irisSrc.querySelector("clipPath");
    if (!win) return;
    var clip = document.importNode(win, true);
    clip.setAttribute("id", "look-open");
    defs.appendChild(clip);

    var head = el("g", { id: "look-head" }, svg);
    var rest = shapesOf(restSrc);
    rest.setAttribute("id", "look-rest");
    head.appendChild(rest);

    var frameOpen = el("g", { id: "look-frame-open" }, head);
    var irisWrap = el("g", { "clip-path": "url(#look-open)" }, frameOpen);
    var irisInner = el("g", { id: "look-iris" }, irisWrap);
    irisInner.appendChild(shapesOf(irisSrc));
    frameOpen.appendChild(shapesOf(openSrc));

    var frameClosed = el("g", { id: "look-frame-closed", visibility: "hidden" }, head);
    frameClosed.appendChild(shapesOf(closedSrc));

    host.appendChild(svg);
    var brow = splitBrow(rest, svg);
    head.insertBefore(brow, rest);
    host.classList.add("alive");
    fitToLayout();
    if (window.matchMedia) {
      window.matchMedia("(max-width: 720px)").addEventListener("change", fitToLayout);
    }
    if (!reduced.matches) animate(svg, { iris: irisInner, head: head, brow: brow, open: frameOpen, closed: frameClosed });

    function fitToLayout() {
      /* the phone layout keeps the drawing at the top instead of the bottom */
      var top = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
      svg.setAttribute("preserveAspectRatio", top ? "xMaxYMin meet" : "xMaxYMax meet");
    }
  }

  function animate(svg, parts) {
    var browBase = parts.brow.getAttribute("transform") || "";
    var state = {
      gaze: { x: 0, y: 0, tx: 0, ty: 0, k: 0.12 },
      lean: { x: 0, y: 0, tx: 0, ty: 0, k: 0.06 },
      brow: { x: 0, y: 0, tx: 0, ty: 0, k: 0.1 }
    };
    var ticking = false, visible = true, lastPointer = 0, over = false, closed = false;

    function screenCentre() {
      var pt = svg.createSVGPoint();
      pt.x = EYE_CENTRE.x; pt.y = EYE_CENTRE.y;
      var m = svg.getScreenCTM();
      return m ? pt.matrixTransform(m) : null;
    }
    function clamp1(v) { return Math.max(-1, Math.min(1, v)); }

    function look(clientX, clientY) {
      var c = screenCentre();
      if (!c) return;
      var dx = clamp1((clientX - c.x) / (window.innerWidth * 0.5));
      var dy = clamp1((clientY - c.y) / (window.innerHeight * 0.5));
      state.gaze.tx = dx * GAZE.x; state.gaze.ty = dy * GAZE.y; state.gaze.k = 0.12;
      state.lean.tx = dx * LEAN.x; state.lean.ty = dy * LEAN.y;
      tick();
    }
    function setBrow() {
      state.brow.ty = (over ? BROW_LIFT : 0) + (closed ? 3 : 0);
      tick();
    }

    function tick() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(step);
    }
    function ease(s) {
      s.x += (s.tx - s.x) * s.k;
      s.y += (s.ty - s.y) * s.k;
      return Math.abs(s.tx - s.x) > 0.02 || Math.abs(s.ty - s.y) > 0.02;
    }
    function step() {
      var busy = ease(state.gaze) | ease(state.lean) | ease(state.brow);
      parts.iris.setAttribute("transform", "translate(" + state.gaze.x.toFixed(2) + " " + state.gaze.y.toFixed(2) + ")");
      parts.head.setAttribute("transform", "translate(" + state.lean.x.toFixed(2) + " " + state.lean.y.toFixed(2) + ")");
      parts.brow.setAttribute("transform", "translate(" + state.brow.x.toFixed(2) + " " + state.brow.y.toFixed(2) + ") " + browBase);
      if (busy) requestAnimationFrame(step); else ticking = false;
    }

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      lastPointer = Date.now();
      look(e.clientX, e.clientY);
    }, { passive: true });
    svg.addEventListener("pointerenter", function () { over = true; setBrow(); });
    svg.addEventListener("pointerleave", function () { over = false; setBrow(); });

    /* idle: glances and slow drifts when nobody is pointing (always, on touch) */
    function wander() {
      if (visible && Date.now() - lastPointer > 3000) {
        var glance = Math.random() < 0.35;
        state.gaze.tx = (Math.random() * 2 - 1) * GAZE.x * (glance ? 1 : 0.5);
        state.gaze.ty = (Math.random() * 2 - 1) * GAZE.y * (glance ? 0.8 : 0.5);
        state.gaze.k = glance ? 0.3 : 0.05;
        state.lean.tx = state.gaze.tx * 0.15; state.lean.ty = state.gaze.ty * 0.15;
        tick();
      }
      setTimeout(wander, 1800 + Math.random() * 3200);
    }
    setTimeout(wander, 2500);

    /* ---- blink: swap the eye for a moment ---- */
    function setClosed(on) {
      closed = on;
      parts.open.setAttribute("visibility", on ? "hidden" : "visible");
      parts.closed.setAttribute("visibility", on ? "visible" : "hidden");
      setBrow();
    }
    function blink(again) {
      if (!visible || document.hidden) return schedule();
      setClosed(true);
      setTimeout(function () {
        setClosed(false);
        if (again) setTimeout(function () { blink(false); }, 170);
        else schedule();
      }, 110);
    }
    function schedule() {
      setTimeout(function () { blink(Math.random() < 0.2); }, 2200 + Math.random() * 4300);
    }
    schedule();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(svg);
    }

    /* for the studio */
    window.__look = { blink: function () { blink(false); }, look: look, closed: setClosed,
      brow: function (on) { over = !!on; setBrow(); } };
  }
})();
