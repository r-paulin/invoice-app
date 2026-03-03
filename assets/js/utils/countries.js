(function () {
  'use strict';

  function logError(context, err) {
    if (window.InvioLog && typeof window.InvioLog.error === 'function') {
      window.InvioLog.error(context, err);
    }
  }

  var worldCountriesPromise = null;
  var worldCountriesCache = [];

  function loadWorldCountries() {
    if (worldCountriesPromise) return worldCountriesPromise;
    worldCountriesPromise = fetch('assets/data/countries.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load countries.json');
        return res.json();
      })
      .then(function (countries) {
        worldCountriesCache = (countries || []).map(function (c) {
          return {
            name: (c.name || '').trim(),
            iso2: (c.iso2 || '').toUpperCase(),
            dialCode: (c.dialCode || '').trim()
          };
        }).filter(function (c) {
          return c.name && c.iso2 && c.dialCode;
        });
        return worldCountriesCache;
      })
      .catch(function (err) {
        worldCountriesCache = [];
        logError('loadWorldCountries', err);
        throw err;
      });
    return worldCountriesPromise;
  }

  function findCountryByIso2(iso2) {
    var code = (iso2 || '').toUpperCase();
    if (!code) return null;
    for (var i = 0; i < worldCountriesCache.length; i++) {
      if (worldCountriesCache[i].iso2 === code) return worldCountriesCache[i];
    }
    return null;
  }

  function normalizePhoneValue(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function detectCountryByPhone(phoneValue) {
    var phone = normalizePhoneValue(phoneValue);
    if (!phone || phone.charAt(0) !== '+' || !worldCountriesCache.length) return null;
    var matches = worldCountriesCache.filter(function (c) {
      return phone.indexOf(c.dialCode) === 0;
    });
    if (!matches.length) return null;
    matches.sort(function (a, b) { return b.dialCode.length - a.dialCode.length; });
    return matches[0];
  }

  function getLocalPartFromFullPhone(fullPhone) {
    var full = normalizePhoneValue(fullPhone || '');
    if (!full || full.charAt(0) !== '+' || !worldCountriesCache.length) return full;
    var matches = worldCountriesCache.filter(function (c) {
      return full.indexOf(c.dialCode) === 0;
    });
    if (!matches.length) return full;
    matches.sort(function (a, b) { return b.dialCode.length - a.dialCode.length; });
    return full.slice(matches[0].dialCode.length).replace(/^\s+/, '');
  }

  function inferIso2FromLocale() {
    var candidates = [];
    if (Array.isArray(navigator.languages)) candidates = candidates.concat(navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
    try { candidates.push(Intl.DateTimeFormat().resolvedOptions().locale); } catch (e) { /* empty */ }

    for (var i = 0; i < candidates.length; i++) {
      var locale = (candidates[i] || '').trim();
      if (!locale) continue;
      var regionMatch = locale.match(/[-_]([A-Za-z]{2})\b/);
      if (regionMatch) {
        var iso2 = regionMatch[1].toUpperCase();
        if (findCountryByIso2(iso2)) return iso2;
      }
      if (locale.length === 2) {
        var twoLetter = locale.toUpperCase();
        if (findCountryByIso2(twoLetter)) return twoLetter;
      }
    }
    return '';
  }

  /**
   * Parameterized display helpers. Pass the role prefix ('seller' | 'buyer').
   */
  function updatePhoneCountryDisplay(role, iso2) {
    var dialEl = document.getElementById(role + '-phone-country-dial');
    var flagEl = document.getElementById(role + '-phone-country-flag');
    var displayEl = document.getElementById(role + '-phone-country-display');
    if (!displayEl) return;
    var country = findCountryByIso2(iso2);
    if (flagEl) flagEl.className = 'phone-country-flag fi' + (iso2 ? ' fi-' + iso2.toLowerCase() : '');
    if (dialEl) dialEl.textContent = country ? country.dialCode : '';
  }

  function updateAddressCountryDisplay(role, iso2) {
    var flagEl = document.getElementById(role + '-country-flag');
    var nameEl = document.getElementById(role + '-country-name');
    var selectEl = document.getElementById(role + '-country');
    if (!flagEl || !nameEl || !selectEl) return;
    if (!iso2) {
      flagEl.className = 'country-select-flag fi';
      nameEl.textContent = 'Select country';
      return;
    }
    var country = findCountryByIso2(iso2);
    flagEl.className = 'country-select-flag fi fi-' + iso2.toLowerCase();
    nameEl.textContent = country ? country.name : iso2;
  }

  function getComposedPhoneValue(role) {
    var phoneInput = document.getElementById(role + '-phone');
    var phoneSelect = document.getElementById(role + '-phone-country');
    var local = phoneInput ? normalizePhoneValue(phoneInput.value) : '';
    if (!local) return '';
    var country = phoneSelect && phoneSelect.value ? findCountryByIso2(phoneSelect.value) : null;
    var dial = country ? country.dialCode : '';
    if (!dial) return local;
    return (dial + ' ' + local).trim();
  }

  function fillCountrySelects(role) {
    var addressSelect = document.getElementById(role + '-country');
    var phoneSelect = document.getElementById(role + '-phone-country');
    if (!addressSelect || !phoneSelect) return;
    addressSelect.length = 1;
    phoneSelect.length = 1;
    worldCountriesCache.forEach(function (c) {
      var addrOpt = document.createElement('option');
      addrOpt.value = c.iso2;
      addrOpt.textContent = c.name;
      addressSelect.appendChild(addrOpt);
      var phoneOpt = document.createElement('option');
      phoneOpt.value = c.iso2;
      phoneOpt.textContent = c.name + ' (' + c.dialCode + ')';
      phoneSelect.appendChild(phoneOpt);
    });
    updateAddressCountryDisplay(role, addressSelect.value);
    updatePhoneCountryDisplay(role, phoneSelect.value);
  }

  function bindCountrySelectEvents(role) {
    var addressSelect = document.getElementById(role + '-country');
    var phoneSelect = document.getElementById(role + '-phone-country');
    if (!addressSelect || !phoneSelect) return;
    addressSelect.addEventListener('change', function () {
      var iso2 = addressSelect.value;
      updateAddressCountryDisplay(role, iso2);
      phoneSelect.value = iso2;
      updatePhoneCountryDisplay(role, iso2);
    });
    phoneSelect.addEventListener('change', function () {
      updatePhoneCountryDisplay(role, phoneSelect.value);
    });
  }

  function applyGeoPrefillIfEmpty(role) {
    var addressSelect = document.getElementById(role + '-country');
    var phoneSelect = document.getElementById(role + '-phone-country');
    if (!addressSelect || !phoneSelect) return;
    if (addressSelect.value || phoneSelect.value) return;
    var guessedIso2 = inferIso2FromLocale();
    if (!guessedIso2) return;
    if (findCountryByIso2(guessedIso2)) {
      addressSelect.value = guessedIso2;
      phoneSelect.value = guessedIso2;
      updateAddressCountryDisplay(role, guessedIso2);
      updatePhoneCountryDisplay(role, guessedIso2);
    }
  }

  function parseCountryCodeFromInput(val) {
    if (!val || typeof val !== 'string') return '';
    var trimmed = val.trim();
    var match = trimmed.match(/\(([A-Z]{2})\)$/i);
    if (match) return match[1].toUpperCase();
    if (trimmed.length === 2) return trimmed.toUpperCase();
    return trimmed.toUpperCase();
  }

  window.Invio = window.Invio || {};
  window.Invio.countries = {
    load: loadWorldCountries,
    getCached: function () { return worldCountriesCache; },
    findByIso2: findCountryByIso2,
    detectCountryByPhone: detectCountryByPhone,
    getLocalPartFromFullPhone: getLocalPartFromFullPhone,
    inferIso2FromLocale: inferIso2FromLocale,
    normalizePhoneValue: normalizePhoneValue,
    updatePhoneCountryDisplay: updatePhoneCountryDisplay,
    updateAddressCountryDisplay: updateAddressCountryDisplay,
    getComposedPhoneValue: getComposedPhoneValue,
    fillCountrySelects: fillCountrySelects,
    bindCountrySelectEvents: bindCountrySelectEvents,
    applyGeoPrefillIfEmpty: applyGeoPrefillIfEmpty,
    parseCountryCodeFromInput: parseCountryCodeFromInput
  };

})();
