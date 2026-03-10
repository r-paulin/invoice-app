(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    Alpine.data('languageSwitcher', function () {
      var languageToCountry = {
        bg: 'bg', hr: 'hr', cs: 'cz', da: 'dk', nl: 'nl', en: 'gb', et: 'ee', fi: 'fi', fr: 'fr', de: 'de',
        el: 'gr', hu: 'hu', ga: 'ie', it: 'it', lv: 'lv', lt: 'lt', mt: 'mt', pl: 'pl', pt: 'pt', ro: 'ro',
        sk: 'sk', sl: 'si', es: 'es', sv: 'se'
      };
      var options = [
        { value: 'bg', label: '\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438' },
        { value: 'hr', label: 'Hrvatski' },
        { value: 'cs', label: '\u010Ce\u0161tina' },
        { value: 'da', label: 'Dansk' },
        { value: 'nl', label: 'Nederlands' },
        { value: 'en', label: 'English' },
        { value: 'et', label: 'Eesti' },
        { value: 'fi', label: 'Suomi' },
        { value: 'fr', label: 'Fran\u00E7ais' },
        { value: 'de', label: 'Deutsch' },
        { value: 'el', label: '\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC' },
        { value: 'hu', label: 'Magyar' },
        { value: 'ga', label: 'Gaeilge' },
        { value: 'it', label: 'Italiano' },
        { value: 'lv', label: 'Latvie\u0161u' },
        { value: 'lt', label: 'Lietuvi\u0173' },
        { value: 'mt', label: 'Malti' },
        { value: 'pl', label: 'Polski' },
        { value: 'pt', label: 'Portugu\u00EAs' },
        { value: 'ro', label: 'Rom\u00E2n\u0103' },
        { value: 'sk', label: 'Sloven\u010Dina' },
        { value: 'sl', label: 'Sloven\u0161\u010Dina' },
        { value: 'es', label: 'Espa\u00F1ol' },
        { value: 'sv', label: 'Svenska' }
      ];

      return {
        options: options,
        languageToCountry: languageToCountry,
        current: 'en',

        get currentLabel() {
          var cur = this.current;
          var o = this.options.find(function (opt) { return opt.value === cur; });
          return o ? o.label : 'English';
        },

        get flagClass() {
          var cc = this.languageToCountry[this.current] || 'gb';
          return 'lang-switcher-flag fi fi-' + cc.toLowerCase();
        },

        updateWidth: function () {
          var self = this;
          this.$nextTick(function () {
            if (self.$refs.sizer && self.$refs.wrapper) {
              self.$refs.wrapper.style.width = self.$refs.sizer.offsetWidth + 'px';
            }
          });
        },

        init: function () {
          var self = this;
          this.$watch('current', function (newVal) {
            self.updateWidth();
            var draft = (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('draft')) || window.__invioDraft;
            if (draft && draft.header) {
              draft.header.languageCode = newVal;
            }
            document.dispatchEvent(new CustomEvent('invio:website-language-changed', { detail: { language: newVal } }));
            var countryIso2 = self.languageToCountry[newVal];
            if (countryIso2) {
              var cc = countryIso2.toUpperCase();
              if (draft) {
                if (!draft.seller) draft.seller = {};
                if (!draft.seller.address) draft.seller.address = {};
                if (!draft.buyer) draft.buyer = {};
                if (!draft.buyer.address) draft.buyer.address = {};
                draft.seller.address.countryCode = cc;
                draft.buyer.address.countryCode = cc;
              }
              var countries = window.Invio && window.Invio.countries;
              ['seller', 'buyer'].forEach(function (role) {
                var sel = document.getElementById(role + '-country');
                if (sel && sel.options) {
                  var hasOption = false;
                  for (var i = 0; i < sel.options.length; i++) {
                    if (sel.options[i].value === cc) { hasOption = true; break; }
                  }
                  if (hasOption) {
                    sel.value = cc;
                    if (countries && countries.updateAddressCountryDisplay) {
                      countries.updateAddressCountryDisplay(role, cc);
                    }
                  }
                }
              });
            }
          });
          this.updateWidth();
        }
      };
    });
  });
})();
