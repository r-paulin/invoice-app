(function () {
  var FALLBACK_LOCALE = 'en';
  var cache = {};
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

  function fetchLocaleDictionary(locale) {
    var code = (locale || FALLBACK_LOCALE).toLowerCase();
    if (cache[code]) return Promise.resolve(cache[code]);
    var url = detectBaseUrl() + '/assets/i18n/' + code + '.json';
    return fetch(url, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load locale: ' + code);
        return response.json();
      })
      .then(function (json) {
        cache[code] = json || {};
        return cache[code];
      })
      .catch(function () {
        cache[code] = {};
        return cache[code];
      });
  }

  function getByPath(target, path) {
    var parts = path.split('.');
    var current = target;
    for (var i = 0; i < parts.length; i += 1) {
      if (!current || typeof current !== 'object') return null;
      current = current[parts[i]];
    }
    return current == null ? null : current;
  }

  var i18n = {
    currentLocale: FALLBACK_LOCALE,
    dictionary: {},
    fallbackDictionary: {},
    setLocale: function (locale) {
      var nextLocale = (locale || FALLBACK_LOCALE).toLowerCase();
      var self = this;
      this.currentLocale = nextLocale;
      return Promise.all([
        fetchLocaleDictionary(nextLocale),
        fetchLocaleDictionary(FALLBACK_LOCALE)
      ]).then(function (result) {
        self.dictionary = result[0] || {};
        self.fallbackDictionary = result[1] || {};
      });
    },
    t: function (key) {
      var value = getByPath(this.dictionary, key);
      if (typeof value === 'string') return value;
      var fallbackValue = getByPath(this.fallbackDictionary, key);
      if (typeof fallbackValue === 'string') return fallbackValue;
      return key;
    }
  };

  window.InvioI18n = i18n;
})();
