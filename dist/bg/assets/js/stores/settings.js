(function () {
  'use strict';

  var SETTINGS_KEY = 'invio_settings';
  var DEFAULT_ACCENT = '#008236';

  function getDefaultSettings() {
    return { logo: null, accentColor: DEFAULT_ACCENT };
  }

  function getStoredSettings() {
    try {
      var s = localStorage.getItem(SETTINGS_KEY);
      if (s) {
        var p = JSON.parse(s);
        return {
          logo: p.logo !== undefined ? p.logo : null,
          accentColor: (p.accentColor && /^#[0-9A-Fa-f]{6}$/.test(p.accentColor)) ? p.accentColor : DEFAULT_ACCENT
        };
      }
    } catch (e) { /* intentionally empty */ }
    return getDefaultSettings();
  }

  function applyAccentColor(hex) {
    document.documentElement.style.setProperty('--invoice-accent-color', hex || DEFAULT_ACCENT);
  }

  function persistSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      applyAccentColor(settings.accentColor);
    } catch (e) { /* intentionally empty */ }
  }

  document.addEventListener('alpine:init', function () {
    var initialSettings = getStoredSettings();
    applyAccentColor(initialSettings.accentColor);

    Alpine.store('settings', {
      logo: initialSettings.logo,
      accentColor: initialSettings.accentColor,
      save: function () {
        persistSettings({ logo: this.logo, accentColor: this.accentColor });
      }
    });
  });
})();
