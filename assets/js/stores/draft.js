(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    var initial = window.__invioDraft ||
      (window.InvioState && window.InvioState.createDefaultDraft()) ||
      {};

    Alpine.store('draft', initial);

    // Backward compat: existing code mutating window.__invioDraft
    // now mutates the same reactive proxy.
    window.__invioDraft = Alpine.store('draft');
  });
})();
