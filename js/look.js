/* BAGARI — "the look": the hero drawing blinks and follows the pointer.
 *
 * Three files drawn by Erekle, all on one artboard (brand/art/look-*.svg):
 *   look-open.svg    the drawing with the eye open, iris removed
 *   look-iris.svg    the iris on its own, plus the eye-opening window the
 *                    artist cut in the paper (#look-open), used as its clip
 *   look-closed.svg  the same drawing with the eyelid closed
 * The iris sits under the open drawing, clipped to the window, and slides a
 * few units toward the pointer; a blink swaps the open frame for the closed
 * one for a moment. Every line on screen is the ink as drawn.
 */
(function () {
  "use strict";

  var host = document.querySelector(".hero-art[data-art-open]");
  if (!host || !window.fetch || !window.DOMParser) return;

  var NS = "http://www.w3.org/2000/svg";
  var reduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  var GAZE = { x: 7, y: 4 };            /* how far the iris may slide, in drawing units */
  var EYE_CENTRE = { x: 730, y: 566 };   /* middle of the iris at rest, drawing units */

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
    return g;
  }

  Promise.all([
    fetchSvg(host.getAttribute("data-art-open")),
    fetchSvg(host.getAttribute("data-art-iris")),
    fetchSvg(host.getAttribute("data-art-closed"))
  ]).then(build).catch(function () { /* the CSS mask stays in place */ });

  function build(parts) {
    var open = parts[0], irisSrc = parts[1], closed = parts[2];
    var vb = open.getAttribute("viewBox");
    var svg = el("svg", {
      "class": "look", viewBox: vb, "aria-hidden": "true",
      preserveAspectRatio: "xMaxYMax meet"
    });
    var defs = el("defs", {}, svg);

    /* the artist's window in the paper becomes the iris clip */
    var window_ = irisSrc.querySelector("clipPath");
    if (!window_) return;
    var clip = document.importNode(window_, true);
    clip.setAttribute("id", "look-open");
    defs.appendChild(clip);

    var frameOpen = el("g", { id: "look-frame-open" }, svg);
    var irisWrap = el("g", { "clip-path": "url(#look-open)" }, frameOpen);
    var iris = shapesOf(irisSrc);
    iris.setAttribute("id", "look-iris");
    irisWrap.appendChild(iris);
    frameOpen.appendChild(shapesOf(open));

    var frameClosed = el("g", { id: "look-frame-closed", visibility: "hidden" }, svg);
    frameClosed.appendChild(shapesOf(closed));

    host.appendChild(svg);
    host.classList.add("alive");
    fitToLayout();
    if (window.matchMedia) {
      window.matchMedia("(max-width: 720px)").addEventListener("change", fitToLayout);
    }
    if (!reduced.matches) animate(svg, iris, frameOpen, frameClosed);

    function fitToLayout() {
      /* the phone layout keeps the drawing at the top instead of the bottom */
      var top = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
      svg.setAttribute("preserveAspectRatio", top ? "xMaxYMin meet" : "xMaxYMax meet");
    }
  }

  function animate(svg, iris, frameOpen, frameClosed) {
    var cur = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    var ticking = false, visible = true, lastPointer = 0;

    /* ---- gaze ---- */
    function screenCentre() {
      var pt = svg.createSVGPoint();
      pt.x = EYE_CENTRE.x; pt.y = EYE_CENTRE.y;
      var m = svg.getScreenCTM();
      return m ? pt.matrixTransform(m) : null;
    }
    function look(clientX, clientY) {
      var c = screenCentre();
      if (!c) return;
      var dx = (clientX - c.x) / (window.innerWidth * 0.5);
      var dy = (clientY - c.y) / (window.innerHeight * 0.5);
      target.x = Math.max(-1, Math.min(1, dx)) * GAZE.x;
      target.y = Math.max(-1, Math.min(1, dy)) * GAZE.y;
      tick();
    }
    function tick() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(step);
    }
    function step() {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      iris.setAttribute("transform", "translate(" + cur.x.toFixed(2) + " " + cur.y.toFixed(2) + ")");
      if (Math.abs(target.x - cur.x) > 0.02 || Math.abs(target.y - cur.y) > 0.02) {
        requestAnimationFrame(step);
      } else {
        ticking = false;
      }
    }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      lastPointer = Date.now();
      look(e.clientX, e.clientY);
    }, { passive: true });

    /* idle: when nobody is pointing, the eye wanders a little on its own */
    function wander() {
      if (visible && Date.now() - lastPointer > 4000) {
        target.x = (Math.random() * 2 - 1) * GAZE.x * 0.7;
        target.y = (Math.random() * 2 - 1) * GAZE.y * 0.6;
        tick();
      }
      setTimeout(wander, 2500 + Math.random() * 3500);
    }
    setTimeout(wander, 3000);

    /* ---- blink: swap the frames for a moment ---- */
    function setClosed(on) {
      frameOpen.setAttribute("visibility", on ? "hidden" : "visible");
      frameClosed.setAttribute("visibility", on ? "visible" : "hidden");
    }
    function blink(again) {
      if (!visible || document.hidden) return schedule();
      setClosed(true);
      setTimeout(function () {
        setClosed(false);
        if (again) setTimeout(function () { blink(false); }, 180);
        else schedule();
      }, 120);
    }
    function schedule() {
      setTimeout(function () { blink(Math.random() < 0.2); }, 2500 + Math.random() * 4500);
    }
    schedule();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(svg);
    }

    /* for the studio: window.__look.blink(), window.__look.closed(true) */
    window.__look = { blink: function () { blink(false); }, look: look, closed: setClosed };
  }
})();
