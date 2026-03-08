(function () {
  'use strict';

  var STORAGE_KEY = 'invoicesToday';
  var MIN_DAILY = 10;
  var MAX_DAILY = 68;
  var FIRST_INCREMENT_MS_MIN = 800;
  var FIRST_INCREMENT_MS_MAX = 2500;
  var NEXT_INTERVAL_MS_MIN = 24000;
  var NEXT_INTERVAL_MS_MAX = 24000;
  var ANIMATION_DURATION_MS = 400;
  var EVENT_NAME = 'invoicesToday:increment';

  function getTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function dailySeedFromDate(dateKey) {
    var hash = 0;
    for (var i = 0; i < dateKey.length; i++) {
      hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
      hash = hash & hash;
    }
    var range = MAX_DAILY - MIN_DAILY + 1;
    return MIN_DAILY + (Math.abs(hash) % range);
  }

  function loadStored() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.date === getTodayKey() && typeof data.value === 'number') {
        return data.value;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function saveStored(dateKey, value) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ date: dateKey, value: value }));
    } catch (e) { /* ignore */ }
  }

  function randomBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  var chainStarted = false;

  function doOneIncrement() {
    var todayKey = getTodayKey();
    var raw = sessionStorage.getItem(STORAGE_KEY);
    var data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (e) { /* ignore */ }
    var value = (data && data.date === todayKey && typeof data.value === 'number')
      ? data.value
      : dailySeedFromDate(todayKey);
    value += 1;
    saveStored(todayKey, value);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { value: value } }));
  }

  function scheduleNext() {
    var delay = randomBetween(NEXT_INTERVAL_MS_MIN, NEXT_INTERVAL_MS_MAX);
    setTimeout(function () {
      doOneIncrement();
      scheduleNext();
    }, delay);
  }

  function startIncrementChain() {
    if (chainStarted) return;
    chainStarted = true;
    var firstDelay = randomBetween(FIRST_INCREMENT_MS_MIN, FIRST_INCREMENT_MS_MAX);
    setTimeout(function () {
      doOneIncrement();
      scheduleNext();
    }, firstDelay);
  }

  document.addEventListener('alpine:init', function () {
    Alpine.data('invoicesTodayCounter', function () {
      var todayKey = getTodayKey();
      var stored = loadStored();
      var initial = stored !== null ? stored : dailySeedFromDate(todayKey);
      if (stored === null) {
        saveStored(todayKey, initial);
      }

      return {
        count: initial,
        animating: false,

        bump: function () {
          var comp = this;
          this.animating = true;
          this.$nextTick(function () {
            setTimeout(function () {
              comp.animating = false;
            }, ANIMATION_DURATION_MS);
          });
        },

        init: function () {
          var component = this;
          function onIncrement(e) {
            component.count = e.detail.value;
            component.bump();
          }
          document.addEventListener(EVENT_NAME, onIncrement);

          if (stored === null) {
            startIncrementChain();
          }
        }
      };
    });
  });
})();
