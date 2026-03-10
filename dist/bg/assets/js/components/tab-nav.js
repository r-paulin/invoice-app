(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    Alpine.store('tab', {
      active: 'invoice-data',

      switchTo: function (target) {
        this.active = target;
      },

      isActive: function (panel) {
        return this.active === panel;
      }
    });

    Alpine.data('tabNav', function () {
      return {
        switchTo: function (target) {
          this.$store.tab.switchTo(target);
        },

        isActive: function (panel) {
          return this.$store.tab.isActive(panel);
        }
      };
    });
  });
})();
