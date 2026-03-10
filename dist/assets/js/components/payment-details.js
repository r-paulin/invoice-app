(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    var lastAddAtByRole = {};
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
          var now = Date.now();
          if (now - (lastAddAtByRole[role] || 0) < 400) return;
          lastAddAtByRole[role] = now;
          var s = Alpine.store(storeKey);
          if (s.length >= 6) return;
          s.push({
            iban: '',
            bankName: '',
            ibanError: '',
            ibanHint: '',
            _id: 'iban-' + now + '-' + Math.random().toString(36).slice(2)
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
            acc.ibanError = '';
            if (!norm) {
              acc.ibanHint = '';
              return;
            }
            var countryEl = document.getElementById(countryId);
            var country = countryEl ? countryEl.value : '';
            var v = window.InvioValidation;
            if (norm.length >= 20 && country && v && v.ibanLengthMismatch && v.ibanLengthMismatch(norm, country)) {
              acc.ibanHint = 'Review the bank account number carefully to make sure it matches the required format';
            } else {
              acc.ibanHint = '';
            }
          }, 350);
        }
      };
    });
  });
})();
