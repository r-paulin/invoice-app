(function () {
  'use strict';

  var DEFAULT_ACCENT = '#008236';
  var HEX6 = /^#[0-9A-Fa-f]{6}$/;
  var HEX3 = /^#[0-9A-Fa-f]{3}$/;

  function isValidHex(s) {
    return HEX6.test(s) || HEX3.test(s);
  }

  document.addEventListener('alpine:init', function () {
    Alpine.data('styleSection', function () {
      var MAX_LOGO_BYTES = 1024 * 1024;
      return {
        logoError: '',
        logoFileName: '',
        accentHexInput: DEFAULT_ACCENT,

        get circleColor() {
          return isValidHex(this.accentHexInput) ? this.accentHexInput : DEFAULT_ACCENT;
        },

        init: function () {
          this.accentHexInput = this.$store.settings.accentColor || DEFAULT_ACCENT;
        },

        onLogoFileChange: function (ev) {
          this.logoError = '';
          var file = ev.target.files && ev.target.files[0];
          if (!file) return;
          if (!file.type || !file.type.startsWith('image/')) {
            this.logoError = 'Please choose an image file (PNG or JPEG).';
            return;
          }
          if (file.size > MAX_LOGO_BYTES) {
            this.logoError = 'Please choose an image under 1 MB.';
            return;
          }
          this.applyLogoFile(file);
          ev.target.value = '';
        },

        removeLogo: function () {
          this.$store.settings.logo = null;
          this.logoFileName = '';
          this.$store.settings.save();
          this.logoError = '';
        },

        applyLogoFile: function (file) {
          if (!file || !file.type || !file.type.startsWith('image/')) {
            this.logoError = 'Please choose an image file (PNG or JPEG).';
            return;
          }
          if (file.size > MAX_LOGO_BYTES) {
            this.logoError = 'Please choose an image under 1 MB.';
            return;
          }
          var self = this;
          var reader = new FileReader();
          reader.onload = function () {
            self.$store.settings.logo = reader.result;
            self.logoFileName = file.name || '';
            self.$store.settings.save();
          };
          reader.readAsDataURL(file);
        },

        onLogoDrop: function (ev) {
          this.logoError = '';
          var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
          if (file) this.applyLogoFile(file);
        },

        onAccentHexInput: function (ev) {
          var raw = ev.target.value.trim();
          if (raw === '') {
            this.accentHexInput = DEFAULT_ACCENT;
            this.$store.settings.accentColor = DEFAULT_ACCENT;
            this.$store.settings.save();
            return;
          }
          if (raw.charAt(0) !== '#') raw = '#' + raw;
          this.accentHexInput = raw;
          if (isValidHex(raw)) {
            this.$store.settings.accentColor = raw;
            this.$store.settings.save();
          }
        },

        onAccentColorPicker: function (ev) {
          var val = ev.target.value;
          if (val) {
            this.accentHexInput = val;
            this.$store.settings.accentColor = val;
            this.$store.settings.save();
          }
        }
      };
    });
  });
})();
