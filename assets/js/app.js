(function () {
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
    } catch (_error) {
      // Locale lookup best-effort only.
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

  function fillNativeCountrySelects() {
    var addressSelect = document.getElementById('seller-country');
    var phoneSelect = document.getElementById('seller-phone-country');
    if (!addressSelect || !phoneSelect) return;

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
    var phoneInput = document.getElementById('seller-phone');
    if (!addressSelect || !phoneSelect) return;

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

  window.InvioCountries = window.InvioCountries || {};
  window.InvioCountries.loadCountries = loadWorldCountries;
  window.InvioCountries.getCachedCountries = function () { return worldCountriesCache; };
  window.InvioCountries.detectCountryByPhone = detectCountryByPhone;
  window.InvioCountries.applyDialCodeToPhoneInput = applyDialCodeToPhoneInput;
  window.InvioCountries.findByIso2 = findCountryByIso2;

  // --- Seller modal: dialog, focus trap, form bindings, Save/Cancel ---
  var draft = (typeof window !== 'undefined' && window.__invioDraft) ? window.__invioDraft : (window.InvioState && window.InvioState.createDefaultDraft());
  if (typeof window !== 'undefined') window.__invioDraft = draft;

  var sellerSheetTemplate = document.getElementById('seller-sheet-template');
  var sellerBottomSheet = null;
  var sellerForm = null;
  var sellerTrigger = document.querySelector('[data-seller-modal-trigger]');
  var sellerCountryInput = null;
  var sellerIbanBlock = null;
  var sellerCancelBtn = null;
  var sellerCloseBtn = null;
  var paymentMeansRadios = document.querySelectorAll('input[name="payment-means"]');

  function cacheSellerElements() {
    sellerForm = document.getElementById('seller-form');
    sellerCountryInput = document.getElementById('seller-country');
    sellerIbanBlock = document.getElementById('seller-iban-block');
    sellerCancelBtn = document.getElementById('seller-cancel');
    sellerCloseBtn = document.getElementById('seller-close');
  }

  function initSellerSheetAlpine() {
    if (!window.Alpine || !sellerForm) return;
    var sheetRoot = sellerForm.closest('.seller-bottom-sheet');
    if (!sheetRoot || sheetRoot.__sellerAlpineInit) return;
    window.Alpine.initTree(sheetRoot);
    sheetRoot.__sellerAlpineInit = true;
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

  function getFocusables() {
    if (!sellerForm) return [];
    var el = sellerForm;
    if (!el) return [];
    var sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(el.querySelectorAll(sel));
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
    var paymentRadios = document.querySelectorAll('input[name="payment-means"]');
    paymentRadios.forEach(function (r) { r.checked = r.value === means; });
    if (sellerIbanBlock) sellerIbanBlock.hidden = means !== '30';
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
    var means = (document.querySelector('input[name="payment-means"]:checked') || {}).value || '30';
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
    var means = (document.querySelector('input[name="payment-means"]:checked') || {}).value || '30';
    draft.payment = draft.payment || {};
    draft.payment.meansTypeCode = means;
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

  function updateSellerCardSummary() {
    var summaryEl = document.getElementById('seller-card-summary');
    if (!summaryEl) return;
    var s = draft.seller || {};
    var name = (s.name || '').trim();
    var country = (s.address && s.address.countryCode) ? s.address.countryCode : '';
    if (name) {
      summaryEl.textContent = country ? name + ', ' + country : name;
    } else {
      summaryEl.textContent = 'Enter your business details';
    }
  }

  if (sellerTrigger) {
    sellerTrigger.addEventListener('click', function () {
      openSellerModal();
    });
  }
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target) return;
    var closeTrigger = target.closest('#seller-cancel, #seller-close');
    if (closeTrigger) {
      event.preventDefault();
      closeSellerModal();
      return;
    }
  });
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.id !== 'seller-form') return;
    event.preventDefault();
    saveSellerForm();
  });
  if (paymentMeansRadios && paymentMeansRadios.length) {
    paymentMeansRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        draft.payment = draft.payment || {};
        draft.payment.meansTypeCode = radio.value;
      });
    });
  }

  // Initialize native selects with local country dataset.
  loadWorldCountries().then(function () {
    fillNativeCountrySelects();
    bindNativeCountrySelectEvents();
    applyGeoPrefillIfEmpty();
  }).catch(function () {
    fillNativeCountrySelects();
    bindNativeCountrySelectEvents();
    applyGeoPrefillIfEmpty();
  });
})();
