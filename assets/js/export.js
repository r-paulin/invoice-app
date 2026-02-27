/**
 * Invio — export orchestrator: validation gate, state machine, sessionStorage, redirects.
 * No Alpine; used by index and by processing/ready/error pages.
 */

(function () {
  var STORAGE_KEY_STATE = 'invio_export_state';
  var STORAGE_KEY_DRAFT = 'invio_export_draft';
  var STORAGE_KEY_XML = 'invio_export_xml';
  var STORAGE_KEY_PDF_B64 = 'invio_export_pdf_base64';
  var STORAGE_KEY_ERROR = 'invio_export_error';
  var STORAGE_KEY_INVOICE_NUMBER = 'invio_export_invoice_number';
  var MIN_PROCESSING_MS = 4000;
  var MIN_VISIBLE_MS = 1000;

  function getStorage(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStorage(key, value) {
    try {
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function logError(context, err) {
    if (typeof window !== 'undefined' && window.InvioLog && typeof window.InvioLog.error === 'function') {
      window.InvioLog.error(context, err);
    }
  }

  /**
   * Validation gate: sync basic details, validateForExport (draft + Peppol + reconciliation), calcInvoice, assertExportReconciliation.
   * Returns { ok: true } or { ok: false, errors: string[] }.
   */
  function runValidationGate(draft) {
    if (window.InvioExport && window.InvioExport.syncBasicDetailsToDraft) {
      window.InvioExport.syncBasicDetailsToDraft();
    }
    var d = draft || (window.__invioDraft || null);
    if (!d) return { ok: false, errors: ['No invoice data'] };
    if (window.InvioState && window.InvioState.normalizeDraft) {
      d = window.InvioState.normalizeDraft(d);
      if (window.__invioDraft) window.__invioDraft = d;
    }
    if (!window.InvioValidation || !window.InvioValidation.validateForExport) {
      return { ok: false, errors: ['Validation not available'] };
    }
    var validation = window.InvioValidation.validateForExport(d);
    if (!validation.valid) return { ok: false, errors: validation.errors };
    if (!window.InvioCalc || !window.InvioCalc.calcInvoice || !window.InvioCalc.assertExportReconciliation) {
      return { ok: false, errors: ['Calculation not available'] };
    }
    var computed;
    try {
      computed = window.InvioCalc.calcInvoice(d);
      window.InvioCalc.assertExportReconciliation(computed);
    } catch (err) {
      logError('runValidationGate', err);
      return { ok: false, errors: ['Calculations do not reconcile. Review your data.'] };
    }
    return { ok: true, draft: d, computed: computed };
  }

  /**
   * Start export from editor: run gate, persist draft, redirect to processing.
   */
  function startExport() {
    var draft = window.__invioDraft || null;
    var gate = runValidationGate(draft);
    if (!gate.ok) {
      if (typeof window.onInvioExportValidationFailed === 'function') {
        window.onInvioExportValidationFailed(gate.errors);
      }
      return gate;
    }
    try {
      setStorage(STORAGE_KEY_DRAFT, JSON.stringify(gate.draft));
      setStorage(STORAGE_KEY_STATE, 'PROCESSING');
      setStorage(STORAGE_KEY_ERROR, null);
      setStorage(STORAGE_KEY_XML, null);
      setStorage(STORAGE_KEY_PDF_B64, null);
      setStorage(STORAGE_KEY_INVOICE_NUMBER, null);
    } catch (e) {
      logError('startExport', e);
      if (typeof window.onInvioExportValidationFailed === 'function') {
        window.onInvioExportValidationFailed(['Could not save draft for export.']);
      }
      return { ok: false, errors: ['Could not save draft for export.'] };
    }
    window.location.href = 'invoice-processing.html';
    return { ok: true };
  }

  /**
   * Run export job (on processing page): min 4s, calc → assert → XML → PDF, then redirect.
   */
  function runExportJob() {
    var draftJson = getStorage(STORAGE_KEY_DRAFT);
    if (!draftJson) {
      setStorage(STORAGE_KEY_STATE, 'ERROR');
      setStorage(STORAGE_KEY_ERROR, 'No invoice data. Start from the beginning.');
      window.location.href = 'invoice-error.html';
      return;
    }
    var draft;
    try {
      draft = JSON.parse(draftJson);
    } catch (e) {
      setStorage(STORAGE_KEY_STATE, 'ERROR');
      setStorage(STORAGE_KEY_ERROR, 'Invalid saved data. Try again.');
      window.location.href = 'invoice-error.html';
      return;
    }
    if (window.InvioState && window.InvioState.normalizeDraft) {
      draft = window.InvioState.normalizeDraft(draft);
    }
    var startTime = Date.now();

    function finishSuccess(xmlString, pdfBase64, invoiceNumber) {
      setStorage(STORAGE_KEY_XML, xmlString);
      setStorage(STORAGE_KEY_PDF_B64, pdfBase64 || null);
      setStorage(STORAGE_KEY_INVOICE_NUMBER, invoiceNumber || '');
      setStorage(STORAGE_KEY_STATE, 'READY');
      setStorage(STORAGE_KEY_ERROR, null);
      window.location.href = 'invoice-ready.html';
    }

    function finishError(msg) {
      setStorage(STORAGE_KEY_STATE, 'ERROR');
      setStorage(STORAGE_KEY_ERROR, msg || 'Your invoice wasn\'t created. Try again.');
      setStorage(STORAGE_KEY_XML, null);
      setStorage(STORAGE_KEY_PDF_B64, null);
      window.location.href = 'invoice-error.html';
    }

    var computed;
    try {
      computed = window.InvioCalc.calcInvoice(draft);
      window.InvioCalc.assertExportReconciliation(computed);
    } catch (err) {
      logError('runExportJob.calc', err);
      finishError('Calculations do not reconcile. Review your data.');
      return;
    }
    var doc;
    try {
      doc = window.InvioXML.buildInvoiceXML(draft, computed);
    } catch (err) {
      logError('runExportJob.xml', err);
      finishError('Invoice wasn\'t created. Try again.');
      return;
    }
    if (!doc) {
      finishError('Invoice wasn\'t created. Try again.');
      return;
    }
    var serializer = new XMLSerializer();
    var xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(doc);
    var invoiceNumber = (draft.header && draft.header.invoiceNumber) ? draft.header.invoiceNumber : '';
    var baseName = window.InvioXML && window.InvioXML.exportFilenameBase ? window.InvioXML.exportFilenameBase(invoiceNumber) : 'invoice';

    var pdfBase64 = null;
    if (window.InvioPDF && typeof window.InvioPDF.buildPdfBase64 === 'function') {
      try {
        pdfBase64 = window.InvioPDF.buildPdfBase64(draft, computed);
      } catch (err) {
        logError('runExportJob.pdf', err);
        finishError('PDF could not be created. Try again.');
        return;
      }
    }

    var elapsed = Date.now() - startTime;
    var wait = Math.max(0, MIN_PROCESSING_MS - elapsed, MIN_VISIBLE_MS - elapsed);
    if (wait > 0) {
      setTimeout(function () {
        finishSuccess(xmlString, pdfBase64, invoiceNumber);
      }, wait);
    } else {
      finishSuccess(xmlString, pdfBase64, invoiceNumber);
    }
  }

  /**
   * On ready page: wire Download XML / Download PDF from sessionStorage.
   */
  function initReadyPage() {
    var xmlString = getStorage(STORAGE_KEY_XML);
    var pdfBase64 = getStorage(STORAGE_KEY_PDF_B64);
    var invoiceNumber = getStorage(STORAGE_KEY_INVOICE_NUMBER);
    var baseName = window.InvioXML && window.InvioXML.exportFilenameBase ? window.InvioXML.exportFilenameBase(invoiceNumber) : 'invoice';

    var xmlBtn = document.getElementById('export-download-xml');
    if (xmlBtn && xmlString) {
      xmlBtn.addEventListener('click', function () {
        var blob = new Blob([xmlString], { type: 'application/xml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (window.InvioXML && window.InvioXML.sanitizeDownloadFilename ? window.InvioXML.sanitizeDownloadFilename(baseName) : baseName) + '.xml';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      });
    } else if (xmlBtn) {
      xmlBtn.disabled = true;
      xmlBtn.setAttribute('aria-disabled', 'true');
    }

    var pdfBtn = document.getElementById('export-download-pdf');
    if (pdfBtn && pdfBase64) {
      pdfBtn.addEventListener('click', function () {
        try {
          var binary = atob(pdfBase64);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          var blob = new Blob([bytes], { type: 'application/pdf' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = (window.InvioXML && window.InvioXML.sanitizeDownloadFilename ? window.InvioXML.sanitizeDownloadFilename(baseName) : baseName) + '.pdf';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } catch (e) {
          logError('initReadyPage.pdf', e);
        }
      });
    } else if (pdfBtn) {
      pdfBtn.disabled = true;
      pdfBtn.setAttribute('aria-disabled', 'true');
    }
  }

  /**
   * On error page: show message from sessionStorage.
   */
  function initErrorPage() {
    var msg = getStorage(STORAGE_KEY_ERROR);
    var el = document.getElementById('export-error-message');
    if (el && msg) el.textContent = msg;
  }

  /**
   * On processing page: run export job after DOM ready.
   */
  function initProcessingPage() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runExportJob);
    } else {
      runExportJob();
    }
  }

  var path = typeof window !== 'undefined' && window.location && window.location.pathname ? window.location.pathname : '';
  if (path.indexOf('invoice-processing') !== -1) {
    initProcessingPage();
  } else if (path.indexOf('invoice-ready') !== -1) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initReadyPage);
    } else {
      initReadyPage();
    }
  } else if (path.indexOf('invoice-error') !== -1) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initErrorPage);
    } else {
      initErrorPage();
    }
  }

  if (typeof window !== 'undefined') {
    window.InvioExport = window.InvioExport || {};
    window.InvioExport.startExport = startExport;
    window.InvioExport.runValidationGate = runValidationGate;
  }
})();
