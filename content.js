console.log("[CookieRejector] Content script geladen in frame:", window.location.href);

// Direct inline injecteren om CSP-blokkades te omzeilen
try {
  const script = document.createElement("script");
  script.src = browser.runtime.getURL("injected.js");
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
} catch (e) {
  console.error("[CookieRejector] Injectiefout:", e);
}
