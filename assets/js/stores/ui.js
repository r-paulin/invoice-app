(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    Alpine.store('sellerFormAlert', { show: false, message: '' });
    Alpine.store('sellerBankAccounts', []);
    Alpine.store('buyerFormAlert', { show: false, message: '' });
    Alpine.store('buyerBankAccounts', []);
  });
})();
