(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    Alpine.store('sellerFormAlert', { show: false, message: '' });
    Alpine.store('sellerBankAccounts', []);
    Alpine.store('buyerFormAlert', { show: false, message: '' });
    Alpine.store('buyerBankAccounts', []);

    var euVat = typeof window !== 'undefined' && window.Invio && window.Invio.euVat;
    Alpine.store('euVat', {
      get vatScenario() {
        var draft = Alpine.store('draft');
        return euVat ? euVat.getVatScenarioFromDraft(draft) : 'domestic';
      },
      locksVatRates: function () {
        return euVat ? euVat.scenarioLocksVatRates(this.vatScenario) : false;
      }
    });
  });
})();
