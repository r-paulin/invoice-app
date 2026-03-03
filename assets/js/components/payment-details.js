(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    /**
     * Unified IBAN / bank-account management for seller and buyer modals.
     * Usage: x-data="paymentDetails('seller')" or x-data="paymentDetails('buyer')"
     */
    Alpine.data('paymentDetails', function (role) {
      var storeKey = role + 'BankAccounts';
      var countryId = role + '-country';

      return {
        ibanDebounce: {},

        addAccount: function () {
          var s = Alpine.store(storeKey);
          if (s.length >= 6) return;
          s.push({
            iban: '',
            bankName: '',
            ibanError: '',
            _id: 'iban-' + Date.now() + '-' + Math.random().toString(36).slice(2)
          });
        },

        removeAccount: function (i) {
          var s = Alpine.store(storeKey);
          if (s.length <= 1) return;
          s.splice(i, 1);
        },

        validateIbanAt: function (i) {
          var self = this;
          clearTimeout(this.ibanDebounce[i]);
          this.ibanDebounce[i] = setTimeout(function () {
            var s = Alpine.store(storeKey);
            var acc = s[i];
            if (!acc) return;
            var raw = (acc.iban || '').trim();
            var norm = raw.replace(/\s/g, '').toUpperCase();
            if (!norm) {
              acc.ibanError = '';
              return;
            }
            var countryEl = document.getElementById(countryId);
            var country = countryEl ? countryEl.value : '';
            var v = window.InvioValidation;
            if (country && v && v.validIbanFormatForCountry && !v.validIbanFormatForCountry(norm, country)) {
              acc.ibanError = 'IBAN length does not match selected country';
              return;
            }
            acc.ibanError = (v && v.validIban && !v.validIban(norm)) ? 'Invalid IBAN' : '';
          }, 350);
        }
      };
    });
  });
})();
