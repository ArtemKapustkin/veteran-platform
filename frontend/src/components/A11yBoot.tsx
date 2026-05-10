import Script from "next/script";

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
 *
 * Implemented with `next/script` + `beforeInteractive` so the snippet is
 * injected and executed like a normal parser-blocking script. A raw
 * `<script>` in the React tree triggers a React 19 dev warning and is not
 * guaranteed to run on the client the same way.
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
  return (
    // beforeInteractive in the root layout is the supported App Router pattern;
    // the lint rule still reflects the old `pages/_document`-only guidance.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- root layout
    <Script id="svoi-a11y-boot" strategy="beforeInteractive">
      {bootScript}
    </Script>
  );
}
