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
        _timeouts: [],

        bump: function () {
          var self = this;
          this.animating = true;
          this.$nextTick(function () {
            setTimeout(function () {
              self.animating = false;
            }, ANIMATION_DURATION_MS);
          });
        },

        increment: function () {
          this.count += 1;
          saveStored(getTodayKey(), this.count);
          this.bump();
        },

        scheduleNext: function () {
          var self = this;
          var delay = randomBetween(NEXT_INTERVAL_MS_MIN, NEXT_INTERVAL_MS_MAX);
          var t = setTimeout(function () {
            self.increment();
            self.scheduleNext();
          }, delay);
          this._timeouts.push(t);
        },

        init: function () {
          var self = this;
          if (stored !== null) {
            return;
          }
          var firstDelay = randomBetween(FIRST_INCREMENT_MS_MIN, FIRST_INCREMENT_MS_MAX);
          var t = setTimeout(function () {
            self.increment();
            self.scheduleNext();
          }, firstDelay);
          this._timeouts.push(t);
        }
      };
    });
  });
})();
