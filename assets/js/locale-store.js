(function () {
  var SUPPORTED_LOCALES = ['bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'uk'];
  var COUNTRY_TO_LOCALE = {
    BG: 'bg', HR: 'hr', CZ: 'cs', DK: 'da', NL: 'nl', GB: 'en', IE: 'en', EE: 'et', FI: 'fi', FR: 'fr', DE: 'de', GR: 'el',
    HU: 'hu', IT: 'it', LV: 'lv', LT: 'lt', MT: 'mt', PL: 'pl', PT: 'pt', RO: 'ro', SK: 'sk', SI: 'sl', ES: 'es', SE: 'sv',
    UA: 'uk'
  };
  var LOCALE_TO_COUNTRY = {
    bg: 'BG', hr: 'HR', cs: 'CZ', da: 'DK', nl: 'NL', en: 'GB', et: 'EE', fi: 'FI', fr: 'FR', de: 'DE', el: 'GR', hu: 'HU',
    ga: 'IE', it: 'IT', lv: 'LV', lt: 'LT', mt: 'MT', pl: 'PL', pt: 'PT', ro: 'RO', sk: 'SK', sl: 'SI', es: 'ES', sv: 'SE', uk: 'UA'
  };
  var PREF_KEY = 'invio_lang_pref';
  var SESSION_INVOICE_OVERRIDE_KEY = 'invio_invoice_lang_override';
  function detectBaseUrl() {
    var configured = (window.__INVIO_BASE_URL__ || '').replace(/\/+$/, '');
    var pathname = (window.location && window.location.pathname) ? window.location.pathname : '/';
    if (configured && (pathname === configured || pathname.indexOf(configured + '/') === 0)) {
      return configured;
    }
    if (pathname === '/invoice-app' || pathname.indexOf('/invoice-app/') === 0) {
      return '/invoice-app';
    }
    return '';
  }
  var BASE_URL = detectBaseUrl();

  function safeLocalStorageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeLocalStorageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  }
  function safeSessionStorageGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSessionStorageSet(key, value) {
    try {
      if (value == null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function isSupportedLocale(locale) {
    return SUPPORTED_LOCALES.indexOf((locale || '').toLowerCase()) !== -1;
  }
  function normalizeLocale(locale) {
    var code = (locale || '').toLowerCase();
    return isSupportedLocale(code) ? code : 'en';
  }
  function normalizePath(pathname) {
    var path = pathname || '/';
    if (BASE_URL && path.indexOf(BASE_URL) === 0) {
      path = path.slice(BASE_URL.length) || '/';
    }
    return path.charAt(0) === '/' ? path : '/' + path;
  }
  function extractLocaleFromPath(pathname) {
    var parts = normalizePath(pathname).split('/').filter(Boolean);
    if (!parts.length) return '';
    var candidate = parts[0].toLowerCase();
    return isSupportedLocale(candidate) ? candidate : '';
  }
  function inferLocaleFromBrowser() {
    var candidates = [];
    if (Array.isArray(navigator.languages)) candidates = candidates.concat(navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
    for (var i = 0; i < candidates.length; i += 1) {
      var locale = (candidates[i] || '').toLowerCase();
      if (!locale) continue;
      var normalized = locale.split('-')[0].split('_')[0];
      if (isSupportedLocale(normalized)) return normalized;
      var regionMatch = locale.match(/[-_]([a-z]{2})\b/);
      if (regionMatch) {
        var byCountry = COUNTRY_TO_LOCALE[regionMatch[1].toUpperCase()];
        if (byCountry) return byCountry;
      }
    }
    return 'en';
  }
  function getEdgeCountry() {
    if (window.__INVIO_EDGE_COUNTRY__) return String(window.__INVIO_EDGE_COUNTRY__).toUpperCase();
    var meta = document.querySelector('meta[name="invio-edge-country"]');
    if (meta && meta.content) return String(meta.content).toUpperCase();
    return '';
  }
  function buildLocalizedUrl(locale, pathname, search, hash) {
    var cleanPath = normalizePath(pathname).replace(/\/+$/, '') || '/';
    var parts = cleanPath.split('/').filter(Boolean);
    if (parts.length && isSupportedLocale(parts[0])) parts.shift();
    var suffixPath = parts.join('/');
    var target = BASE_URL + '/' + locale + '/';
    if (suffixPath) target += suffixPath;
    return target + (search || '') + (hash || '');
  }

  var api = {
    supportedLocales: SUPPORTED_LOCALES.slice(),
    localeToCountry: LOCALE_TO_COUNTRY,
    getExplicitPreference: function () {
      var value = safeLocalStorageGet(PREF_KEY);
      return isSupportedLocale(value) ? value : '';
    },
    setExplicitPreference: function (locale) {
      var normalized = normalizeLocale(locale);
      safeLocalStorageSet(PREF_KEY, normalized);
      return normalized;
    },
    resolveAppLanguage: function () {
      var explicit = this.getExplicitPreference();
      if (explicit) return explicit;
      var fromPath = extractLocaleFromPath(window.location.pathname);
      if (fromPath) return fromPath;
      var edgeCountry = getEdgeCountry();
      if (edgeCountry && COUNTRY_TO_LOCALE[edgeCountry]) return COUNTRY_TO_LOCALE[edgeCountry];
      return inferLocaleFromBrowser();
    },
    resolveDefaultCountry: function (appLanguage) {
      var edgeCountry = getEdgeCountry();
      if (edgeCountry) return edgeCountry;
      return this.localeToCountry[normalizeLocale(appLanguage)] || 'GB';
    },
    applyRootRedirectIfNeeded: function () {
      var fromPath = extractLocaleFromPath(window.location.pathname);
      if (fromPath) {
        this.setExplicitPreference(fromPath);
        return;
      }
      var explicit = this.getExplicitPreference();
      var normalizedPath = normalizePath(window.location.pathname);
      var isRoot = normalizedPath === '/' || normalizedPath === '';
      if (!isRoot) return;
      if (explicit && explicit !== 'en') {
        window.location.replace(buildLocalizedUrl(explicit, window.location.pathname, window.location.search, window.location.hash));
        return;
      }
      if (explicit === 'en') return;
      var resolved = this.resolveAppLanguage();
      if (resolved !== 'en') {
        window.location.replace(buildLocalizedUrl(resolved, window.location.pathname, window.location.search, window.location.hash));
      }
    },
    navigateToLocale: function (locale) {
      var normalized = this.setExplicitPreference(locale);
      if (!window.location) return;
      if (normalized === 'en') {
        var parts = normalizePath(window.location.pathname).split('/').filter(Boolean);
        if (parts.length && isSupportedLocale(parts[0])) parts.shift();
        var target = BASE_URL + '/' + parts.join('/');
        if (target === BASE_URL + '/') target = BASE_URL + '/';
        window.location.assign(target + window.location.search + window.location.hash);
        return;
      }
      window.location.assign(buildLocalizedUrl(normalized, window.location.pathname, window.location.search, window.location.hash));
    },
    getInvoiceLanguageOverride: function () {
      var stored = safeSessionStorageGet(SESSION_INVOICE_OVERRIDE_KEY);
      return isSupportedLocale(stored) ? stored : '';
    },
    setInvoiceLanguageOverride: function (locale) {
      var normalized = normalizeLocale(locale);
      safeSessionStorageSet(SESSION_INVOICE_OVERRIDE_KEY, normalized);
      return normalized;
    },
    clearInvoiceLanguageOverride: function () {
      safeSessionStorageSet(SESSION_INVOICE_OVERRIDE_KEY, null);
    }
  };

  window.InvioLocale = api;
})();
