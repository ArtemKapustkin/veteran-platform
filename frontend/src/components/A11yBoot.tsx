/**
 * Sync inline script — runs before React hydration so we never flash the
 * wrong text size / contrast on first paint after reload.
 *
 * Persisted shape lives in localStorage under "svoi:a11y" and is the same
 * source the Zustand store reads from on the client.
 *
 * For first-time visitors (no persisted prefs) we honor the OS-level
 * media queries:
 *   - `prefers-reduced-motion: reduce` → start with reduce-motion on
 *   - `prefers-contrast: more`         → start with high-contrast on
 * Once the user toggles a setting explicitly, their stored value wins.
 */
const bootScript = `
(function () {
  try {
    var raw = localStorage.getItem("svoi:a11y");
    var prefs = {};
    try { prefs = raw ? (JSON.parse(raw).state || JSON.parse(raw)) : {}; } catch (_) {}
    var html = document.documentElement;
    html.classList.remove("text-size-sm","text-size-md","text-size-lg","text-size-xl");
    var size = prefs.textSize;
    if (size !== "sm" && size !== "md" && size !== "lg" && size !== "xl") size = "md";
    html.classList.add("text-size-" + size);

    var mm = window.matchMedia;
    var prefersReduce  = mm && mm("(prefers-reduced-motion: reduce)").matches;
    var prefersHighCt  = mm && mm("(prefers-contrast: more)").matches;

    if (prefs.highContrast === true || (prefs.highContrast === undefined && prefersHighCt)) {
      html.classList.add("high-contrast");
    }
    if (prefs.reduceMotion === true || (prefs.reduceMotion === undefined && prefersReduce)) {
      html.classList.add("reduce-motion");
    }
  } catch (_) {}
})();
`;

export function A11yBoot() {
  return <script dangerouslySetInnerHTML={{ __html: bootScript }} />;
}
