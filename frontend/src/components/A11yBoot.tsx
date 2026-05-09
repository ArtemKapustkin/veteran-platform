/**
 * Sync inline script — runs before React hydration so we never flash the
 * wrong text size / contrast on first paint after reload.
 * The persisted shape lives in localStorage under "svoi:a11y" and is also
 * the source the Zustand store reads from on the client.
 */
const bootScript = `
(function () {
  try {
    var raw = localStorage.getItem("svoi:a11y");
    var prefs = raw ? JSON.parse(raw) : {};
    var html = document.documentElement;
    html.classList.remove("text-size-sm","text-size-md","text-size-lg");
    html.classList.add("text-size-" + (prefs.textSize || "md"));
    if (prefs.highContrast) html.classList.add("high-contrast");
    var prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefs.reduceMotion === true || (prefs.reduceMotion === undefined && prefersReduce)) {
      html.classList.add("reduce-motion");
    }
  } catch (_) {}
})();
`;

export function A11yBoot() {
  return <script dangerouslySetInnerHTML={{ __html: bootScript }} />;
}
