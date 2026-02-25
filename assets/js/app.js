console.log('hello');

(function () {
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
      .catch(function () {
        worldCountriesCache = [];
        return worldCountriesCache;
      });
    return worldCountriesPromise;
  }

  function normalizePhoneValue(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function applyDialCodeToPhoneInput(dialCode) {
    var phoneInput = document.getElementById('seller-phone');
    if (!phoneInput || !dialCode) return;
    var current = normalizePhoneValue(phoneInput.value);
    var localPart = current.replace(/^\+\d+\s*/, '');
    phoneInput.value = localPart ? (dialCode + ' ' + localPart) : (dialCode + ' ');
  }

  function updatePhoneCountryDisplay(iso2) {
    var dialEl = document.getElementById('seller-phone-country-dial');
    var displayEl = document.getElementById('seller-phone-country-display');
    if (!displayEl) return;
    var emojiEl = displayEl.querySelector('.phone-country-emoji');
    var country = findCountryByIso2(iso2);
    if (emojiEl) emojiEl.textContent = country ? countryEmojiFromIso2(country.iso2) : '';
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

  function fillNativeCountrySelects() {
    var addressSelect = document.getElementById('seller-country');
    var phoneSelect = document.getElementById('seller-phone-country');
    if (!addressSelect || !phoneSelect) return;

    addressSelect.length = 1;
    phoneSelect.length = 1;

    worldCountriesCache.forEach(function (country) {
      var addressOption = document.createElement('option');
      addressOption.value = country.iso2;
      addressOption.textContent = countryEmojiFromIso2(country.iso2) + ' ' + country.name + ' (' + country.iso2 + ')';
      addressSelect.appendChild(addressOption);

      var phoneOption = document.createElement('option');
      phoneOption.value = country.iso2;
      phoneOption.textContent = countryEmojiFromIso2(country.iso2) + ' ' + country.name + ' (' + country.dialCode + ')';
      phoneSelect.appendChild(phoneOption);
    });
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

  function bindNativeCountrySelectEvents() {
    var addressSelect = document.getElementById('seller-country');
    var phoneSelect = document.getElementById('seller-phone-country');
    if (!addressSelect || !phoneSelect) return;

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
  var sellerIbanList = null;
  var sellerAddIbanLink = null;
  var sellerIbanBlock = null;
  var sellerCancelBtn = null;
  var sellerCloseBtn = null;
  var paymentMeansRadios = document.querySelectorAll('input[name="payment-means"]');

  function cacheSellerElements() {
    sellerForm = document.getElementById('seller-form');
    sellerCountryInput = document.getElementById('seller-country');
    sellerIbanList = document.getElementById('seller-iban-list');
    sellerAddIbanLink = document.getElementById('seller-add-iban');
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

  function openSellerModal() {
    if (!sellerBottomSheet) return;
    if (!sellerForm) cacheSellerElements();
    if (!sellerForm) return;
    initSellerSheetAlpine();
    var s = draft.seller || {};
    var a = s.address || {};
    var c = s.contact || {};
    var p = draft.payment || {};
    document.getElementById('seller-name').value = s.name || '';
    document.getElementById('seller-registration').value = s.legalRegistrationId || '';
    document.getElementById('seller-vat').value = s.vatId || '';
    document.getElementById('seller-street').value = a.line1 || '';
    document.getElementById('seller-city').value = a.city || '';
    document.getElementById('seller-postal').value = a.postalCode || '';
    document.getElementById('seller-phone').value = c.phone || '';
    var sellerPhoneCountryInput = document.getElementById('seller-phone-country');
    document.getElementById('seller-email').value = c.email || '';
    var countryCode = (a.countryCode || '').toUpperCase();
    if (sellerCountryInput) sellerCountryInput.value = countryCode || '';

    if (sellerPhoneCountryInput) {
      var phoneCountry = detectCountryByPhone(c.phone || '');
      sellerPhoneCountryInput.value = phoneCountry ? phoneCountry.iso2 : '';
      if (!sellerPhoneCountryInput.value && countryCode) sellerPhoneCountryInput.value = countryCode;
      updatePhoneCountryDisplay(sellerPhoneCountryInput.value);
    }

    applyGeoPrefillIfEmpty();

    var sheetRoot = document.querySelector('.seller-bottom-sheet');
    if (sheetRoot) sheetRoot.removeAttribute('inert');

    var means = (p.meansTypeCode || '30').toString();
    var radio = document.querySelector('input[name="payment-means"][value="' + means + '"]');
    if (radio) radio.checked = true;
    sellerIbanBlock.hidden = means !== '30';
    renderIbanList(p.accounts && p.accounts.length ? p.accounts : (p.accountId ? [{ accountId: p.accountId, bankName: p.bankName || null }] : [{ accountId: '', bankName: null }]));
    hideFieldErrors();
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

  function renderIbanList(accounts) {
    if (!sellerIbanList) return;
    sellerIbanList.innerHTML = '';
    (accounts || [{ accountId: '', bankName: null }]).forEach(function (acc, index) {
      var div = document.createElement('div');
      div.className = 'iban-item';
      var id = 'seller-iban-' + index;
      var bankId = 'seller-iban-bank-' + index;
      div.innerHTML = '<label class="field form-field">' +
        '<span class="form-label">IBAN</span>' +
        '<input class="form-control" type="text" name="iban-' + index + '" id="' + id + '" placeholder="e.g. LV80BANK0000435195001" aria-label="IBAN" aria-invalid="false">' +
        '</label>' +
        '<label class="field form-field">' +
        '<span class="form-label">Bank name or notes</span>' +
        '<input class="form-control" type="text" name="iban-bank-' + index + '" id="' + bankId + '" placeholder="Bank name or notes" aria-label="Bank name or notes">' +
        '</label>' +
        '<div class="iban-row-actions">' +
        '<a href="#" role="button" class="btn btn--transparent link-remove-iban" data-iban-index="' + index + '"><span class="btn__label">Remove</span></a>' +
        '</div>';
      sellerIbanList.appendChild(div);
      var input = document.getElementById(id);
      var bankInput = document.getElementById(bankId);
      if (input) input.value = (acc && acc.accountId) ? acc.accountId : '';
      if (bankInput) bankInput.value = (acc && acc.bankName) ? acc.bankName : '';
      var removeLink = div.querySelector('.link-remove-iban');
      if (removeLink) {
        removeLink.addEventListener('click', function (e) {
          e.preventDefault();
          div.remove();
        });
      }
    });
  }

  function addIbanRow(e) {
    if (e) e.preventDefault();
    var items = sellerIbanList ? sellerIbanList.querySelectorAll('.iban-item') : [];
    var index = items.length;
    var div = document.createElement('div');
    div.className = 'iban-item';
    var id = 'seller-iban-' + index;
    var bankId = 'seller-iban-bank-' + index;
    div.innerHTML = '<label class="field form-field">' +
      '<span class="form-label">IBAN</span>' +
      '<input class="form-control" type="text" name="iban-' + index + '" id="' + id + '" placeholder="e.g. LV80BANK0000435195001" aria-label="IBAN" aria-invalid="false">' +
      '</label>' +
      '<label class="field form-field">' +
      '<span class="form-label">Bank name or notes</span>' +
      '<input class="form-control" type="text" name="iban-bank-' + index + '" id="' + bankId + '" placeholder="Bank name or notes" aria-label="Bank name or notes">' +
      '</label>' +
      '<div class="iban-row-actions">' +
      '<a href="#" role="button" class="btn btn--transparent link-remove-iban" data-iban-index="' + index + '"><span class="btn__label">Remove</span></a>' +
      '</div>';
    sellerIbanList.appendChild(div);
    var removeLink = div.querySelector('.link-remove-iban');
    if (removeLink) {
      removeLink.addEventListener('click', function (ev) {
        ev.preventDefault();
        div.remove();
      });
    }
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
  }

  function hideFieldErrors() {
    ['seller-registration', 'seller-vat', 'seller-phone', 'seller-email'].forEach(function (id) {
      var err = document.getElementById(id + '-error');
      if (err) { err.hidden = true; err.textContent = ''; }
      syncFieldErrorA11y(id, false);
    });
  }

  function showFieldError(id, message) {
    var err = document.getElementById(id + '-error');
    if (err) { err.textContent = message || ''; err.hidden = !message; }
    syncFieldErrorA11y(id, !!message);
  }

  function validateSellerForm() {
    var countryCode = sellerCountryInput ? parseCountryCodeFromInput(sellerCountryInput.value) : '';
    var reg = document.getElementById('seller-registration').value;
    var vat = document.getElementById('seller-vat').value;
    var phone = document.getElementById('seller-phone').value;
    var email = document.getElementById('seller-email').value;
    var valid = true;
    hideFieldErrors();
    var v = window.InvioValidation;
    if (v && v.validRegistrationId && !v.validRegistrationId(reg, countryCode)) {
      showFieldError('seller-registration', 'Invalid registration number for selected country');
      valid = false;
    }
    if (v && v.validVatId && vat && !v.validVatId(vat, countryCode)) {
      showFieldError('seller-vat', 'Invalid VAT number for selected country');
      valid = false;
    }
    if (v && v.validPhone && phone && !v.validPhone(phone, countryCode)) {
      showFieldError('seller-phone', 'Invalid phone number');
      valid = false;
    }
    if (v && v.validEmailRejectTemp && email && !v.validEmailRejectTemp(email)) {
      if (v.validEmail && !v.validEmail(email)) showFieldError('seller-email', 'Invalid email address');
      else showFieldError('seller-email', 'Temporary email domains are not allowed');
      valid = false;
    }
    var means = (document.querySelector('input[name="payment-means"]:checked') || {}).value || '30';
    if (means === '30') {
      var ibanInputs = sellerIbanList ? sellerIbanList.querySelectorAll('input[id^="seller-iban-"]:not([id*="bank"])') : [];
      var hasOne = false;
      var allValid = true;
      ibanInputs.forEach(function (inp) {
        var val = inp.value.trim();
        if (val) {
          hasOne = true;
          if (v && v.validIban && !v.validIban(val)) allValid = false;
        }
      });
      var ibanErr = document.getElementById('seller-iban-error');
      if (ibanErr) {
        ibanErr.hidden = true;
        ibanErr.textContent = '';
      }
      if (sellerIbanBlock) sellerIbanBlock.classList.remove('has-error');
      ibanInputs.forEach(function (inp) {
        inp.setAttribute('aria-invalid', 'false');
        inp.removeAttribute('aria-describedby');
      });
      if (!hasOne) {
        if (ibanErr) { ibanErr.textContent = 'At least one IBAN is required for credit transfer'; ibanErr.hidden = false; }
        if (sellerIbanBlock) sellerIbanBlock.classList.add('has-error');
        ibanInputs.forEach(function (inp) {
          inp.setAttribute('aria-invalid', 'true');
          if (ibanErr) inp.setAttribute('aria-describedby', ibanErr.id);
        });
        valid = false;
      } else if (!allValid && v) {
        if (ibanErr) { ibanErr.textContent = 'All IBANs must be valid'; ibanErr.hidden = false; }
        if (sellerIbanBlock) sellerIbanBlock.classList.add('has-error');
        ibanInputs.forEach(function (inp) {
          if (v.validIban && inp.value.trim() && !v.validIban(inp.value.trim())) {
            inp.setAttribute('aria-invalid', 'true');
            if (ibanErr) inp.setAttribute('aria-describedby', ibanErr.id);
          }
        });
        valid = false;
      }
    }
    return valid;
  }

  function saveSellerForm() {
    if (!validateSellerForm()) return;
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
    c.phone = (document.getElementById('seller-phone') && document.getElementById('seller-phone').value) || null;
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
      var ibanItems = sellerIbanList ? sellerIbanList.querySelectorAll('.iban-item') : [];
      var accounts = [];
      ibanItems.forEach(function (item) {
        var ibanInp = item.querySelector('input[id^="seller-iban-"]:not([id*="bank"])');
        var bankInp = item.querySelector('input[id^="seller-iban-bank-"]');
        var val = ibanInp ? ibanInp.value.trim() : '';
        if (val) {
          var bankName = bankInp ? bankInp.value.trim() || null : null;
          accounts.push({ accountId: val, bankName: bankName });
        }
      });
      draft.payment.accounts = accounts.length ? accounts : [];
      draft.payment.accountId = draft.payment.accounts[0] ? draft.payment.accounts[0].accountId : null;
      draft.payment.bankName = draft.payment.accounts[0] ? draft.payment.accounts[0].bankName : null;
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
      summaryEl.textContent = 'Enter you business details';
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
    var addIbanTrigger = target.closest('#seller-add-iban');
    if (addIbanTrigger) {
      addIbanRow(event);
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
  });
})();
