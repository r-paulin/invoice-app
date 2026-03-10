(function () {
  'use strict';

  document.addEventListener('alpine:init', function () {
    Alpine.data('basicDetails', function () {
      function toISO(date) {
        return date.toISOString().slice(0, 10);
      }
      function todayISO() {
        return toISO(new Date());
      }
      function addDays(date, days) {
        var d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      }

      return {
        dueDateManuallySet: false,
        showDueDateUpdating: false,

        get invoiceNumber() {
          return this.$store.draft.header.invoiceNumber || '';
        },
        set invoiceNumber(v) {
          this.$store.draft.header.invoiceNumber = (v || '').trim();
          if (window.clearExportValidationState) window.clearExportValidationState();
        },

        get paymentReference() {
          var pid = this.$store.draft.payment.paymentId;
          return pid || '';
        },
        set paymentReference(v) {
          this.$store.draft.payment.paymentId = (v || '').trim() || null;
          if (window.clearExportValidationState) window.clearExportValidationState();
        },

        get issueDate() {
          return this.$store.draft.header.issueDate || '';
        },
        set issueDate(v) {
          this.$store.draft.header.issueDate = v;
        },

        get dueDate() {
          return this.$store.draft.header.dueDate || '';
        },
        set dueDate(v) {
          this.$store.draft.header.dueDate = v;
        },

        get taxPointDate() {
          return this.$store.draft.header.taxPointDate || '';
        },
        set taxPointDate(v) {
          this.$store.draft.header.taxPointDate = (v && v.trim()) ? v.trim() : null;
        },

        get dueMin() {
          var today = todayISO();
          var issue = this.issueDate || today;
          return issue > today ? issue : today;
        },

        init: function () {
          var header = this.$store.draft.header;
          if (!header.issueDate) header.issueDate = todayISO();
          if (!header.dueDate) header.dueDate = toISO(addDays(new Date(), 14));
        },

        onIssueDateChange: function () {
          if (this.dueDateManuallySet) return;
          var issue = this.issueDate;
          if (!issue) return;
          this.showDueDateUpdating = true;
          var self = this;
          this.dueDate = toISO(addDays(new Date(issue + 'T12:00:00'), 14));
          setTimeout(function () { self.showDueDateUpdating = false; }, 400);
        },

        onDueDateChange: function () {
          this.dueDateManuallySet = true;
        },

        onInvoiceNumberFocus: function () {
          if (window.clearExportValidationState) window.clearExportValidationState();
        },

        onPaymentReferenceFocus: function () {
          if (window.clearExportValidationState) window.clearExportValidationState();
        }
      };
    });
  });
})();
