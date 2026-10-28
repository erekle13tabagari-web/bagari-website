/* The chrome mark loops, so it gets a pause button, and it stays still for
 * visitors who ask for reduced motion. Without JS the page is complete as is. */
(function () {
  "use strict";
  var video = document.querySelector(".stage-video");
  var toggle = document.querySelector(".motion-toggle");
  if (!video || !toggle) return;

  var label = toggle.querySelector(".vh");
  var words = {
    pause: "ვიდეოს შეჩერება · Pause the video",
    play: "ვიდეოს ჩართვა · Play the video"
  };

  function paint() {
    var paused = video.paused;
    toggle.classList.toggle("is-paused", paused);
    label.textContent = paused ? words.play : words.pause;
  }

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) {
    video.removeAttribute("autoplay");
    video.pause();
  }

  toggle.addEventListener("click", function () {
    if (video.paused) {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      video.pause();
    }
  });
  video.addEventListener("play", paint);
  video.addEventListener("pause", paint);

  toggle.hidden = false;
  paint();
})();
