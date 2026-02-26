(function () {
  /** Minimal logger for errors; no-op by default; can be replaced with reporting in production. */
  function logError(context, err) {
    if (typeof window !== 'undefined' && window.InvioLog && typeof window.InvioLog.error === 'function') {
      window.InvioLog.error(context, err);
    }
  }

  document.addEventListener('alpine:init', function () {
    Alpine.data('paymentDetails', function () {
      return {
        ibanDebounce: {},
        addAccount: function () {
          var s = Alpine.store('sellerBankAccounts');
          if (s.length >= 6) return;
          s.push({
            iban: '',
            bankName: '',
            ibanError: '',
            _id: 'iban-' + Date.now() + '-' + Math.random().toString(36).slice(2)
          });
        },
        removeAccount: function (i) {
          var s = Alpine.store('sellerBankAccounts');
          if (s.length <= 1) return;
          s.splice(i, 1);
        },
        validateIbanAt: function (i) {
          var self = this;
          clearTimeout(this.ibanDebounce[i]);
          this.ibanDebounce[i] = setTimeout(function () {
            var s = Alpine.store('sellerBankAccounts');
            var acc = s[i];
            if (!acc) return;
            var raw = (acc.iban || '').trim();
            var norm = raw.replace(/\s/g, '').toUpperCase();
            if (!norm) {
              acc.ibanError = '';
              return;
            }
            var countryEl = document.getElementById('seller-country');
            var country = countryEl ? countryEl.value : '';
            if (country && window.InvioValidation && window.InvioValidation.validIbanFormatForCountry && !window.InvioValidation.validIbanFormatForCountry(norm, country)) {
              acc.ibanError = 'IBAN length does not match selected country';
              return;
            }
            acc.ibanError = (window.InvioValidation && window.InvioValidation.validIban && !window.InvioValidation.validIban(norm)) ? 'Invalid IBAN' : '';
          }, 350);
        }
      };
    });
    Alpine.data('buyerPaymentDetails', function () {
      return {
        ibanDebounce: {},
        addAccount: function () {
          var s = Alpine.store('buyerBankAccounts');
          if (s.length >= 6) return;
          s.push({
            iban: '',
            bankName: '',
            ibanError: '',
            _id: 'iban-' + Date.now() + '-' + Math.random().toString(36).slice(2)
          });
        },
        removeAccount: function (i) {
          var s = Alpine.store('buyerBankAccounts');
          if (s.length <= 1) return;
          s.splice(i, 1);
        },
        validateIbanAt: function (i) {
          var self = this;
          clearTimeout(this.ibanDebounce[i]);
          this.ibanDebounce[i] = setTimeout(function () {
            var s = Alpine.store('buyerBankAccounts');
            var acc = s[i];
            if (!acc) return;
            var raw = (acc.iban || '').trim();
            var norm = raw.replace(/\s/g, '').toUpperCase();
            if (!norm) {
              acc.ibanError = '';
              return;
            }
            var countryEl = document.getElementById('buyer-country');
            var country = countryEl ? countryEl.value : '';
            if (country && window.InvioValidation && window.InvioValidation.validIbanFormatForCountry && !window.InvioValidation.validIbanFormatForCountry(norm, country)) {
              acc.ibanError = 'IBAN length does not match selected country';
              return;
            }
            acc.ibanError = (window.InvioValidation && window.InvioValidation.validIban && !window.InvioValidation.validIban(norm)) ? 'Invalid IBAN' : '';
          }, 350);
        }
      };
    });
  });

  const tabs = document.querySelectorAll('.tab[data-target]');
  const panels = document.querySelectorAll('.panel[data-panel]');

  function setActive(target) {
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.target === target);
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === target;
      panel.hidden = !isActive;
      panel.classList.toggle('active', isActive);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActive(tab.dataset.target);
    });
  });

  setActive('invoice-data');

  // --- Header language picker: same design as country selector (flag + label, native select overlaid) ---
  const langButtonLabel = document.getElementById('lang-button-label');
  const langButtonFlag = document.getElementById('lang-button-flag');
  const langSelect = document.getElementById('lang-select');

  if (langSelect && langButtonLabel && langButtonFlag) {
    var languageToCountry = {
      bg: 'bg',
      hr: 'hr',
      cs: 'cz',
      da: 'dk',
      nl: 'nl',
      en: 'gb',
      et: 'ee',
      fi: 'fi',
      fr: 'fr',
      de: 'de',
      el: 'gr',
      hu: 'hu',
      ga: 'ie',
      it: 'it',
      lv: 'lv',
      lt: 'lt',
      mt: 'mt',
      pl: 'pl',
      pt: 'pt',
      ro: 'ro',
      sk: 'sk',
      sl: 'si',
      es: 'es',
      sv: 'se'
    };

    function syncLangDisplay() {
      var selectedOption = langSelect.options[langSelect.selectedIndex];
      if (selectedOption) {
        langButtonLabel.textContent = selectedOption.textContent || 'English';
        var countryCode = languageToCountry[langSelect.value] || 'gb';
        langButtonFlag.className = 'lang-select-flag fi fi-' + countryCode.toLowerCase();
      }
    }

    langSelect.addEventListener('change', syncLangDisplay);

    syncLangDisplay();
  }

  // --- Basic details: issue date & due date (ISO 8601, 14-day rule, no past due) ---
  const issueDateInput = document.getElementById('issue-date');
  const dueDateInput = document.getElementById('due-date');

  if (issueDateInput && dueDateInput) {
    function toISO(date) {
      return date.toISOString().slice(0, 10);
    }

    function todayISO() {
      return toISO(new Date());
    }

    function addDays(date, days) {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    }

    let dueDateManuallySet = false;

    // Defaults: issue = today, due = today + 14
    function setDefaults() {
      const today = todayISO();
      const dueDefault = toISO(addDays(new Date(), 14));
      issueDateInput.value = today;
      dueDateInput.value = dueDefault;
      updateDueMin();
    }

    function updateDueMin() {
      const today = todayISO();
      const issue = issueDateInput.value || today;
      // Due date cannot be in the past; also should not be before issue date
      const minDue = issue > today ? issue : today;
      dueDateInput.min = minDue;
    }

    const dueDateUpdatingEl = document.getElementById('due-date-updating');

    function setDueFromIssue() {
      if (dueDateManuallySet) return;
      const issue = issueDateInput.value;
      if (!issue) return;
      if (dueDateUpdatingEl) {
        dueDateUpdatingEl.hidden = false;
        dueDateUpdatingEl.textContent = 'Updating…';
      }
      const due = toISO(addDays(new Date(issue + 'T12:00:00'), 14));
      dueDateInput.value = due;
      updateDueMin();
      if (dueDateUpdatingEl) {
        setTimeout(function () {
          dueDateUpdatingEl.hidden = true;
        }, 400);
      }
    }

    setDefaults();
    updateDueMin();

    function onIssueDateChange() {
      updateDueMin();
      setDueFromIssue();
    }

    issueDateInput.addEventListener('input', onIssueDateChange);
    issueDateInput.addEventListener('change', onIssueDateChange);

    dueDateInput.addEventListener('change', function () {
      dueDateManuallySet = true;
    });

  }

  // --- Native country selector dataset + helpers ---
  var worldCountriesPromise = null;
  var worldCountriesCache = [];

  /**
   * Load country list from assets/data/countries.json.
   * On failure the promise rejects; worldCountriesCache is set to [] so callers can still run with an empty list.
   */
  function loadWorldCountries() {
    if (worldCountriesPromise) return worldCountriesPromise;
    worldCountriesPromise = fetch('assets/data/countries.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load countries.json');
        return res.json();
      })
      .then(function (countries) {
        worldCountriesCache = (countries || []).map(function (country) {
          return {
            name: (country.name || '').trim(),
            iso2: (country.iso2 || '').toUpperCase(),
            dialCode: (country.dialCode || '').trim()
          };
        }).filter(function (country) {
          return country.name && country.iso2 && country.dialCode;
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

  function normalizePhoneValue(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function applyDialCodeToPhoneInput(dialCode) {
    if (!dialCode) return;
    var phoneSelect = document.getElementById('seller-phone-country');
    if (phoneSelect) phoneSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getLocalPartFromFullPhone(fullPhone) {
    var full = normalizePhoneValue(fullPhone || '');
    if (!full || full.charAt(0) !== '+' || !worldCountriesCache.length) return full;
    var matches = worldCountriesCache.filter(function (country) {
      return full.indexOf(country.dialCode) === 0;
    });
    if (!matches.length) return full;
    matches.sort(function (a, b) { return b.dialCode.length - a.dialCode.length; });
    var prefix = matches[0].dialCode;
    var rest = full.slice(prefix.length).replace(/^\s+/, '');
    return rest;
  }

  function getComposedPhoneValue() {
    var phoneInput = document.getElementById('seller-phone');
    var phoneSelect = document.getElementById('seller-phone-country');
    var local = phoneInput ? normalizePhoneValue(phoneInput.value) : '';
    if (!local) return '';
    var country = phoneSelect && phoneSelect.value ? findCountryByIso2(phoneSelect.value) : null;
    var dial = country ? country.dialCode : '';
    if (!dial) return local;
    return (dial + ' ' + local).trim();
  }

  function updatePhoneCountryDisplay(iso2) {
    var dialEl = document.getElementById('seller-phone-country-dial');
    var flagEl = document.getElementById('seller-phone-country-flag');
    var displayEl = document.getElementById('seller-phone-country-display');
    if (!displayEl) return;
    var country = findCountryByIso2(iso2);
    if (flagEl) {
      flagEl.className = 'phone-country-flag fi' + (iso2 ? ' fi-' + iso2.toLowerCase() : '');
    }
    if (dialEl) dialEl.textContent = country ? country.dialCode : '';
  }

  function detectCountryByPhone(phoneValue) {
    var phone = normalizePhoneValue(phoneValue);
    if (!phone || phone.charAt(0) !== '+' || !worldCountriesCache.length) return null;
    var matches = worldCountriesCache.filter(function (country) {
      return phone.indexOf(country.dialCode) === 0;
    });
    if (!matches.length) return null;
    matches.sort(function (a, b) {
      return b.dialCode.length - a.dialCode.length;
    });
    return matches[0];
  }

  function countryEmojiFromIso2(iso2) {
    if (!iso2 || iso2.length !== 2) return '';
    var code = iso2.toUpperCase();
    var first = code.charCodeAt(0);
    var second = code.charCodeAt(1);
    if (first < 65 || first > 90 || second < 65 || second > 90) return '';
    return String.fromCodePoint(first + 127397, second + 127397);
  }

  function findCountryByIso2(iso2) {
    var code = (iso2 || '').toUpperCase();
    if (!code) return null;
    for (var i = 0; i < worldCountriesCache.length; i += 1) {
      if (worldCountriesCache[i].iso2 === code) return worldCountriesCache[i];
    }
    return null;
  }

  function inferIso2FromLocale() {
    var localeCandidates = [];
    if (Array.isArray(navigator.languages)) localeCandidates = localeCandidates.concat(navigator.languages);
    if (navigator.language) localeCandidates.push(navigator.language);
    try {
      localeCandidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
    } catch (e) {
      logError('inferIso2FromLocale', e);
    }

    for (var i = 0; i < localeCandidates.length; i += 1) {
      var locale = (localeCandidates[i] || '').trim();
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

  function updateAddressCountryDisplay(iso2) {
    var flagEl = document.getElementById('seller-country-flag');
    var nameEl = document.getElementById('seller-country-name');
    var selectEl = document.getElementById('seller-country');
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

  function getBuyerComposedPhoneValue() {
    var phoneInput = document.getElementById('buyer-phone');
    var phoneSelect = document.getElementById('buyer-phone-country');
    var local = phoneInput ? normalizePhoneValue(phoneInput.value) : '';
    if (!local) return '';
    var country = phoneSelect && phoneSelect.value ? findCountryByIso2(phoneSelect.value) : null;
    var dial = country ? country.dialCode : '';
    if (!dial) return local;
    return (dial + ' ' + local).trim();
  }

  function updateBuyerPhoneCountryDisplay(iso2) {
    var dialEl = document.getElementById('buyer-phone-country-dial');
    var flagEl = document.getElementById('buyer-phone-country-flag');
    var displayEl = document.getElementById('buyer-phone-country-display');
    if (!displayEl) return;
    var country = findCountryByIso2(iso2);
    if (flagEl) {
      flagEl.className = 'phone-country-flag fi' + (iso2 ? ' fi-' + iso2.toLowerCase() : '');
    }
    if (dialEl) dialEl.textContent = country ? country.dialCode : '';
  }

  function updateBuyerAddressCountryDisplay(iso2) {
    var flagEl = document.getElementById('buyer-country-flag');
    var nameEl = document.getElementById('buyer-country-name');
    var selectEl = document.getElementById('buyer-country');
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

  function fillNativeCountrySelects() {
    var addressSelect = document.getElementById('seller-country');
    var phoneSelect = document.getElementById('seller-phone-country');
    if (addressSelect && phoneSelect) {
      addressSelect.length = 1;
      phoneSelect.length = 1;
      worldCountriesCache.forEach(function (country) {
        var addressOption = document.createElement('option');
        addressOption.value = country.iso2;
        addressOption.textContent = country.name;
        addressSelect.appendChild(addressOption);
        var phoneOption = document.createElement('option');
        phoneOption.value = country.iso2;
        phoneOption.textContent = country.name + ' (' + country.dialCode + ')';
        phoneSelect.appendChild(phoneOption);
      });
      updateAddressCountryDisplay(addressSelect.value);
      updatePhoneCountryDisplay(phoneSelect.value);
    }
    var buyerAddressSelect = document.getElementById('buyer-country');
    var buyerPhoneSelect = document.getElementById('buyer-phone-country');
    if (buyerAddressSelect && buyerPhoneSelect) {
      buyerAddressSelect.length = 1;
      buyerPhoneSelect.length = 1;
      worldCountriesCache.forEach(function (country) {
        var addressOption = document.createElement('option');
        addressOption.value = country.iso2;
        addressOption.textContent = country.name;
        buyerAddressSelect.appendChild(addressOption);
        var phoneOption = document.createElement('option');
        phoneOption.value = country.iso2;
        phoneOption.textContent = country.name + ' (' + country.dialCode + ')';
        buyerPhoneSelect.appendChild(phoneOption);
      });
      updateBuyerAddressCountryDisplay(buyerAddressSelect.value);
      updateBuyerPhoneCountryDisplay(buyerPhoneSelect.value);
    }
  }

  function applyGeoPrefillIfEmpty() {
    var addressSelect = document.getElementById('seller-country');
    var phoneSelect = document.getElementById('seller-phone-country');
    if (!addressSelect || !phoneSelect) return;
    if (addressSelect.value || phoneSelect.value) return;

    var guessedIso2 = inferIso2FromLocale();
    if (!guessedIso2) return;
    if (findCountryByIso2(guessedIso2)) {
      addressSelect.value = guessedIso2;
      phoneSelect.value = guessedIso2;
      updatePhoneCountryDisplay(guessedIso2);
    }
  }

  var lastAddressCountryForPhone = '';

  function bindNativeCountrySelectEvents() {
    var addressSelect = document.getElementById('seller-country');
    var phoneSelect = document.getElementById('seller-phone-country');
    if (addressSelect && phoneSelect) {
      addressSelect.addEventListener('change', function () {
        var iso2 = addressSelect.value;
        updateAddressCountryDisplay(iso2);
        phoneSelect.value = iso2;
        updatePhoneCountryDisplay(iso2);
        lastAddressCountryForPhone = iso2 || '';
      });
      phoneSelect.addEventListener('change', function () {
        updatePhoneCountryDisplay(phoneSelect.value);
      });
    }
    var buyerAddressSelect = document.getElementById('buyer-country');
    var buyerPhoneSelect = document.getElementById('buyer-phone-country');
    if (buyerAddressSelect && buyerPhoneSelect) {
      buyerAddressSelect.addEventListener('change', function () {
        var iso2 = buyerAddressSelect.value;
        updateBuyerAddressCountryDisplay(iso2);
        buyerPhoneSelect.value = iso2;
        updateBuyerPhoneCountryDisplay(iso2);
      });
      buyerPhoneSelect.addEventListener('change', function () {
        updateBuyerPhoneCountryDisplay(buyerPhoneSelect.value);
      });
    }
  }

  window.InvioCountries = window.InvioCountries || {};
  window.InvioCountries.loadCountries = loadWorldCountries;
  window.InvioCountries.getCachedCountries = function () { return worldCountriesCache; };
  window.InvioCountries.detectCountryByPhone = detectCountryByPhone;
  window.InvioCountries.applyDialCodeToPhoneInput = applyDialCodeToPhoneInput;
  window.InvioCountries.findByIso2 = findCountryByIso2;

  // --- Seller modal: dialog, focus trap, form bindings, Save/Cancel ---
  var draft = (typeof window !== 'undefined' && window.__invioDraft) ? window.__invioDraft : (window.InvioState && window.InvioState.createDefaultDraft());
  if (typeof window !== 'undefined') window.__invioDraft = draft;

  // --- General panel: Invoice Language (flag + name, ISO 639-1), pre-fill from website language ---
  var invoiceLanguageSelect = document.getElementById('invoice-language-select');
  var invoiceLanguageName = document.getElementById('invoice-language-name');
  var invoiceLanguageFlag = document.getElementById('invoice-language-flag');
  var invoiceLanguageLive = document.getElementById('invoice-language-live');
  var invoiceLanguageToCountry = {
    bg: 'bg', hr: 'hr', cs: 'cz', da: 'dk', nl: 'nl', en: 'gb', et: 'ee', fi: 'fi', fr: 'fr', de: 'de',
    el: 'gr', hu: 'hu', ga: 'ie', it: 'it', lv: 'lv', lt: 'lt', mt: 'mt', pl: 'pl', pt: 'pt', ro: 'ro',
    sk: 'sk', sl: 'si', es: 'es', sv: 'se'
  };
  var EU_24_LANG_CODES = ['bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv'];
  function syncInvoiceLanguageDisplay() {
    if (!invoiceLanguageSelect || !invoiceLanguageName || !invoiceLanguageFlag) return;
    var opt = invoiceLanguageSelect.options[invoiceLanguageSelect.selectedIndex];
    if (opt) {
      invoiceLanguageName.textContent = opt.textContent || 'English';
      var cc = invoiceLanguageToCountry[invoiceLanguageSelect.value] || 'gb';
      invoiceLanguageFlag.className = 'country-select-flag fi fi-' + cc.toLowerCase();
    }
  }
  function setInvoiceLanguageFromDraft() {
    if (!invoiceLanguageSelect) return;
    var code = (draft.header && draft.header.languageCode) || 'en';
    if (EU_24_LANG_CODES.indexOf(code) === -1) code = 'en';
    invoiceLanguageSelect.value = code;
    syncInvoiceLanguageDisplay();
  }
  function setInvoiceLanguageFromWebsite() {
    if (!invoiceLanguageSelect) return;
    var langSelect = document.getElementById('lang-select');
    var websiteLang = langSelect ? langSelect.value : '';
    if (websiteLang && EU_24_LANG_CODES.indexOf(websiteLang) !== -1) {
      invoiceLanguageSelect.value = websiteLang;
      draft.header = draft.header || {};
      draft.header.languageCode = websiteLang;
    } else {
      invoiceLanguageSelect.value = 'en';
      draft.header = draft.header || {};
      draft.header.languageCode = 'en';
    }
    syncInvoiceLanguageDisplay();
  }
  if (invoiceLanguageSelect) {
    setInvoiceLanguageFromWebsite();
    invoiceLanguageSelect.addEventListener('change', function () {
      draft.header = draft.header || {};
      draft.header.languageCode = invoiceLanguageSelect.value;
      syncInvoiceLanguageDisplay();
      if (invoiceLanguageLive) invoiceLanguageLive.textContent = 'Labels and static text will be generated in ' + (invoiceLanguageSelect.options[invoiceLanguageSelect.selectedIndex].textContent || 'English') + '.';
    });
  }

  // --- General panel: Currency (ISO 4217), all European + major world; code + name ---
  var CURRENCY_NAMES = {
    EUR: 'Euro', USD: 'US dollar', GBP: 'Pound sterling', CHF: 'Swiss franc', JPY: 'Japanese yen', CNY: 'Chinese yuan',
    CAD: 'Canadian dollar', AUD: 'Australian dollar', HKD: 'Hong Kong dollar', SGD: 'Singapore dollar',
    SEK: 'Swedish krona', NOK: 'Norwegian krone', DKK: 'Danish krone', PLN: 'Polish zloty', CZK: 'Czech koruna',
    HUF: 'Hungarian forint', RON: 'Romanian leu', BGN: 'Bulgarian lev', ISK: 'Icelandic krona', HRK: 'Croatian kuna',
    RUB: 'Russian rouble', TRY: 'Turkish lira', INR: 'Indian rupee', BRL: 'Brazilian real', MXN: 'Mexican peso',
    ZAR: 'South African rand', KRW: 'South Korean won', ALL: 'Albanian lek', AMD: 'Armenian dram',
    AZN: 'Azerbaijani manat', BAM: 'Bosnia-Herzegovina convertible mark', BYN: 'Belarusian rouble',
    GEL: 'Georgian lari', MDL: 'Moldovan leu', MKD: 'Macedonian denar', RSD: 'Serbian dinar', UAH: 'Ukrainian hryvnia',
    GIP: 'Gibraltar pound', JEP: 'Jersey pound', GGP: 'Guernsey pound', IMP: 'Manx pound'
  };
  var CURRENCY_LIST = [
    'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CNY', 'CAD', 'AUD', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'ISK', 'HRK', 'RUB', 'TRY', 'INR', 'BRL', 'MXN', 'ZAR', 'KRW',
    'ALL', 'AMD', 'AZN', 'BAM', 'BYN', 'GEL', 'MDL', 'MKD', 'RSD', 'UAH', 'GIP', 'JEP', 'GGP', 'IMP'
  ];
  var invoiceCurrencySelect = document.getElementById('invoice-currency-select');
  if (invoiceCurrencySelect) {
    var currentCurrency = (draft.header && draft.header.currencyCode) || 'EUR';
    var opts = invoiceCurrencySelect.querySelectorAll('option');
    if (opts.length <= 1) {
      invoiceCurrencySelect.innerHTML = '';
      CURRENCY_LIST.forEach(function (code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = code + ' – ' + (CURRENCY_NAMES[code] || code);
        if (code === currentCurrency) opt.selected = true;
        invoiceCurrencySelect.appendChild(opt);
      });
      if (!currentCurrency || CURRENCY_LIST.indexOf(currentCurrency) === -1) invoiceCurrencySelect.value = 'EUR';
    } else if (currentCurrency) invoiceCurrencySelect.value = currentCurrency;
    invoiceCurrencySelect.addEventListener('change', function () {
      draft.header = draft.header || {};
      draft.header.currencyCode = invoiceCurrencySelect.value;
    });
  }

  // --- General panel: Invoice Type (codes 380, 384, etc. in JS only; labels without codes) ---
  var invoiceTypeSelect = document.getElementById('invoice-type-select');
  var invoiceTypeSubtext = document.getElementById('invoice-type-subtext');
  var invoiceTypeSubtexts = {
    '380': 'Standard invoice for goods or services supplied.',
    '384': 'Replaces or corrects a previously issued invoice.',
    '381': 'Credit note that reduces the amount due from the buyer.',
    '326': 'Invoice covering only part of an order or contract.',
    '389': 'Invoice issued by the buyer (self-billing arrangement).',
    '875': 'Invoice for partial progress on a construction project.',
    '876': 'Invoice for a partial final stage of a construction project.',
    '877': 'Final invoice for completion of a construction project.'
  };
  function updateInvoiceTypeSubtext() {
    if (invoiceTypeSubtext && invoiceTypeSelect) invoiceTypeSubtext.textContent = invoiceTypeSubtexts[invoiceTypeSelect.value] || '';
  }
  if (invoiceTypeSelect) {
    if (draft.header && draft.header.typeCode) invoiceTypeSelect.value = draft.header.typeCode;
    updateInvoiceTypeSubtext();
    invoiceTypeSelect.addEventListener('change', function () {
      draft.header = draft.header || {};
      draft.header.typeCode = invoiceTypeSelect.value;
      updateInvoiceTypeSubtext();
    });
  }

  // --- General panel: Payment Type (select), conditional bank visibility ---
  var paymentTypeSelect = document.getElementById('payment-type-select');
  if (paymentTypeSelect) {
    if (draft.payment && draft.payment.meansTypeCode) paymentTypeSelect.value = String(draft.payment.meansTypeCode);
    paymentTypeSelect.addEventListener('change', function () {
      var means = paymentTypeSelect.value;
      draft.payment = draft.payment || {};
      draft.payment.meansTypeCode = means;
      updatePaymentMeansDisplayName();
      applyPaymentDetailsVisibility(means);
      var liveEl = document.getElementById('payment-type-live');
      if (liveEl) {
        if (means === '10') liveEl.textContent = 'Bank details hidden. Payment status: Paid by Cash.';
        else if (means === '48') liveEl.textContent = 'Bank details hidden. Payment status: Paid by Credit Card.';
        else liveEl.textContent = 'Bank details required for bank transfer.';
      }
    });
  }
  function updatePaymentMeansDisplayName() {
    var means = (draft.payment && draft.payment.meansTypeCode) || '30';
    draft.payment = draft.payment || {};
    if (means === '10') draft.payment.paymentMeansDisplayName = 'Paid by Cash';
    else if (means === '48') draft.payment.paymentMeansDisplayName = 'Paid by Credit Card';
    else draft.payment.paymentMeansDisplayName = 'Bank Transfer';
  }
  function querySelectorIncludingShadow(root, selector) {
    if (!root) return null;
    var el = root.querySelector(selector);
    if (el) return el;
    if (root.shadowRoot) {
      el = root.shadowRoot.querySelector(selector);
      if (el) return el;
      var children = root.shadowRoot.children || [];
      for (var i = 0; i < children.length; i++) {
        el = querySelectorIncludingShadow(children[i], selector);
        if (el) return el;
      }
    }
    return null;
  }
  function getElementByIdIncludingShadow(id) {
    var el = document.getElementById(id);
    if (el) return el;
    var roots = document.querySelectorAll('.seller-sheet-root, .buyer-sheet-root, [class*="sheet-root"]');
    for (var r = 0; r < roots.length; r++) {
      el = querySelectorIncludingShadow(roots[r], '#' + id);
      if (el) return el;
    }
    function walkShadowRoots(node) {
      if (node.id === id) return node;
      if (node.querySelector) {
        el = node.querySelector('#' + CSS.escape(id));
        if (el) return el;
      }
      if (node.shadowRoot) {
        el = node.shadowRoot.querySelector('#' + CSS.escape(id));
        if (el) return el;
        for (var i = 0; i < node.shadowRoot.children.length; i++) {
          el = walkShadowRoots(node.shadowRoot.children[i]);
          if (el) return el;
        }
      }
      for (var j = 0; node.children && j < node.children.length; j++) {
        el = walkShadowRoots(node.children[j]);
        if (el) return el;
      }
      return null;
    }
    el = walkShadowRoots(document.body);
    if (el) return el;
    return document.querySelector('[id="' + CSS.escape(id) + '"]');
  }
  function applyPaymentDetailsVisibility(means) {
    var hideBank = means === '10' || means === '48';
    var sellerPaymentSection = getElementByIdIncludingShadow('seller-payment-details-section');
    var buyerPaymentSection = getElementByIdIncludingShadow('buyer-payment-details-section');
    if (sellerPaymentSection) sellerPaymentSection.hidden = hideBank;
    if (buyerPaymentSection) buyerPaymentSection.hidden = hideBank;
    if (sellerIbanBlock) sellerIbanBlock.hidden = hideBank;
    if (buyerIbanBlock) buyerIbanBlock.hidden = hideBank;
  }
  function getPaymentMeansFromGeneral() {
    var sel = document.getElementById('payment-type-select');
    return (sel && sel.value) ? sel.value : (draft.payment && draft.payment.meansTypeCode) || '30';
  }
  updatePaymentMeansDisplayName();

  var sellerSheetTemplate = document.getElementById('seller-sheet-template');
  var sellerBottomSheet = null;
  var sellerForm = null;
  var sellerTrigger = document.querySelector('[data-seller-modal-trigger]');
  var sellerCountryInput = null;
  var sellerIbanBlock = null;
  var sellerCancelBtn = null;
  var sellerCloseBtn = null;

  var buyerSheetTemplate = document.getElementById('buyer-sheet-template');
  var buyerBottomSheet = null;
  var buyerForm = null;
  var buyerCountryInput = null;
  var buyerIbanBlock = null;
  var buyerCancelBtn = null;
  var buyerCloseBtn = null;

  function cacheSellerElements() {
    sellerForm = document.getElementById('seller-form');
    sellerCountryInput = document.getElementById('seller-country');
    sellerIbanBlock = document.getElementById('seller-iban-block');
    sellerCancelBtn = document.getElementById('seller-cancel');
    sellerCloseBtn = document.getElementById('seller-close');
  }

  function cacheBuyerElements() {
    buyerForm = document.getElementById('buyer-form');
    buyerCountryInput = document.getElementById('buyer-country');
    buyerIbanBlock = document.getElementById('buyer-iban-block');
    buyerCancelBtn = document.getElementById('buyer-cancel');
    buyerCloseBtn = document.getElementById('buyer-close');
  }

  function initSellerSheetAlpine() {
    if (!window.Alpine || !sellerForm) return;
    var sheetRoot = sellerForm.closest('.seller-bottom-sheet');
    if (!sheetRoot || sheetRoot.__sellerAlpineInit) return;
    window.Alpine.initTree(sheetRoot);
    sheetRoot.__sellerAlpineInit = true;
  }

  function initBuyerSheetAlpine() {
    if (!window.Alpine || !buyerForm) return;
    var sheetRoot = buyerForm.closest('.buyer-bottom-sheet');
    if (!sheetRoot || sheetRoot.__buyerAlpineInit) return;
    window.Alpine.initTree(sheetRoot);
    sheetRoot.__buyerAlpineInit = true;
  }

  if (sellerSheetTemplate && window.BottomSheet && window.BottomSheet.createBottomSheet) {
    sellerBottomSheet = window.BottomSheet.createBottomSheet({
      content: sellerSheetTemplate.innerHTML,
      shouldShowHandle: false,
      backdropColor: 'rgba(0, 0, 0, 0.4)',
      rootClass: 'seller-sheet-root',
      containerClass: 'seller-sheet-container',
      contentWrapperClass: 'seller-sheet-content-wrapper'
    });
    sellerBottomSheet.mount();
    cacheSellerElements();
    initSellerSheetAlpine();
    var sheetRoot = document.querySelector('.seller-bottom-sheet');
    if (sheetRoot) sheetRoot.setAttribute('inert', '');
  }

  if (buyerSheetTemplate && window.BottomSheet && window.BottomSheet.createBottomSheet) {
    buyerBottomSheet = window.BottomSheet.createBottomSheet({
      content: buyerSheetTemplate.innerHTML,
      shouldShowHandle: false,
      backdropColor: 'rgba(0, 0, 0, 0.4)',
      rootClass: 'buyer-sheet-root',
      containerClass: 'buyer-sheet-container',
      contentWrapperClass: 'buyer-sheet-content-wrapper'
    });
    buyerBottomSheet.mount();
    cacheBuyerElements();
    initBuyerSheetAlpine();
    var buyerSheetRoot = document.querySelector('.buyer-bottom-sheet');
    if (buyerSheetRoot) buyerSheetRoot.setAttribute('inert', '');
  }
  applyPaymentDetailsVisibility(getPaymentMeansFromGeneral());

  function getFocusables() {
    if (!sellerForm) return [];
    var el = sellerForm;
    if (!el) return [];
    var sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(el.querySelectorAll(sel));
  }

  function getBuyerFocusables() {
    if (!buyerForm) return [];
    var sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(buyerForm.querySelectorAll(sel));
  }

  function setFormValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  function openSellerModal() {
    if (!sellerBottomSheet) return;
    if (!sellerForm) cacheSellerElements();
    if (!sellerForm) return;
    initSellerSheetAlpine();
    var s = draft.seller || {};
    var a = s.address || {};
    var c = s.contact || {};
    var p = draft.payment || {};
    setFormValue('seller-name', s.name);
    setFormValue('seller-registration', s.legalRegistrationId);
    setFormValue('seller-vat', s.vatId);
    setFormValue('seller-street', a.line1);
    setFormValue('seller-city', a.city);
    setFormValue('seller-postal', a.postalCode);
    var localPhone = getLocalPartFromFullPhone(c.phone || '');
    setFormValue('seller-phone', localPhone);
    setFormValue('seller-email', c.email);
    var sellerPhoneCountryInput = document.getElementById('seller-phone-country');
    var countryCode = (a.countryCode || '').toUpperCase();
    if (sellerCountryInput) sellerCountryInput.value = countryCode || '';

    if (sellerPhoneCountryInput) {
      var phoneCountry = detectCountryByPhone(c.phone || '');
      sellerPhoneCountryInput.value = phoneCountry ? phoneCountry.iso2 : '';
      if (!sellerPhoneCountryInput.value && countryCode) sellerPhoneCountryInput.value = countryCode;
      updatePhoneCountryDisplay(sellerPhoneCountryInput.value);
    }

    applyGeoPrefillIfEmpty();
    var finalCountry = sellerCountryInput ? sellerCountryInput.value : '';
    lastAddressCountryForPhone = finalCountry || '';
    updateAddressCountryDisplay(finalCountry || '');

    var sheetRoot = document.querySelector('.seller-bottom-sheet');
    if (sheetRoot) sheetRoot.removeAttribute('inert');

    var means = (p.meansTypeCode || '30').toString();
    if (paymentTypeSelect) paymentTypeSelect.value = means;
    applyPaymentDetailsVisibility(means);
    var accounts = (p.accounts && p.accounts.length) ? p.accounts : (p.accountId ? [{ accountId: p.accountId, bankName: p.bankName || null }] : [{ accountId: '', bankName: null }]);
    var normalized = accounts.map(function (acc, idx) {
      return {
        iban: (acc.accountId || '').trim(),
        bankName: (acc.bankName || '').trim() || '',
        ibanError: '',
        _id: acc._id || 'iban-' + Date.now() + '-' + idx
      };
    });
    if (normalized.length === 0) normalized = [{ iban: '', bankName: '', ibanError: '', _id: 'iban-' + Date.now() + '-0' }];
    if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('sellerBankAccounts')) {
      Alpine.store('sellerBankAccounts').splice(0, Alpine.store('sellerBankAccounts').length);
      normalized.forEach(function (acc) { Alpine.store('sellerBankAccounts').push(acc); });
    }
    hideFieldErrors();
    showSellerFormAlert(false);
    var ibanErrEl = document.getElementById('seller-iban-error');
    if (ibanErrEl) { ibanErrEl.hidden = true; ibanErrEl.textContent = ''; }
    sellerBottomSheet.open();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var firstFocus = getFocusables()[0];
        if (firstFocus) firstFocus.focus();
      });
    });
  }

  function closeSellerModal() {
    if (!sellerBottomSheet) return;
    sellerBottomSheet.close();
    var sheetRoot = document.querySelector('.seller-bottom-sheet');
    if (sheetRoot) sheetRoot.setAttribute('inert', '');
  }

  function openBuyerModal() {
    if (!buyerBottomSheet) return;
    if (!buyerForm) cacheBuyerElements();
    if (!buyerForm) return;
    initBuyerSheetAlpine();
    var b = draft.buyer || {};
    var a = b.address || {};
    var c = b.contact || {};
    var p = draft.payment || {};
    setFormValue('buyer-name', b.name);
    setFormValue('buyer-registration', b.legalRegistrationId);
    setFormValue('buyer-vat', b.vatId);
    setFormValue('buyer-street', a.line1);
    setFormValue('buyer-city', a.city);
    setFormValue('buyer-postal', a.postalCode);
    var localPhone = getLocalPartFromFullPhone(c.phone || '');
    setFormValue('buyer-phone', localPhone);
    setFormValue('buyer-email', c.email);
    var buyerPhoneCountryInput = document.getElementById('buyer-phone-country');
    var countryCode = (a.countryCode || '').toUpperCase();
    if (buyerCountryInput) buyerCountryInput.value = countryCode || '';
    if (buyerPhoneCountryInput) {
      var phoneCountry = detectCountryByPhone(c.phone || '');
      buyerPhoneCountryInput.value = phoneCountry ? phoneCountry.iso2 : '';
      if (!buyerPhoneCountryInput.value && countryCode) buyerPhoneCountryInput.value = countryCode;
      updateBuyerPhoneCountryDisplay(buyerPhoneCountryInput.value);
    }
    var finalCountry = buyerCountryInput ? buyerCountryInput.value : '';
    updateBuyerAddressCountryDisplay(finalCountry || '');
    var means = (p.meansTypeCode || '30').toString();
    if (paymentTypeSelect) paymentTypeSelect.value = means;
    applyPaymentDetailsVisibility(means);
    var accounts = (p.accounts && p.accounts.length) ? p.accounts : (p.accountId ? [{ accountId: p.accountId, bankName: p.bankName || null }] : [{ accountId: '', bankName: null }]);
    var normalized = accounts.map(function (acc, idx) {
      return {
        iban: (acc.accountId || '').trim(),
        bankName: (acc.bankName || '').trim() || '',
        ibanError: '',
        _id: acc._id || 'iban-' + Date.now() + '-' + idx
      };
    });
    if (normalized.length === 0) normalized = [{ iban: '', bankName: '', ibanError: '', _id: 'iban-' + Date.now() + '-0' }];
    if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('buyerBankAccounts')) {
      Alpine.store('buyerBankAccounts').splice(0, Alpine.store('buyerBankAccounts').length);
      normalized.forEach(function (acc) { Alpine.store('buyerBankAccounts').push(acc); });
    }
    hideBuyerFieldErrors();
    showBuyerFormAlert(false);
    var ibanErrEl = document.getElementById('buyer-iban-error');
    if (ibanErrEl) { ibanErrEl.hidden = true; ibanErrEl.textContent = ''; }
    var buyerSheetRoot = document.querySelector('.buyer-bottom-sheet');
    if (buyerSheetRoot) buyerSheetRoot.removeAttribute('inert');
    buyerBottomSheet.open();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var firstFocus = getBuyerFocusables()[0];
        if (firstFocus) firstFocus.focus();
      });
    });
  }

  function closeBuyerModal() {
    if (!buyerBottomSheet) return;
    buyerBottomSheet.close();
    var buyerSheetRoot = document.querySelector('.buyer-bottom-sheet');
    if (buyerSheetRoot) buyerSheetRoot.setAttribute('inert', '');
  }

  function parseCountryCodeFromInput(val) {
    if (!val || typeof val !== 'string') return '';
    var trimmed = val.trim();
    var match = trimmed.match(/\(([A-Z]{2})\)$/i);
    if (match) return match[1].toUpperCase();
    if (trimmed.length === 2) return trimmed.toUpperCase();
    return trimmed.toUpperCase();
  }

  function syncFieldErrorA11y(id, hasError) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + '-error');
    if (!input) return;
    input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    if (err) {
      var describedBy = [];
      var base = input.getAttribute('data-describedby-base');
      if (!base && input.hasAttribute('aria-describedby')) {
        var current = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).filter(function (token) {
          return token !== err.id;
        });
        if (current.length) {
          base = current.join(' ');
          input.setAttribute('data-describedby-base', base);
        }
      }
      if (base) describedBy.push(base);
      if (hasError) describedBy.push(err.id);
      if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
      else input.removeAttribute('aria-describedby');
    }
    var field = input.closest('.form-field') || input.closest('.field');
    if (field) field.classList.toggle('has-error', !!hasError);
    var hintEl = document.getElementById(id + '-hint');
    if (hintEl) hintEl.hidden = !!hasError;
  }

  function hideFieldErrors() {
    ['seller-country', 'seller-name', 'seller-registration', 'seller-vat', 'seller-street', 'seller-city', 'seller-postal', 'seller-phone', 'seller-email'].forEach(function (id) {
      var err = document.getElementById(id + '-error');
      if (err) { err.hidden = true; err.textContent = ''; }
      syncFieldErrorA11y(id, false);
    });
  }

  function showFieldError(id, message) {
    var err = document.getElementById(id + '-error');
    if (err) { err.textContent = message || ''; err.hidden = !message; err.removeAttribute('x-cloak'); }
    var hintEl = document.getElementById(id + '-hint');
    if (hintEl) hintEl.hidden = !!message;
    syncFieldErrorA11y(id, !!message);
  }

  function validateSellerForm() {
    var countryCode = sellerCountryInput ? parseCountryCodeFromInput(sellerCountryInput.value) : '';
    var countryRaw = sellerCountryInput ? (sellerCountryInput.value || '').trim() : '';
    var regEl = document.getElementById('seller-registration');
    var regField = regEl && regEl.closest('.form-field');
    var isOrganisation = regField && regField.offsetParent !== null;
    var reg = regEl ? regEl.value : '';
    var nameEl = document.getElementById('seller-name');
    var name = nameEl ? nameEl.value.trim() : '';
    var streetEl = document.getElementById('seller-street');
    var street = streetEl ? streetEl.value.trim() : '';
    var cityEl = document.getElementById('seller-city');
    var city = cityEl ? cityEl.value.trim() : '';
    var postalEl = document.getElementById('seller-postal');
    var postal = postalEl ? postalEl.value.trim() : '';
    var vat = document.getElementById('seller-vat') ? document.getElementById('seller-vat').value.trim() : '';
    var phone = getComposedPhoneValue();
    var email = document.getElementById('seller-email').value;
    var valid = true;
    hideFieldErrors();
    if (!countryRaw) {
      showFieldError('seller-country', 'Country is required');
      valid = false;
    }
    if (!name) {
      showFieldError('seller-name', isOrganisation ? 'Legal name is required' : 'Name and surname is required');
      valid = false;
    }
    if (isOrganisation) {
      if (!reg) {
        showFieldError('seller-registration', 'Registration number is required');
        valid = false;
      }
    } else {
      if (!vat) {
        showFieldError('seller-vat', 'Tax number is required');
        valid = false;
      }
    }
    if (!street) {
      showFieldError('seller-street', 'Address is required');
      valid = false;
    }
    if (!city) {
      showFieldError('seller-city', 'City is required');
      valid = false;
    }
    if (!postal) {
      showFieldError('seller-postal', 'Postal code is required');
      valid = false;
    }
    var v = window.InvioValidation;
    if (isOrganisation && reg && v && v.validRegistrationId && !v.validRegistrationId(reg, countryCode)) {
      showFieldError('seller-registration', 'Invalid registration number for selected country');
      valid = false;
    }
    if (isOrganisation && vat && v && v.validVatId && !v.validVatId(vat, countryCode)) {
      showFieldError('seller-vat', 'Invalid VAT number for selected country');
      valid = false;
    }
    var phoneCountrySelect = document.getElementById('seller-phone-country');
    var phoneDialCode = '';
    if (phoneCountrySelect && window.InvioCountries && window.InvioCountries.findByIso2) {
      var phoneCountry = window.InvioCountries.findByIso2(phoneCountrySelect.value);
      phoneDialCode = phoneCountry ? phoneCountry.dialCode : '';
    }
    if (v && v.validPhone && phone && !v.validPhone(phone, phoneDialCode)) {
      showFieldError('seller-phone', 'Invalid phone number');
      valid = false;
    }
    if (email && v && v.validEmail && !v.validEmail(email)) {
      showFieldError('seller-email', 'Invalid email address');
      valid = false;
    }
    var means = getPaymentMeansFromGeneral();
    if (means === '30') {
      var store = typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('sellerBankAccounts');
      var accounts = store ? Alpine.store('sellerBankAccounts') : [];
      var hasOne = false;
      var allValid = true;
      var i;
      for (i = 0; i < accounts.length; i++) {
        accounts[i].ibanError = '';
      }
      for (i = 0; i < accounts.length; i++) {
        var ibanVal = (accounts[i].iban || '').trim();
        if (ibanVal) {
          hasOne = true;
          if (v && v.validIban && !v.validIban(ibanVal)) {
            allValid = false;
            accounts[i].ibanError = 'Invalid IBAN';
          }
        }
      }
      var ibanErr = document.getElementById('seller-iban-error');
      if (ibanErr) {
        ibanErr.hidden = true;
        ibanErr.textContent = '';
      }
      if (sellerIbanBlock) sellerIbanBlock.classList.remove('has-error');
      if (!hasOne) {
        if (ibanErr) { ibanErr.textContent = 'At least one IBAN is required for credit transfer'; ibanErr.hidden = false; }
        if (sellerIbanBlock) sellerIbanBlock.classList.add('has-error');
        valid = false;
      } else if (!allValid) {
        if (sellerIbanBlock) sellerIbanBlock.classList.add('has-error');
        valid = false;
      }
    }
    return valid;
  }

  function showSellerFormAlert(show) {
    var store = typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('sellerFormAlert');
    if (store) {
      store.show = !!show;
      store.message = show ? 'Please correct the highlighted fields.' : '';
    }
    if (show) {
      requestAnimationFrame(function () {
        var alertEl = document.getElementById('seller-form-errors');
        var sheet = document.querySelector('.seller-bottom-sheet');
        if (sheet) sheet.scrollTop = 0;
        if (alertEl) alertEl.focus();
      });
    }
  }

  function saveSellerForm() {
    if (!validateSellerForm()) {
      showSellerFormAlert(true);
      return;
    }
    showSellerFormAlert(false);
    var s = draft.seller || {};
    var a = s.address || {};
    var c = s.contact || {};
    s.name = (document.getElementById('seller-name') && document.getElementById('seller-name').value) || '';
    s.legalRegistrationId = (document.getElementById('seller-registration') && document.getElementById('seller-registration').value) || null;
    s.vatId = (document.getElementById('seller-vat') && document.getElementById('seller-vat').value) || null;
    if (!s.vatId || !s.vatId.trim()) s.vatId = null;
    a.line1 = (document.getElementById('seller-street') && document.getElementById('seller-street').value) || '';
    a.city = (document.getElementById('seller-city') && document.getElementById('seller-city').value) || '';
    a.postalCode = (document.getElementById('seller-postal') && document.getElementById('seller-postal').value) || null;
    a.countryCode = sellerCountryInput ? parseCountryCodeFromInput(sellerCountryInput.value) : '';
    c.phone = getComposedPhoneValue() || null;
    if (!c.phone || !c.phone.trim()) c.phone = null;
    c.email = (document.getElementById('seller-email') && document.getElementById('seller-email').value) || null;
    if (!c.email || !c.email.trim()) c.email = null;
    draft.seller = s;
    s.address = a;
    s.contact = c;
    var means = getPaymentMeansFromGeneral();
    draft.payment = draft.payment || {};
    draft.payment.meansTypeCode = means;
    updatePaymentMeansDisplayName();
    if (means === '30') {
      var storeAccounts = (typeof Alpine !== 'undefined' && Alpine.store) ? Alpine.store('sellerBankAccounts') : [];
      var accounts = storeAccounts.map(function (acc) {
        var iban = (acc.iban || '').trim();
        var bankName = (acc.bankName || '').trim() || null;
        return { accountId: iban, bankName: bankName };
      }).filter(function (a) { return a.accountId; });
      draft.payment.accounts = accounts;
      draft.payment.accountId = accounts[0] ? accounts[0].accountId : null;
      draft.payment.bankName = accounts[0] ? accounts[0].bankName : null;
    } else {
      draft.payment.accounts = [];
      draft.payment.accountId = null;
      draft.payment.bankName = null;
    }
    closeSellerModal();
    updateSellerCardSummary();
  }

  function hideBuyerFieldErrors() {
    ['buyer-country', 'buyer-name', 'buyer-registration', 'buyer-vat', 'buyer-street', 'buyer-city', 'buyer-postal', 'buyer-phone', 'buyer-email'].forEach(function (id) {
      var err = document.getElementById(id + '-error');
      if (err) { err.hidden = true; err.textContent = ''; }
      syncFieldErrorA11y(id, false);
    });
  }

  function showBuyerFieldError(id, message) {
    var err = document.getElementById(id + '-error');
    if (err) { err.textContent = message || ''; err.hidden = !message; err.removeAttribute('x-cloak'); }
    var hintEl = document.getElementById(id + '-hint');
    if (hintEl) hintEl.hidden = !!message;
    syncFieldErrorA11y(id, !!message);
  }

  function validateBuyerForm() {
    var countryCode = buyerCountryInput ? parseCountryCodeFromInput(buyerCountryInput.value) : '';
    var countryRaw = buyerCountryInput ? (buyerCountryInput.value || '').trim() : '';
    var regEl = document.getElementById('buyer-registration');
    var regField = regEl && regEl.closest('.form-field');
    var isOrganisation = regField && regField.offsetParent !== null;
    var reg = regEl ? regEl.value : '';
    var nameEl = document.getElementById('buyer-name');
    var name = nameEl ? nameEl.value.trim() : '';
    var streetEl = document.getElementById('buyer-street');
    var street = streetEl ? streetEl.value.trim() : '';
    var cityEl = document.getElementById('buyer-city');
    var city = cityEl ? cityEl.value.trim() : '';
    var postalEl = document.getElementById('buyer-postal');
    var postal = postalEl ? postalEl.value.trim() : '';
    var vat = document.getElementById('buyer-vat') ? document.getElementById('buyer-vat').value.trim() : '';
    var phone = getBuyerComposedPhoneValue();
    var email = document.getElementById('buyer-email') ? document.getElementById('buyer-email').value : '';
    var valid = true;
    hideBuyerFieldErrors();
    if (!countryRaw) {
      showBuyerFieldError('buyer-country', 'Country is required');
      valid = false;
    }
    if (!name) {
      showBuyerFieldError('buyer-name', isOrganisation ? 'Legal name is required' : 'Name and surname is required');
      valid = false;
    }
    if (isOrganisation) {
      if (!reg) {
        showBuyerFieldError('buyer-registration', 'Registration number is required');
        valid = false;
      }
    } else {
      if (!vat) {
        showBuyerFieldError('buyer-vat', 'Tax number is required');
        valid = false;
      }
    }
    if (!street) {
      showBuyerFieldError('buyer-street', 'Address is required');
      valid = false;
    }
    if (!city) {
      showBuyerFieldError('buyer-city', 'City is required');
      valid = false;
    }
    if (!postal) {
      showBuyerFieldError('buyer-postal', 'Postal code is required');
      valid = false;
    }
    var v = window.InvioValidation;
    if (isOrganisation && reg && v && v.validRegistrationId && !v.validRegistrationId(reg, countryCode)) {
      showBuyerFieldError('buyer-registration', 'Invalid registration number for selected country');
      valid = false;
    }
    if (isOrganisation && vat && v && v.validVatId && !v.validVatId(vat, countryCode)) {
      showBuyerFieldError('buyer-vat', 'Invalid VAT number for selected country');
      valid = false;
    }
    var phoneCountrySelect = document.getElementById('buyer-phone-country');
    var phoneDialCode = '';
    if (phoneCountrySelect && window.InvioCountries && window.InvioCountries.findByIso2) {
      var phoneCountry = window.InvioCountries.findByIso2(phoneCountrySelect.value);
      phoneDialCode = phoneCountry ? phoneCountry.dialCode : '';
    }
    if (v && v.validPhone && phone && !v.validPhone(phone, phoneDialCode)) {
      showBuyerFieldError('buyer-phone', 'Invalid phone number');
      valid = false;
    }
    if (email && v && v.validEmail && !v.validEmail(email)) {
      showBuyerFieldError('buyer-email', 'Invalid email address');
      valid = false;
    }
    var means = getPaymentMeansFromGeneral();
    if (means === '30') {
      var store = typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('buyerBankAccounts');
      var accounts = store ? Alpine.store('buyerBankAccounts') : [];
      var allValid = true;
      var i;
      for (i = 0; i < accounts.length; i++) {
        accounts[i].ibanError = '';
      }
      for (i = 0; i < accounts.length; i++) {
        var ibanVal = (accounts[i].iban || '').trim();
        if (ibanVal && v && v.validIban && !v.validIban(ibanVal)) {
          allValid = false;
          accounts[i].ibanError = 'Invalid IBAN';
        }
      }
      var ibanErr = document.getElementById('buyer-iban-error');
      if (ibanErr) ibanErr.hidden = true;
      if (buyerIbanBlock) buyerIbanBlock.classList.remove('has-error');
      if (!allValid) {
        if (buyerIbanBlock) buyerIbanBlock.classList.add('has-error');
        valid = false;
      }
    }
    return valid;
  }

  function showBuyerFormAlert(show) {
    var store = typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('buyerFormAlert');
    if (store) {
      store.show = !!show;
      store.message = show ? 'Please correct the highlighted fields.' : '';
    }
    if (show) {
      requestAnimationFrame(function () {
        var alertEl = document.getElementById('buyer-form-errors');
        var sheet = document.querySelector('.buyer-bottom-sheet');
        if (sheet) sheet.scrollTop = 0;
        if (alertEl) alertEl.focus();
      });
    }
  }

  function saveBuyerForm() {
    if (!validateBuyerForm()) {
      showBuyerFormAlert(true);
      return;
    }
    showBuyerFormAlert(false);
    var b = draft.buyer || {};
    var a = b.address || {};
    var c = b.contact || {};
    b.name = (document.getElementById('buyer-name') && document.getElementById('buyer-name').value) || '';
    b.legalRegistrationId = (document.getElementById('buyer-registration') && document.getElementById('buyer-registration').value) || null;
    b.vatId = (document.getElementById('buyer-vat') && document.getElementById('buyer-vat').value) || null;
    if (!b.vatId || !b.vatId.trim()) b.vatId = null;
    a.line1 = (document.getElementById('buyer-street') && document.getElementById('buyer-street').value) || '';
    a.city = (document.getElementById('buyer-city') && document.getElementById('buyer-city').value) || '';
    a.postalCode = (document.getElementById('buyer-postal') && document.getElementById('buyer-postal').value) || null;
    a.countryCode = buyerCountryInput ? parseCountryCodeFromInput(buyerCountryInput.value) : '';
    c.phone = getBuyerComposedPhoneValue() || null;
    if (!c.phone || !c.phone.trim()) c.phone = null;
    c.email = (document.getElementById('buyer-email') && document.getElementById('buyer-email').value) || null;
    if (!c.email || !c.email.trim()) c.email = null;
    draft.buyer = b;
    b.address = a;
    b.contact = c;
    var means = getPaymentMeansFromGeneral();
    draft.payment = draft.payment || {};
    draft.payment.meansTypeCode = means;
    updatePaymentMeansDisplayName();
    if (means === '30') {
      var storeAccounts = (typeof Alpine !== 'undefined' && Alpine.store) ? Alpine.store('buyerBankAccounts') : [];
      var accounts = storeAccounts.map(function (acc) {
        var iban = (acc.iban || '').trim();
        var bankName = (acc.bankName || '').trim() || null;
        return { accountId: iban, bankName: bankName };
      }).filter(function (a) { return a.accountId; });
      draft.payment.accounts = accounts;
      draft.payment.accountId = accounts[0] ? accounts[0].accountId : null;
      draft.payment.bankName = accounts[0] ? accounts[0].bankName : null;
    } else {
      draft.payment.accounts = [];
      draft.payment.accountId = null;
      draft.payment.bankName = null;
    }
    closeBuyerModal();
    updateBuyerCardSummary();
  }

  function clearSellerSectionContent() {
    var section = document.getElementById('seller-section');
    if (!section) return;
    var content = section.querySelector('.section-content');
    if (content) content.innerHTML = '';
  }

  function updateSellerCardSummary() {
    var section = document.getElementById('seller-section');
    if (!section) return;
    var content = section.querySelector('.section-content');
    if (!content) return;
    var s = draft.seller || {};
    var p = draft.payment || {};
    var a = s.address || {};
    var c = s.contact || {};
    var name = (s.name || '').trim();
    clearSellerSectionContent();
    if (!name) {
      var card = document.createElement('div');
      card.className = 'card';
      card.id = 'seller-card';
      var img = document.createElement('img');
      img.src = 'assets/men-holding-papers.webp';
      img.alt = 'Seller details illustration';
      img.className = 'card-image';
      img.width = 248;
      var h3 = document.createElement('h3');
      h3.id = 'seller-card-summary';
      h3.textContent = 'Enter your business details';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--primary btn--icon-left';
      btn.setAttribute('data-seller-modal-trigger', '');
      btn.innerHTML = '<span class="material-symbols-rounded btn__icon" aria-hidden="true">add</span><span class="btn__label">Add details</span>';
      card.appendChild(img);
      card.appendChild(h3);
      card.appendChild(btn);
      content.appendChild(card);
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'seller-summary';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-atomic', 'true');
    var h4 = document.createElement('h4');
    h4.className = 'seller-summary__title';
    h4.textContent = name;
    wrap.appendChild(h4);
    var reg = (s.legalRegistrationId || '').trim();
    var vat = (s.vatId || '').trim();
    if (reg || vat) {
      var identityParts = [];
      if (reg) identityParts.push('Registration number: ' + reg);
      if (vat) identityParts.push('Tax number: ' + vat);
      var pId = document.createElement('p');
      pId.className = 'seller-summary__text';
      pId.textContent = identityParts.join(', ');
      wrap.appendChild(pId);
    }
    var line1 = (a.line1 || '').trim();
    var city = (a.city || '').trim();
    var postal = (a.postalCode || '').trim() || '';
    var cc = (a.countryCode || '').trim();
    var countryName = cc;
    if (cc && window.InvioCountries && window.InvioCountries.findByIso2) {
      var countryObj = window.InvioCountries.findByIso2(cc);
      if (countryObj && countryObj.name) countryName = countryObj.name;
    }
    if (line1 || city || postal || countryName) {
      var parts = [line1, city, postal, countryName].filter(Boolean);
      var addrLine = parts.join(', ');
      var pAddr = document.createElement('p');
      pAddr.className = 'seller-summary__text';
      pAddr.setAttribute('aria-label', 'Address');
      pAddr.textContent = addrLine;
      wrap.appendChild(pAddr);
    }
    if (p.meansTypeCode === '30' && p.accounts && p.accounts.length) {
      p.accounts.forEach(function (acc, idx) {
        var iban = (acc.accountId || '').trim();
        if (!iban) return;
        var bankName = (acc.bankName || '').trim() || '';
        var line = bankName ? iban + ' – ' + bankName : iban;
        var pBank = document.createElement('p');
        pBank.className = 'seller-summary__text';
        if (idx === 0) pBank.setAttribute('aria-label', 'Bank account');
        pBank.textContent = line;
        wrap.appendChild(pBank);
      });
    }
    var phone = (c.phone || '').trim();
    var email = (c.email || '').trim();
    if (phone || email) {
      var contactParts = [];
      if (phone) contactParts.push('Phone: ' + phone);
      if (email) contactParts.push('Email: ' + email);
      var pContact = document.createElement('p');
      pContact.className = 'seller-summary__text';
      pContact.setAttribute('aria-label', 'Contacts');
      pContact.textContent = contactParts.join(' ');
      wrap.appendChild(pContact);
    }
    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--secondary seller-summary__edit';
    editBtn.setAttribute('data-seller-modal-trigger', '');
    editBtn.innerHTML = '<span class="btn__label">Edit</span>';
    editBtn.setAttribute('aria-label', 'Edit seller details');
    wrap.appendChild(editBtn);
    content.appendChild(wrap);
  }

  function clearBuyerSectionContent() {
    var section = document.getElementById('buyer-section');
    if (!section) return;
    var content = section.querySelector('.section-content');
    if (content) content.innerHTML = '';
  }

  function updateBuyerCardSummary() {
    var section = document.getElementById('buyer-section');
    if (!section) return;
    var content = section.querySelector('.section-content');
    if (!content) return;
    var b = draft.buyer || {};
    var p = draft.payment || {};
    var a = b.address || {};
    var c = b.contact || {};
    var name = (b.name || '').trim();
    clearBuyerSectionContent();
    if (!name) {
      var card = document.createElement('div');
      card.className = 'card';
      card.id = 'buyer-card';
      var img = document.createElement('img');
      img.src = 'assets/image-men-holding-an-invoice.webp';
      img.alt = 'Buyer details illustration';
      img.className = 'card-image';
      img.width = 248;
      var h3 = document.createElement('h3');
      h3.id = 'buyer-card-summary';
      h3.textContent = 'Enter your customers details';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--primary btn--icon-left';
      btn.setAttribute('data-buyer-modal-trigger', '');
      btn.innerHTML = '<span class="material-symbols-rounded btn__icon" aria-hidden="true">add</span><span class="btn__label">Add details</span>';
      card.appendChild(img);
      card.appendChild(h3);
      card.appendChild(btn);
      content.appendChild(card);
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'buyer-summary';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-atomic', 'true');
    var h4 = document.createElement('h4');
    h4.className = 'buyer-summary__title';
    h4.textContent = name;
    wrap.appendChild(h4);
    var reg = (b.legalRegistrationId || '').trim();
    var vat = (b.vatId || '').trim();
    if (reg || vat) {
      var identityParts = [];
      if (reg) identityParts.push('Registration number: ' + reg);
      if (vat) identityParts.push('Tax number: ' + vat);
      var pId = document.createElement('p');
      pId.className = 'buyer-summary__text';
      pId.textContent = identityParts.join(', ');
      wrap.appendChild(pId);
    }
    var line1 = (a.line1 || '').trim();
    var city = (a.city || '').trim();
    var postal = (a.postalCode || '').trim() || '';
    var cc = (a.countryCode || '').trim();
    var countryName = cc;
    if (cc && window.InvioCountries && window.InvioCountries.findByIso2) {
      var countryObj = window.InvioCountries.findByIso2(cc);
      if (countryObj && countryObj.name) countryName = countryObj.name;
    }
    if (line1 || city || postal || countryName) {
      var parts = [line1, city, postal, countryName].filter(Boolean);
      var addrLine = parts.join(', ');
      var pAddr = document.createElement('p');
      pAddr.className = 'buyer-summary__text';
      pAddr.setAttribute('aria-label', 'Address');
      pAddr.textContent = addrLine;
      wrap.appendChild(pAddr);
    }
    if (p.meansTypeCode === '30' && p.accounts && p.accounts.length) {
      p.accounts.forEach(function (acc, idx) {
        var iban = (acc.accountId || '').trim();
        if (!iban) return;
        var bankName = (acc.bankName || '').trim() || '';
        var line = bankName ? iban + ' – ' + bankName : iban;
        var pBank = document.createElement('p');
        pBank.className = 'buyer-summary__text';
        if (idx === 0) pBank.setAttribute('aria-label', 'Bank account');
        pBank.textContent = line;
        wrap.appendChild(pBank);
      });
    }
    var phone = (c.phone || '').trim();
    var email = (c.email || '').trim();
    if (phone || email) {
      var contactParts = [];
      if (phone) contactParts.push('Phone: ' + phone);
      if (email) contactParts.push('Email: ' + email);
      var pContact = document.createElement('p');
      pContact.className = 'buyer-summary__text';
      pContact.setAttribute('aria-label', 'Contacts');
      pContact.textContent = contactParts.join(' ');
      wrap.appendChild(pContact);
    }
    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--secondary buyer-summary__edit';
    editBtn.setAttribute('data-buyer-modal-trigger', '');
    editBtn.innerHTML = '<span class="btn__label">Edit</span>';
    editBtn.setAttribute('aria-label', 'Edit buyer details');
    wrap.appendChild(editBtn);
    content.appendChild(wrap);
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target) return;
    var modalTrigger = target.closest('[data-seller-modal-trigger]');
    if (modalTrigger) {
      event.preventDefault();
      openSellerModal();
      return;
    }
    var buyerModalTrigger = target.closest('[data-buyer-modal-trigger]');
    if (buyerModalTrigger) {
      event.preventDefault();
      openBuyerModal();
      return;
    }
    var closeTrigger = target.closest('#seller-cancel, #seller-close');
    if (closeTrigger) {
      event.preventDefault();
      closeSellerModal();
      return;
    }
    var buyerCloseTrigger = target.closest('#buyer-cancel, #buyer-close');
    if (buyerCloseTrigger) {
      event.preventDefault();
      closeBuyerModal();
      return;
    }
  });
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form) return;
    if (form.id === 'seller-form') {
      event.preventDefault();
      saveSellerForm();
      return;
    }
    if (form.id === 'buyer-form') {
      event.preventDefault();
      saveBuyerForm();
      return;
    }
  });
  // Initialize native selects with local country dataset.
  loadWorldCountries().then(function () {
    fillNativeCountrySelects();
    bindNativeCountrySelectEvents();
    applyGeoPrefillIfEmpty();
    updateBuyerCardSummary();
  }).catch(function (err) {
    logError('initCountries', err);
    var statusEl = document.getElementById('countries-load-status');
    if (statusEl) {
      statusEl.textContent = 'Country list could not be loaded. You can still use the form with the available options.';
      statusEl.hidden = false;
    }
    fillNativeCountrySelects();
    bindNativeCountrySelectEvents();
    applyGeoPrefillIfEmpty();
    updateBuyerCardSummary();
  });
})();
