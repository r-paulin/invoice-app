(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    Alpine.data('focusField', function () {
      return {
        focused: false,
        onFocusin: function () { this.focused = true; },
        onFocusout: function () { this.focused = false; }
      };
    });
  });
})();
