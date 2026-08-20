// injected.js - TCF Interceptor & Rate-limited fallback
console.log("[CookieRejector] Interceptor actief op:", window.location.hostname);

(function () {
  "use strict";

  let isHandled = false;

  // 1. Onderschep data en zet alle doeleinden en legitieme belangen op false
  function sanitizeTcData(tcData) {
    if (!tcData) return tcData;

    if (tcData.purpose) {
      if (tcData.purpose.consents) {
        for (let k in tcData.purpose.consents) tcData.purpose.consents[k] = false;
      }
      if (tcData.purpose.legitimateInterests) {
        for (let k in tcData.purpose.legitimateInterests) tcData.purpose.legitimateInterests[k] = false;
      }
    }

    if (tcData.vendor) {
      if (tcData.vendor.consents) {
        for (let k in tcData.vendor.consents) tcData.vendor.consents[k] = false;
      }
      if (tcData.vendor.legitimateInterests) {
        for (let k in tcData.vendor.legitimateInterests) tcData.vendor.legitimateInterests[k] = false;
      }
    }

    return tcData;
  }

  // 2. Monkey-patch window.__tcfapi
  let originalTcf = window.__tcfapi;

  Object.defineProperty(window, "__tcfapi", {
    configurable: true,
    enumerable: true,
    get: function () {
      return function (command, version, callback, parameter) {
        if (command === "getTCData" || command === "addEventListener") {
          const proxyCallback = function (tcData, success) {
            if (success && tcData) {
              tcData = sanitizeTcData(tcData);
            }
            if (typeof callback === "function") {
              callback(tcData, success);
            }
          };

          if (typeof originalTcf === "function") {
            return originalTcf(command, version, proxyCallback, parameter);
          }
          return;
        }

        if (typeof originalTcf === "function") {
          return originalTcf(command, version, callback, parameter);
        }
      };
    },
    set: function (newTcf) {
      originalTcf = newTcf;
    }
  });

  // 3. Eénmalige DOM Fallback (Voorkomt de loop)
  async function singlePassDomReject() {
    if (isHandled) return;
    isHandled = true;

    // Probeer eerst een directe reject knop
    const rejectBtn = document.querySelector(`
      #onetrust-reject-all-handler,
      button[id*="reject" i],
      button[class*="reject" i],
      .sp_choice_type_REJECT_ALL
    `);

    if (rejectBtn && rejectBtn.offsetParent !== null) {
      console.log("[CookieRejector] Directe reject knop aangeklikt.");
      rejectBtn.click();
      return;
    }

    // Verberg visuele banners indien knoppen ontbreken
    const style = document.createElement("style");
    style.textContent = `
      #onetrust-banner-sdk, #onetrust-consent-sdk,
      .dpg-modal, [id*="cookie-bar" i], [class*="cmp-container" i] {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Voer de DOM check slechts één keer uit na het inladen van de pagina
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", singlePassDomReject, { once: true });
  } else {
    singlePassDomReject();
  }
})();
