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

  // --- Seller modal: dialog, focus trap, form bindings, Save/Cancel ---
  var draft = (typeof window !== 'undefined' && window.__invioDraft) ? window.__invioDraft : (window.InvioState && window.InvioState.createDefaultDraft());
  if (typeof window !== 'undefined') window.__invioDraft = draft;

  var sellerDialog = document.getElementById('seller-dialog');
  var sellerForm = document.getElementById('seller-form');
  var sellerTrigger = document.querySelector('[data-seller-modal-trigger]');
  var sellerCountryInput = document.getElementById('seller-country');
  var sellerCountryList = document.getElementById('seller-country-list');
  var sellerIbanList = document.getElementById('seller-iban-list');
  var sellerAddIbanLink = document.getElementById('seller-add-iban');
  var sellerIbanBlock = document.getElementById('seller-iban-block');
  var sellerCancelBtn = document.getElementById('seller-cancel');
  var sellerCloseBtn = document.getElementById('seller-close');
  var sellerTabs = document.querySelectorAll('.seller-tab');
  var paymentMeansRadios = document.querySelectorAll('input[name="payment-means"]');

  function getFocusables(el) {
    if (!el) return [];
    var sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(el.querySelectorAll(sel));
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !sellerDialog || !sellerDialog.open) return;
    var focusables = getFocusables(sellerDialog);
    if (focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openSellerModal() {
    if (!sellerDialog || !sellerForm) return;
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
    document.getElementById('seller-email').value = c.email || '';
    var countryCode = (a.countryCode || '').toUpperCase();
    if (sellerCountryInput && window.InvioEuCountries && window.InvioEuCountries.getEuCountries) {
      var listForDisplay = window.InvioEuCountries.getEuCountries();
      var found = listForDisplay.filter(function (x) { return x.code === countryCode; })[0];
      sellerCountryInput.value = found ? found.name + ' (' + found.code + ')' : countryCode || '';
    }
    var means = (p.meansTypeCode || '30').toString();
    var radio = document.querySelector('input[name="payment-means"][value="' + means + '"]');
    if (radio) radio.checked = true;
    sellerIbanBlock.hidden = means !== '30';
    renderIbanList(p.accounts && p.accounts.length ? p.accounts : (p.accountId ? [{ accountId: p.accountId, bankName: p.bankName || null }] : [{ accountId: '', bankName: null }]));
    hideFieldErrors();
    var ibanErrEl = document.getElementById('seller-iban-error');
    if (ibanErrEl) { ibanErrEl.hidden = true; ibanErrEl.textContent = ''; }
    sellerDialog.showModal();
    document.body.classList.add('seller-sheet-open');
    sellerDialog.addEventListener('keydown', trapFocus);
    sellerDialog.addEventListener('close', function onClose() {
      document.body.classList.remove('seller-sheet-open');
      sellerDialog.classList.remove('seller-sheet-open');
      sellerDialog.removeEventListener('keydown', trapFocus);
    }, { once: true });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        sellerDialog.classList.add('seller-sheet-open');
        var firstFocus = getFocusables(sellerDialog)[0];
        if (firstFocus) firstFocus.focus();
      });
    });
  }

  function closeSellerModal() {
    if (!sellerDialog) return;
    sellerDialog.removeEventListener('keydown', trapFocus);
    var inner = sellerDialog.querySelector('.seller-modal-inner');
    if (inner && sellerDialog.classList.contains('seller-sheet-open')) {
      sellerDialog.classList.remove('seller-sheet-open');
      var closed = false;
      var done = function (e) {
        if (closed) return;
        if (e && e.target !== inner) return;
        if (e && e.propertyName && e.propertyName !== 'transform') return;
        closed = true;
        inner.removeEventListener('transitionend', done);
        sellerDialog.close();
      };
      inner.addEventListener('transitionend', done);
      setTimeout(function () { done(null); }, 350);
    } else {
      sellerDialog.close();
    }
  }

  function parseCountryCodeFromInput(val) {
    if (!val || typeof val !== 'string') return '';
    var trimmed = val.trim();
    var match = trimmed.match(/\(([A-Z]{2})\)$/i);
    if (match) return match[1].toUpperCase();
    if (trimmed.length === 2) return trimmed.toUpperCase();
    return trimmed;
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
        '<a href="#" role="button" class="link-remove-iban" data-iban-index="' + index + '">Remove</a>' +
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
      '<a href="#" role="button" class="link-remove-iban" data-iban-index="' + index + '">Remove</a>' +
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
  if (sellerCancelBtn) sellerCancelBtn.addEventListener('click', closeSellerModal);
  if (sellerCloseBtn) sellerCloseBtn.addEventListener('click', closeSellerModal);
  if (sellerTabs && sellerTabs.length) {
    sellerTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        sellerTabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      });
    });
  }
  if (sellerForm) {
    sellerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      saveSellerForm();
    });
  }
  if (sellerAddIbanLink) {
    sellerAddIbanLink.addEventListener('click', function (e) {
      addIbanRow(e);
    });
  }
  if (paymentMeansRadios && paymentMeansRadios.length) {
    paymentMeansRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        draft.payment = draft.payment || {};
        draft.payment.meansTypeCode = radio.value;
      });
    });
  }

  // Populate country datalist (EU) with name + (CODE)
  if (sellerCountryList && window.InvioEuCountries && window.InvioEuCountries.getEuCountries) {
    var countries = window.InvioEuCountries.getEuCountries();
    countries.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.name + ' (' + c.code + ')';
      sellerCountryList.appendChild(opt);
    });
  }
})();
