(function () {
  'use strict';

  var C = function () { return window.Invio && window.Invio.countries || {}; };

  function setFormValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
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
        var current = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).filter(function (t) { return t !== err.id; });
        if (current.length) { base = current.join(' '); input.setAttribute('data-describedby-base', base); }
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

  function showFieldError(id, message) {
    var err = document.getElementById(id + '-error');
    if (err) { err.textContent = message || ''; err.hidden = !message; err.removeAttribute('x-cloak'); }
    var hintEl = document.getElementById(id + '-hint');
    if (hintEl) hintEl.hidden = !!message;
    var formatHint = document.getElementById(id + '-format-hint');
    if (formatHint) formatHint.hidden = true;
    syncFieldErrorA11y(id, !!message);
  }

  var FIELD_IDS = ['country', 'name', 'registration', 'vat', 'street', 'city', 'postal', 'phone', 'email', 'website'];

  function hideFieldErrors(role) {
    FIELD_IDS.forEach(function (f) {
      var id = role + '-' + f;
      var err = document.getElementById(id + '-error');
      if (err) { err.hidden = true; err.textContent = ''; }
      syncFieldErrorA11y(id, false);
    });
    updateRegistrationVatHints(role);
  }

  function showFormAlert(role, show) {
    var alertKey = role + 'FormAlert';
    var store = typeof Alpine !== 'undefined' && Alpine.store && Alpine.store(alertKey);
    if (store) {
      store.show = !!show;
      store.message = show ? 'Please correct the highlighted fields.' : '';
    }
    if (show) {
      requestAnimationFrame(function () {
        var alertEl = document.getElementById(role + '-form-errors');
        var sheet = document.querySelector('.' + role + '-bottom-sheet');
        if (sheet) sheet.scrollTop = 0;
        if (alertEl) alertEl.focus();
      });
    }
  }

  function getPaymentMeansFromGeneral() {
    var sel = document.getElementById('payment-type-select');
    var draft = window.__invioDraft;
    return (sel && sel.value) ? sel.value : (draft && draft.payment && draft.payment.meansTypeCode) || '30';
  }

  function updateRegistrationVatHints(role) {
    var countryInput = document.getElementById(role + '-country');
    var countryCode = countryInput ? (C().parseCountryCodeFromInput || function (v) { return (v || '').toUpperCase(); })(countryInput.value) : '';
    var regEl = document.getElementById(role + '-registration');
    var vatEl = document.getElementById(role + '-vat');
    var regHint = document.getElementById(role + '-registration-format-hint');
    var vatHint = document.getElementById(role + '-vat-format-hint');
    var v = window.InvioValidation;
    if (regHint && regEl && v && v.registrationLengthMismatch) {
      var regVal = (regEl.value || '').trim();
      regHint.hidden = !(regVal.length >= 6 && countryCode && v.registrationLengthMismatch(regVal, countryCode));
    }
    if (vatHint && vatEl && v && v.vatLengthMismatch) {
      var vatVal = (vatEl.value || '').trim();
      vatHint.hidden = !(vatVal.length >= 6 && countryCode && v.vatLengthMismatch(vatVal, countryCode));
    }
  }

  function validateEntityForm(role) {
    var countryInput = document.getElementById(role + '-country');
    var countryCode = countryInput ? (C().parseCountryCodeFromInput || function (v) { return (v || '').toUpperCase(); })(countryInput.value) : '';
    var countryRaw = countryInput ? (countryInput.value || '').trim() : '';
    var regEl = document.getElementById(role + '-registration');
    var regField = regEl && regEl.closest('.form-field');
    var isOrganisation = regField && regField.offsetParent !== null;
    var reg = regEl ? regEl.value : '';
    var nameEl = document.getElementById(role + '-name');
    var name = nameEl ? nameEl.value.trim() : '';
    var streetEl = document.getElementById(role + '-street');
    var street = streetEl ? streetEl.value.trim() : '';
    var cityEl = document.getElementById(role + '-city');
    var city = cityEl ? cityEl.value.trim() : '';
    var postalEl = document.getElementById(role + '-postal');
    var postal = postalEl ? postalEl.value.trim() : '';
    var vatEl = document.getElementById(role + '-vat');
    var vat = vatEl ? vatEl.value.trim() : '';
    var phone = C().getComposedPhoneValue ? C().getComposedPhoneValue(role) : '';
    var emailEl = document.getElementById(role + '-email');
    var email = emailEl ? emailEl.value : '';
    var valid = true;
    var pfx = role + '-';

    hideFieldErrors(role);

    if (!countryRaw) { showFieldError(pfx + 'country', 'Country is required'); valid = false; }
    if (!name) { showFieldError(pfx + 'name', isOrganisation ? 'Legal name is required' : 'Name and surname is required'); valid = false; }
    if (isOrganisation) {
      if (!reg) { showFieldError(pfx + 'registration', 'Registration number is required'); valid = false; }
    } else {
      if (!vat) { showFieldError(pfx + 'vat', 'Tax number is required'); valid = false; }
    }
    if (!street) { showFieldError(pfx + 'street', 'Address is required'); valid = false; }
    if (!city) { showFieldError(pfx + 'city', 'City is required'); valid = false; }
    if (!postal) { showFieldError(pfx + 'postal', 'Postal code is required'); valid = false; }

    var v = window.InvioValidation;
    var phoneCountrySelect = document.getElementById(role + '-phone-country');
    var phoneDialCode = '';
    if (phoneCountrySelect && C().findByIso2) {
      var phoneCountry = C().findByIso2(phoneCountrySelect.value);
      phoneDialCode = phoneCountry ? phoneCountry.dialCode : '';
    }
    if (v && v.validPhone && phone && !v.validPhone(phone, phoneDialCode)) {
      showFieldError(pfx + 'phone', 'Invalid phone number'); valid = false;
    }
    if (email && v && v.validEmail && !v.validEmail(email)) {
      showFieldError(pfx + 'email', 'Invalid email address'); valid = false;
    }
    var websiteEl = document.getElementById(role + '-website');
    var website = websiteEl ? websiteEl.value.trim() : '';
    if (website && v && v.validWebsite && !v.validWebsite(website)) {
      showFieldError(pfx + 'website', 'Enter a valid http or https URL'); valid = false;
    }

    var means = getPaymentMeansFromGeneral();
    var storeKey = role + 'BankAccounts';
    var ibanBlock = document.getElementById(role + '-iban-block');
    if (means === '30') {
      var accounts = (typeof Alpine !== 'undefined' && Alpine.store) ? Alpine.store(storeKey) : [];
      var hasOne = false;
      var i;
      for (i = 0; i < accounts.length; i++) {
        if ((accounts[i].iban || '').trim()) hasOne = true;
      }
      var ibanErr = document.getElementById(role + '-iban-error');
      if (ibanErr) { ibanErr.hidden = true; ibanErr.textContent = ''; }
      if (ibanBlock) ibanBlock.classList.remove('has-error');
      var requireIban = role === 'seller';
      if (requireIban && !hasOne) {
        if (ibanErr) { ibanErr.textContent = 'At least one IBAN is required for credit transfer'; ibanErr.hidden = false; }
        if (ibanBlock) ibanBlock.classList.add('has-error');
        valid = false;
      }
    }
    return valid;
  }

  function updatePaymentMeansDisplayName() {
    var draft = window.__invioDraft;
    if (!draft) return;
    var means = (draft.payment && draft.payment.meansTypeCode) || '30';
    draft.payment = draft.payment || {};
    if (means === '10') draft.payment.paymentMeansDisplayName = 'Paid by Cash';
    else if (means === '48') draft.payment.paymentMeansDisplayName = 'Paid by Credit Card';
    else draft.payment.paymentMeansDisplayName = 'Bank Transfer';
  }

  function buildEntitySummaryHTML(role, entity, payment) {
    var a = entity.address || {};
    var c = entity.contact || {};
    var name = (entity.name || '').trim();
    var imgSrc = role === 'seller' ? 'assets/img/invoice-stack.webp' : 'assets/img/invoice-stack-signed.webp';
    var imgAlt = role === 'seller' ? 'Seller details illustration' : 'Buyer details illustration';
    var emptyText = role === 'seller' ? 'Enter your business details' : 'Enter your customers details';
    var triggerAttr = 'data-' + role + '-modal-trigger';

    if (!name) {
      return '<div class="card" id="' + role + '-card">' +
        '<img src="' + imgSrc + '" alt="' + imgAlt + '" class="card-image" width="248" height="auto">' +
        '<h3 id="' + role + '-card-summary">' + emptyText + '</h3>' +
        '<button type="button" class="btn btn--primary" ' + triggerAttr + '><span class="btn__label">Add details</span></button></div>';
    }

    var html = '<div class="' + role + '-summary" aria-live="polite" aria-atomic="true">';
    html += '<h4 class="' + role + '-summary__title">' + escapeHtml(name) + '</h4>';

    var reg = (entity.legalRegistrationId || '').trim();
    if (reg) {
      html += '<p class="' + role + '-summary__text"><span class="summary__label">Registration number:</span> ' + escapeHtml(reg) + '</p>';
    }

    var vat = (entity.vatId || '').trim();
    if (vat) {
      html += '<p class="' + role + '-summary__text"><span class="summary__label">Tax ID:</span> ' + escapeHtml(vat) + '</p>';
    }

    var line1 = (a.line1 || '').trim();
    var city = (a.city || '').trim();
    var postal = (a.postalCode || '').trim();
    var cc = (a.countryCode || '').trim();
    var countryName = cc;
    if (cc && C().findByIso2) {
      var co = C().findByIso2(cc);
      if (co && co.name) countryName = co.name;
    }
    if (line1 || city || postal || countryName) {
      html += '<p class="' + role + '-summary__text" aria-label="Address"><span class="summary__label">Address:</span> ' + escapeHtml([line1, city, postal, countryName].filter(Boolean).join(', ')) + '</p>';
    }

    var bankAccounts = role === 'seller'
      ? (payment && payment.meansTypeCode === '30' && payment.accounts ? payment.accounts : [])
      : (payment && payment.meansTypeCode === '30' && entity.bankAccounts ? entity.bankAccounts : []);
    bankAccounts.forEach(function (acc, idx) {
      var iban = (acc.accountId || '').trim();
      if (!iban) return;
      var bn = (acc.bankName || '').trim();
      var line = bn ? iban + ' \u2013 ' + bn : iban;
      html += '<p class="' + role + '-summary__text"' + (idx === 0 ? ' aria-label="Bank account"' : '') + '><span class="summary__label">Bank account:</span> ' + escapeHtml(line) + '</p>';
    });

    var phone = (c.phone || '').trim();
    var email = (c.email || '').trim();
    var websiteDisplay = (c.website && window.InvioValidation && window.InvioValidation.urlToDisplayDomain)
      ? window.InvioValidation.urlToDisplayDomain(c.website) : '';
    if (phone) {
      html += '<p class="' + role + '-summary__text"><span class="summary__label">Phone:</span> ' + escapeHtml(phone) + '</p>';
    }
    if (email) {
      html += '<p class="' + role + '-summary__text"><span class="summary__label">Email:</span> ' + escapeHtml(email) + '</p>';
    }
    if (websiteDisplay) {
      html += '<p class="' + role + '-summary__text"><span class="summary__label">Website:</span> ' + escapeHtml(websiteDisplay) + '</p>';
    }

    html += '<button type="button" class="btn btn--secondary ' + role + '-summary__edit" ' + triggerAttr + ' aria-label="Edit ' + role + ' details"><span class="btn__label">Edit</span></button>';
    html += '</div>';
    return html;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function updateCardSummary(role) {
    var draft = window.__invioDraft;
    if (!draft) return;
    var section = document.getElementById(role + '-section');
    if (!section) return;
    var content = section.querySelector('.section-content');
    if (!content) return;
    var entity = draft[role] || {};
    var payment = draft.payment || {};
    content.innerHTML = buildEntitySummaryHTML(role, entity, payment);
  }

  /**
   * Creates a modal manager for the given role ('seller' | 'buyer').
   */
  function createModalManager(role) {
    var sheetTemplate = document.getElementById(role + '-sheet-template');
    var bottomSheet = null;
    var form = null;
    var countryInput = null;
    var ibanBlock = null;
    var hintRefs = { reg: null, vat: null, country: null, handler: null };
    var lastTrigger = null;
    var focusTrapHandler = null;

    function cacheElements() {
      form = document.getElementById(role + '-form');
      countryInput = document.getElementById(role + '-country');
      ibanBlock = document.getElementById(role + '-iban-block');
    }

    function initSheetAlpine() {
      if (!window.Alpine || !form) return;
      var sheetRoot = form.closest('.' + role + '-bottom-sheet');
      if (!sheetRoot || sheetRoot.__alpineInit) return;
      window.Alpine.initTree(sheetRoot);
      sheetRoot.__alpineInit = true;
    }

    function mount() {
      if (!sheetTemplate || !window.BottomSheet || !window.BottomSheet.createBottomSheet) return;
      bottomSheet = window.BottomSheet.createBottomSheet({
        content: sheetTemplate.innerHTML,
        shouldShowHandle: false,
        backdropColor: 'oklch(0 0 0 / 0.4)',
        rootClass: role + '-sheet-root',
        containerClass: role + '-sheet-container',
        contentWrapperClass: role + '-sheet-content-wrapper'
      });
      bottomSheet.mount();
      cacheElements();
      initSheetAlpine();
      var root = document.querySelector('.' + role + '-bottom-sheet');
      if (root) root.setAttribute('inert', '');
    }

    function getFocusables() {
      if (!form) return [];
      var sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.prototype.slice.call(form.querySelectorAll(sel));
    }

    function open() {
      if (!bottomSheet) return;
      if (!form) cacheElements();
      if (!form) return;
      lastTrigger = document.activeElement;
      initSheetAlpine();

      var draft = window.__invioDraft;
      if (!draft) return;

      var entity = draft[role] || {};
      var addr = entity.address || {};
      var contact = entity.contact || {};

      setFormValue(role + '-name', entity.name);
      setFormValue(role + '-registration', entity.legalRegistrationId);
      setFormValue(role + '-vat', entity.vatId);
      setFormValue(role + '-street', addr.line1);
      setFormValue(role + '-city', addr.city);
      setFormValue(role + '-postal', addr.postalCode);

      var localPhone = C().getLocalPartFromFullPhone ? C().getLocalPartFromFullPhone(contact.phone || '') : (contact.phone || '');
      setFormValue(role + '-phone', localPhone);
      setFormValue(role + '-email', contact.email);
      setFormValue(role + '-website', contact.website);

      var phoneCountryInput = document.getElementById(role + '-phone-country');
      var cc = (addr.countryCode || '').toUpperCase();
      if (countryInput) countryInput.value = cc || '';

      if (phoneCountryInput && C().detectCountryByPhone) {
        var phoneCountry = C().detectCountryByPhone(contact.phone || '');
        phoneCountryInput.value = phoneCountry ? phoneCountry.iso2 : '';
        if (!phoneCountryInput.value && cc) phoneCountryInput.value = cc;
        if (C().updatePhoneCountryDisplay) C().updatePhoneCountryDisplay(role, phoneCountryInput.value);
      }

      if (C().applyGeoPrefillIfEmpty) C().applyGeoPrefillIfEmpty(role);
      var finalCountry = countryInput ? countryInput.value : '';
      if (C().updateAddressCountryDisplay) C().updateAddressCountryDisplay(role, finalCountry || '');

      var root = document.querySelector('.' + role + '-bottom-sheet');
      if (root) root.removeAttribute('inert');

      var payment = draft.payment || {};
      var means = (payment.meansTypeCode || '30').toString();
      var paymentTypeSelect = document.getElementById('payment-type-select');
      if (paymentTypeSelect) paymentTypeSelect.value = means;

      applyPaymentDetailsVisibility(means);

      var rawAccounts;
      if (role === 'seller') {
        rawAccounts = (payment.accounts && payment.accounts.length)
          ? payment.accounts
          : (payment.accountId ? [{ accountId: payment.accountId, bankName: payment.bankName || null }] : [{ accountId: '', bankName: null }]);
      } else {
        rawAccounts = (entity.bankAccounts && entity.bankAccounts.length)
          ? entity.bankAccounts
          : [{ accountId: '', bankName: null }];
      }

      var normalized = rawAccounts.map(function (acc, idx) {
        return {
          iban: (acc.accountId || '').trim(),
          bankName: (acc.bankName || '').trim() || '',
          ibanError: '',
          ibanHint: '',
          _id: acc._id || 'iban-' + Date.now() + '-' + idx
        };
      });
      if (!normalized.length) normalized = [{ iban: '', bankName: '', ibanError: '', ibanHint: '', _id: 'iban-' + Date.now() + '-0' }];

      var storeKey = role + 'BankAccounts';
      if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store(storeKey)) {
        var store = Alpine.store(storeKey);
        store.splice(0, store.length);
        normalized.forEach(function (acc) { store.push(acc); });
      }

      hideFieldErrors(role);
      showFormAlert(role, false);
      var ibanErrEl = document.getElementById(role + '-iban-error');
      if (ibanErrEl) { ibanErrEl.hidden = true; ibanErrEl.textContent = ''; }

      hintRefs.reg = document.getElementById(role + '-registration');
      hintRefs.vat = document.getElementById(role + '-vat');
      hintRefs.country = document.getElementById(role + '-country');
      hintRefs.handler = function () { updateRegistrationVatHints(role); };
      if (hintRefs.reg) {
        hintRefs.reg.addEventListener('input', hintRefs.handler);
        hintRefs.reg.addEventListener('blur', hintRefs.handler);
      }
      if (hintRefs.vat) {
        hintRefs.vat.addEventListener('input', hintRefs.handler);
        hintRefs.vat.addEventListener('blur', hintRefs.handler);
      }
      if (hintRefs.country) hintRefs.country.addEventListener('change', hintRefs.handler);
      updateRegistrationVatHints(role);

      bottomSheet.open();

      var modalRoot = document.querySelector('.' + role + '-bottom-sheet');
      if (modalRoot && !focusTrapHandler) {
        focusTrapHandler = function (e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
            return;
          }
          if (e.key !== 'Tab') return;
          var focusables = getFocusables();
          if (!focusables.length) return;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        };
        modalRoot.addEventListener('keydown', focusTrapHandler);
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var first = getFocusables()[0];
          if (first) first.focus();
        });
      });
    }

    function close() {
      if (!bottomSheet) return;
      if (focusTrapHandler) {
        var modalRoot = document.querySelector('.' + role + '-bottom-sheet');
        if (modalRoot) modalRoot.removeEventListener('keydown', focusTrapHandler);
        focusTrapHandler = null;
      }
      if (hintRefs.reg) {
        hintRefs.reg.removeEventListener('input', hintRefs.handler);
        hintRefs.reg.removeEventListener('blur', hintRefs.handler);
        hintRefs.reg = null;
      }
      if (hintRefs.vat) {
        hintRefs.vat.removeEventListener('input', hintRefs.handler);
        hintRefs.vat.removeEventListener('blur', hintRefs.handler);
        hintRefs.vat = null;
      }
      if (hintRefs.country) {
        hintRefs.country.removeEventListener('change', hintRefs.handler);
        hintRefs.country = null;
      }
      bottomSheet.close();
      var root = document.querySelector('.' + role + '-bottom-sheet');
      if (root) root.setAttribute('inert', '');
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

    function save() {
      if (!validateEntityForm(role)) {
        showFormAlert(role, true);
        return;
      }
      showFormAlert(role, false);

      var draft = window.__invioDraft;
      if (!draft) return;

      if (!draft[role]) draft[role] = {};
      var entity = draft[role];
      if (!entity.address) entity.address = {};
      if (!entity.contact) entity.contact = {};
      var addr = entity.address;
      var contact = entity.contact;

      entity.name = (document.getElementById(role + '-name') && document.getElementById(role + '-name').value) || '';
      entity.legalRegistrationId = (document.getElementById(role + '-registration') && document.getElementById(role + '-registration').value) || null;
      entity.vatId = (document.getElementById(role + '-vat') && document.getElementById(role + '-vat').value) || null;
      if (!entity.vatId || !entity.vatId.trim()) entity.vatId = null;
      addr.line1 = (document.getElementById(role + '-street') && document.getElementById(role + '-street').value) || '';
      addr.city = (document.getElementById(role + '-city') && document.getElementById(role + '-city').value) || '';
      addr.postalCode = (document.getElementById(role + '-postal') && document.getElementById(role + '-postal').value) || null;
      addr.countryCode = countryInput ? (C().parseCountryCodeFromInput || function (v) { return (v || '').toUpperCase(); })(countryInput.value) : '';

      var composedPhone = C().getComposedPhoneValue ? C().getComposedPhoneValue(role) : '';
      contact.phone = composedPhone || null;
      if (!contact.phone || !contact.phone.trim()) contact.phone = null;
      contact.email = (document.getElementById(role + '-email') && document.getElementById(role + '-email').value) || null;
      if (!contact.email || !contact.email.trim()) contact.email = null;
      var websiteRaw = (document.getElementById(role + '-website') && document.getElementById(role + '-website').value) || '';
      contact.website = (websiteRaw && window.InvioValidation && window.InvioValidation.normalizeWebsiteUrl)
        ? window.InvioValidation.normalizeWebsiteUrl(websiteRaw)
        : (websiteRaw.trim() || null);
      if (!contact.website) contact.website = null;

      var means = getPaymentMeansFromGeneral();
      if (!draft.payment) draft.payment = {};
      draft.payment.meansTypeCode = means;
      updatePaymentMeansDisplayName();

      var storeKey = role + 'BankAccounts';
      if (means === '30') {
        var storeAccounts = (typeof Alpine !== 'undefined' && Alpine.store) ? Alpine.store(storeKey) : [];
        var accounts = storeAccounts.map(function (acc) {
          return { accountId: (acc.iban || '').trim(), bankName: (acc.bankName || '').trim() || null };
        }).filter(function (a) { return a.accountId; });

        if (role === 'seller') {
          draft.payment.accounts = accounts;
          draft.payment.accountId = accounts[0] ? accounts[0].accountId : null;
          draft.payment.bankName = accounts[0] ? accounts[0].bankName : null;
        } else {
          entity.bankAccounts = accounts;
        }
      } else {
        if (role === 'seller') {
          draft.payment.accounts = [];
          draft.payment.accountId = null;
          draft.payment.bankName = null;
        } else {
          entity.bankAccounts = [];
        }
      }

      close();
      updateCardSummary(role);
      if (window.clearExportValidationState) window.clearExportValidationState();
    }

    return { mount: mount, open: open, close: close, save: save };
  }

  function querySelectorIncludingShadow(root, selector) {
    if (!root) return null;
    var el = root.querySelector(selector);
    if (el) return el;
    if (root.shadowRoot) {
      el = root.shadowRoot.querySelector(selector);
      if (el) return el;
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
    return null;
  }

  function applyPaymentDetailsVisibility(means) {
    var hideBank = means === '10' || means === '48';
    ['seller', 'buyer'].forEach(function (role) {
      var section = getElementByIdIncludingShadow(role + '-payment-details-section');
      if (section) section.hidden = hideBank;
      var block = document.getElementById(role + '-iban-block');
      if (block) block.hidden = hideBank;
    });
  }

  window.Invio = window.Invio || {};
  window.Invio.entityModal = {
    createModalManager: createModalManager,
    updateCardSummary: updateCardSummary,
    applyPaymentDetailsVisibility: applyPaymentDetailsVisibility,
    getPaymentMeansFromGeneral: getPaymentMeansFromGeneral,
    updatePaymentMeansDisplayName: updatePaymentMeansDisplayName
  };
})();
