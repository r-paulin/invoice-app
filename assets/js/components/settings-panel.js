(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    var LANG_TO_COUNTRY = {
      bg: 'bg', hr: 'hr', cs: 'cz', da: 'dk', nl: 'nl', en: 'gb', et: 'ee', fi: 'fi', fr: 'fr', de: 'de',
      el: 'gr', hu: 'hu', ga: 'ie', it: 'it', lv: 'lv', lt: 'lt', mt: 'mt', pl: 'pl', pt: 'pt', ro: 'ro',
      sk: 'sk', sl: 'si', es: 'es', sv: 'se'
    };
    var LANG_NAMES = {
      bg: 'Български', hr: 'Hrvatski', cs: 'Čeština', da: 'Dansk', nl: 'Nederlands', en: 'English',
      et: 'Eesti', fi: 'Suomi', fr: 'Français', de: 'Deutsch', el: 'Ελληνικά', hu: 'Magyar',
      ga: 'Gaeilge', it: 'Italiano', lv: 'Latviešu', lt: 'Lietuvių', mt: 'Malti', pl: 'Polski',
      pt: 'Português', ro: 'Română', sk: 'Slovenčina', sl: 'Slovenščina', es: 'Español', sv: 'Svenska'
    };
    var EU_24 = Object.keys(LANG_TO_COUNTRY);

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
    var CURRENCY_LIST = Object.keys(CURRENCY_NAMES);

    var TYPE_SUBTEXTS = {
      '380': 'Standard invoice for goods or services supplied.',
      '384': 'Replaces or corrects a previously issued invoice.',
      '381': 'Credit note that reduces the amount due from the buyer.',
      '326': 'Invoice covering only part of an order or contract.',
      '389': 'Invoice issued by the buyer (self-billing arrangement).',
      '875': 'Invoice for partial progress on a construction project.',
      '876': 'Invoice for a partial final stage of a construction project.',
      '877': 'Final invoice for completion of a construction project.'
    };

    Alpine.data('settingsPanel', function () {
      return {
        language: 'en',
        currency: 'EUR',
        invoiceType: '380',
        paymentType: '30',
        currencies: CURRENCY_LIST.map(function (code) {
          return { value: code, label: code + ' \u2013 ' + (CURRENCY_NAMES[code] || code) };
        }),

        get languageFlagClass() {
          var cc = LANG_TO_COUNTRY[this.language] || 'gb';
          return 'country-select-flag fi fi-' + cc.toLowerCase();
        },

        get languageDisplayName() {
          return LANG_NAMES[this.language] || 'English';
        },

        get invoiceTypeSubtext() {
          return TYPE_SUBTEXTS[this.invoiceType] || '';
        },

        get paymentTypeLive() {
          if (this.paymentType === '10') return 'Bank details hidden. Payment status: Paid by Cash.';
          if (this.paymentType === '48') return 'Bank details hidden. Payment status: Paid by Credit Card.';
          return 'Bank details required for bank transfer.';
        },

        init: function () {
          var draft = this.$store.draft;
          var langSelect = document.getElementById('lang-select');
          var websiteLang = langSelect ? langSelect.value : '';
          if (websiteLang && EU_24.indexOf(websiteLang) !== -1) {
            this.language = websiteLang;
          }
          draft.header.languageCode = this.language;
          this.currency = (draft.header && draft.header.currencyCode) || 'EUR';
          this.invoiceType = (draft.header && draft.header.typeCode) || '380';
          this.paymentType = (draft.payment && draft.payment.meansTypeCode) ? String(draft.payment.meansTypeCode) : '30';

          var self = this;
          this.$watch('language', function (val) {
            self.$store.draft.header.languageCode = val;
          });
          this.$watch('currency', function (val) {
            self.$store.draft.header.currencyCode = val;
            document.dispatchEvent(new CustomEvent('invio:currency-changed', { detail: { code: val } }));
          });
          this.$watch('invoiceType', function (val) {
            self.$store.draft.header.typeCode = val;
          });
          this.$watch('paymentType', function (val) {
            self.$store.draft.payment.meansTypeCode = val;
            var EM = window.Invio && window.Invio.entityModal;
            if (EM) {
              EM.updatePaymentMeansDisplayName();
              EM.applyPaymentDetailsVisibility(val);
            }
          });
        }
      };
    });
  });
})();
