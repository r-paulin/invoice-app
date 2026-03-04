(function () {
  'use strict';

  function logError(context, err) {
    if (typeof window !== 'undefined' && window.InvioLog && typeof window.InvioLog.error === 'function') {
      window.InvioLog.error(context, err);
    }
  }

  // --- Alpine.data: invoiceItems (line items table) ---
  document.addEventListener('alpine:init', function () {
    var UNIT_CODES = [
      { code: 'C62', label: 'pcs' },
      { code: 'H87', label: 'piece' },
      { code: 'HUR', label: 'hr' },
      { code: 'DAY', label: 'day' },
      { code: 'MON', label: 'mo' },
      { code: 'ANN', label: 'yr' },
      { code: 'KGM', label: 'kg' },
      { code: 'GRM', label: 'g' },
      { code: 'LTR', label: 'l' },
      { code: 'MTR', label: 'm' },
      { code: 'MTK', label: 'm\u00B2' },
      { code: 'MTQ', label: 'm\u00B3' },
      { code: 'E48', label: 'svc' },
      { code: 'EA',  label: 'ea' }
    ];

    Alpine.data('invoiceItems', function () {
      var d = window.__invioDraft || (window.InvioState && window.InvioState.createDefaultDraft());
      return {
        lines: d.lines,
        showDiscount: false,
        showNote: false,
        noteText: d.header.note || '',
        unitCodes: UNIT_CODES,
        _cc: (d.header && d.header.currencyCode) || 'EUR',
        _nf: null,
        _nfCurrency: null,

        init: function () {
          var self = this;
          this._buildFormatter();
          document.addEventListener('invio:currency-changed', function (e) {
            self._cc = (e.detail && e.detail.code) || 'EUR';
            self._buildFormatter();
          });
        },

        _buildFormatter: function () {
          var locale = this._resolveLocale();
          var dec = this.decimals;
          try {
            this._nf = new Intl.NumberFormat(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec });
            this._nfCurrency = new Intl.NumberFormat(locale, { style: 'currency', currency: this._cc, currencyDisplay: 'code' });
          } catch (err) {
            this._nf = null;
            this._nfCurrency = null;
          }
        },

        _resolveLocale: function () {
          var d = window.__invioDraft;
          var lang = (d && d.header && d.header.languageCode) || 'en';
          var localeMap = {
            bg: 'bg-BG', hr: 'hr-HR', cs: 'cs-CZ', da: 'da-DK', nl: 'nl-NL',
            en: 'en-IE', et: 'et-EE', fi: 'fi-FI', fr: 'fr-FR', de: 'de-DE',
            el: 'el-GR', hu: 'hu-HU', ga: 'ga-IE', it: 'it-IT', lv: 'lv-LV',
            lt: 'lt-LT', mt: 'mt-MT', pl: 'pl-PL', pt: 'pt-PT', ro: 'ro-RO',
            sk: 'sk-SK', sl: 'sl-SI', es: 'es-ES', sv: 'sv-SE'
          };
          return localeMap[lang] || 'en-IE';
        },

        get currencyCode() { return this._cc; },
        get decimals() { return window.InvioCalc ? window.InvioCalc.currencyDecimals(this._cc) : 2; },

        addLine: function () {
          var ids = this.lines.map(function (l) { return parseInt(l.id, 10); }).filter(function (n) { return !isNaN(n); });
          var nextId = ids.length ? Math.max.apply(null, ids) + 1 : 1;
          this.lines.push(window.InvioState.defaultLine(nextId));
        },
        removeLine: function (index) { if (this.lines.length <= 1) return; this.lines.splice(index, 1); },
        clampQuantity: function (line) { var v = Number(line.quantity); if (isNaN(v) || v < 0) line.quantity = 0; },
        clampPrice: function (line) { var v = Number(line.netPrice); if (isNaN(v) || v < 0) line.netPrice = 0; },
        clampDiscount: function (line) { var v = Number(line.discountAmount); if (isNaN(v) || v < 0) line.discountAmount = 0; var sub = this.getSubtotal(line); if (v > sub) line.discountAmount = sub; },
        clampVatRate: function (line) { var v = Number(line.vatRate); if (isNaN(v) || v < 0) line.vatRate = 0; },

        getSubtotal: function (line) { return window.InvioCalc.lineSubtotal(line, this._cc); },
        getDiscount: function (line) { return window.InvioCalc.lineDiscountAmount(line, this._cc); },
        getNet: function (line) { return window.InvioCalc.lineNet(line, this._cc); },
        getTaxAmount: function (line) { return window.InvioCalc.lineTaxAmount(line, this._cc); },
        getTotal: function (line) { return window.InvioCalc.lineTotal(line, this._cc); },

        fmt: function (value) {
          if (this._nf) return this._nf.format(Number(value));
          return Number(value).toFixed(this.decimals);
        },
        fmtCurrency: function (value) {
          if (this._nfCurrency) return this._nfCurrency.format(Number(value));
          return Number(value).toFixed(this.decimals) + ' ' + this._cc;
        },

        summarySubtotal: function () { var self = this; return this.lines.reduce(function (s, l) { return s + self.getSubtotal(l); }, 0); },
        summaryDiscountTotal: function () { var self = this; return this.lines.reduce(function (s, l) { return s + self.getDiscount(l); }, 0); },
        summaryTaxBreakdown: function () {
          var self = this;
          var buckets = {};
          this.lines.forEach(function (line) {
            var rate = Number(line.vatRate) || 0;
            var cat = line.vatCategoryCode || 'S';
            var key = cat + '|' + rate;
            if (!buckets[key]) buckets[key] = { categoryCode: cat, rate: rate, amount: 0 };
            buckets[key].amount += self.getTaxAmount(line);
          });
          var result = [];
          var keys = Object.keys(buckets);
          for (var i = 0; i < keys.length; i++) {
            var b = buckets[keys[i]];
            if (b.amount !== 0 || b.rate !== 0) result.push(b);
          }
          return result;
        },
        summaryTotal: function () { var self = this; return this.lines.reduce(function (s, l) { return s + self.getTotal(l); }, 0); },

        toggleDiscount: function () {
          this.showDiscount = !this.showDiscount;
          if (!this.showDiscount) this.lines.forEach(function (line) { line.discountAmount = 0; });
        },
        toggleNote: function () {
          this.showNote = !this.showNote;
          if (!this.showNote) { this.noteText = ''; if (window.__invioDraft) window.__invioDraft.header.note = null; }
        },
        syncNote: function () { if (window.__invioDraft) window.__invioDraft.header.note = this.noteText || null; }
      };
    });
  });

  // --- Draft initialization ---
  var draft = window.__invioDraft || (window.InvioState && window.InvioState.createDefaultDraft());
  if (typeof window !== 'undefined') window.__invioDraft = draft;

  // Sync basic details from DOM to draft before export validation (catches any timing gap).
  if (typeof window !== 'undefined') {
    window.InvioExport = window.InvioExport || {};
    window.InvioExport.syncBasicDetailsToDraft = function () {
      var d = window.__invioDraft;
      if (!d || !d.header || !d.payment) return;
      var invNum = document.getElementById('invoice-number');
      var payRef = document.getElementById('payment-reference');
      var issueDate = document.getElementById('issue-date');
      var dueDate = document.getElementById('due-date');
      var typeSelect = document.getElementById('invoice-type-select');
      var currencySelect = document.getElementById('invoice-currency-select');
      var paymentSelect = document.getElementById('payment-type-select');
      if (invNum) d.header.invoiceNumber = (invNum.value || '').trim();
      if (payRef) d.payment.paymentId = (payRef.value || '').trim() || null;
      if (issueDate) d.header.issueDate = (issueDate.value || '').trim() || d.header.issueDate;
      if (dueDate) d.header.dueDate = (dueDate.value || '').trim() || d.header.dueDate;
      if (typeSelect && typeSelect.value) d.header.typeCode = typeSelect.value;
      if (currencySelect && currencySelect.value) d.header.currencyCode = currencySelect.value;
      if (paymentSelect && paymentSelect.value) d.payment.meansTypeCode = paymentSelect.value;
    };
  }

  // --- Export validation state ---
  function clearExportValidationState() {
    var alertEl = document.getElementById('export-validation-alert');
    if (alertEl) alertEl.hidden = true;
    ['seller-card', 'buyer-card'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('card--error');
    });
    ['invoice-number', 'payment-reference'].forEach(function (id) {
      var field = document.getElementById(id + '-field');
      var input = document.getElementById(id);
      var err = document.getElementById(id + '-error');
      if (field) field.classList.remove('has-error');
      if (input) input.setAttribute('aria-invalid', 'false');
      if (err) { err.hidden = true; err.textContent = ''; }
    });
  }
  window.clearExportValidationState = clearExportValidationState;

  window.onInvioExportValidationFailed = function (errors) {
    if (!errors || !errors.length) return;
    var alertEl = document.getElementById('export-validation-alert');
    if (alertEl) {
      var bold = document.createElement('b');
      bold.textContent = 'Missing required information';
      var span = document.createElement('span');
      span.textContent = errors.length === 1
        ? errors[0]
        : 'Please fix the following: ' + errors.join(' ');
      alertEl.textContent = '';
      alertEl.appendChild(bold);
      alertEl.appendChild(span);
      alertEl.hidden = false;
      alertEl.removeAttribute('x-cloak');
    }
    var hasSellerError = errors.some(function (e) { return e.indexOf('Seller') !== -1; });
    var hasBuyerError = errors.some(function (e) { return e.indexOf('Buyer') !== -1; });
    var sellerCard = document.getElementById('seller-card');
    if (sellerCard) sellerCard.classList.toggle('card--error', !!hasSellerError);
    var buyerCard = document.getElementById('buyer-card');
    if (buyerCard) buyerCard.classList.toggle('card--error', !!hasBuyerError);
    var fieldErrorMap = {
      'invoice-number': 'Invoice number',
      'payment-reference': 'Payment reference'
    };
    Object.keys(fieldErrorMap).forEach(function (id) {
      var keyword = fieldErrorMap[id];
      var hasError = errors.some(function (e) { return e.indexOf(keyword) !== -1; });
      var field = document.getElementById(id + '-field');
      var input = document.getElementById(id);
      var err = document.getElementById(id + '-error');
      if (field) field.classList.toggle('has-error', hasError);
      if (input) input.setAttribute('aria-invalid', String(hasError));
      if (err) { err.hidden = !hasError; err.textContent = ''; }
    });
    if (alertEl) alertEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Modal managers (seller + buyer) ---
  var EM = window.Invio && window.Invio.entityModal;
  var sellerModal = EM ? EM.createModalManager('seller') : null;
  var buyerModal = EM ? EM.createModalManager('buyer') : null;

  if (sellerModal) sellerModal.mount();
  if (buyerModal) buyerModal.mount();
  if (EM) {
    EM.updatePaymentMeansDisplayName();
    EM.applyPaymentDetailsVisibility(EM.getPaymentMeansFromGeneral());
  }

  // --- Global click / submit delegation ---
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target) return;
    if (target.closest('#create-invoice-btn')) {
      event.preventDefault();
      if (window.InvioExport && window.InvioExport.startExport) window.InvioExport.startExport();
      return;
    }
    if (target.closest('[data-seller-modal-trigger]')) { event.preventDefault(); if (sellerModal) sellerModal.open(); return; }
    if (target.closest('[data-buyer-modal-trigger]')) { event.preventDefault(); if (buyerModal) buyerModal.open(); return; }
    if (target.closest('#seller-cancel, #seller-close')) { event.preventDefault(); if (sellerModal) sellerModal.close(); return; }
    if (target.closest('#buyer-cancel, #buyer-close')) { event.preventDefault(); if (buyerModal) buyerModal.close(); return; }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form) return;
    if (form.id === 'seller-form') { event.preventDefault(); if (sellerModal) sellerModal.save(); return; }
    if (form.id === 'buyer-form') { event.preventDefault(); if (buyerModal) buyerModal.save(); return; }
  });

  // --- Country selects initialization ---
  var countriesLib = window.Invio && window.Invio.countries;
  if (countriesLib && countriesLib.load) {
    countriesLib.load().then(function () {
      countriesLib.fillCountrySelects('seller');
      countriesLib.fillCountrySelects('buyer');
      countriesLib.bindCountrySelectEvents('seller');
      countriesLib.bindCountrySelectEvents('buyer');
      countriesLib.applyGeoPrefillIfEmpty('seller');
      if (EM) EM.updateCardSummary('buyer');
    }).catch(function (err) {
      logError('initCountries', err);
      var statusEl = document.getElementById('countries-load-status');
      if (statusEl) { statusEl.textContent = 'Country list could not be loaded. You can still use the form.'; statusEl.removeAttribute('hidden'); }
      countriesLib.fillCountrySelects('seller');
      countriesLib.fillCountrySelects('buyer');
      countriesLib.bindCountrySelectEvents('seller');
      countriesLib.bindCountrySelectEvents('buyer');
      countriesLib.applyGeoPrefillIfEmpty('seller');
      if (EM) EM.updateCardSummary('buyer');
    });
  }
})();
