/**
 * Invio — UI wiring: Alpine.js state, save/load, validation display, export
 */

(function () {
  const steps = ['details', 'items', 'seller', 'buyer', 'payment', 'summary'];
  const stepLabels = {
    details: 'New Invoice',
    items: 'Invoice Items',
    seller: 'Seller details',
    buyer: 'Buyer details',
    payment: 'Payment details',
    summary: 'Invoice Summary'
  };

  const invoiceTypeOptions = [
    { value: '380', label: 'Commercial Invoice' },
    { value: '381', label: 'Credit note' }
  ];

  const paymentTypeOptions = [
    { value: '30', label: 'Credit Transfer' },
    { value: '48', label: 'Bank transfer' }
  ];

  const unitCodeOptions = [
    { value: 'C62', label: 'pcs' },
    { value: 'DAY', label: 'days' },
    { value: 'HUR', label: 'hours' },
    { value: 'KGM', label: 'kg' },
    { value: 'LTR', label: 'l' },
    { value: 'MTR', label: 'm' },
    { value: 'PCE', label: 'piece' }
  ];

  const vatCategoryOptions = [
    { value: 'S', label: 'Standard rate' },
    { value: 'Z', label: 'Zero rate' },
    { value: 'E', label: 'Exempt' },
    { value: 'G', label: 'Free export' },
    { value: 'O', label: 'Not subject to VAT' }
  ];

  const countryOptions = [
    { value: 'LV', label: 'Latvia' },
    { value: 'EE', label: 'Estonia' },
    { value: 'LT', label: 'Lithuania' },
    { value: 'DE', label: 'Germany' },
    { value: 'PL', label: 'Poland' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'FR', label: 'France' },
    { value: 'IT', label: 'Italy' },
    { value: 'ES', label: 'Spain' },
    { value: 'NL', label: 'Netherlands' },
    { value: 'SE', label: 'Sweden' },
    { value: 'FI', label: 'Finland' }
  ];

  function getInvioState() {
    return window.InvioState;
  }
  function getInvioStorage() {
    return window.InvioStorage;
  }
  function getInvioCalc() {
    return window.InvioCalc;
  }
  function getInvioValidation() {
    return window.InvioValidation;
  }
  function getInvioXML() {
    return window.InvioXML;
  }
  function getInvioPDF() {
    return window.InvioPDF;
  }

  window.InvioUI = {
    steps,
    stepLabels,
    invoiceTypeOptions,
    paymentTypeOptions,
    unitCodeOptions,
    vatCategoryOptions,
    countryOptions,
    getInvioState,
    getInvioStorage,
    getInvioCalc,
    getInvioValidation,
    getInvioXML,
    getInvioPDF
  };
})();
