/**
 * Invio — PDF generation (standalone). Uses calcInvoice(draft) result only; no DOM, no recalculation.
 * A4; multi-page when content overflows.
 */

(function () {
  function formatAmount(n) {
    return (typeof n === 'number' && !isNaN(n)) ? n.toFixed(2) : '0.00';
  }

  function formatQuantity(qty, unitCode) {
    var u = unitCode || 'C62';
    var labels = { C62: 'pcs', HUR: 'hr', DAY: 'day', KGM: 'kg', LTR: 'l', MTR: 'm', MTK: 'm²', MTQ: 'm³', PCE: 'pcs' };
    return String(qty) + ' ' + (labels[u] || u);
  }

  /**
   * Build PDF from draft and computed (calcInvoice result). Returns base64 string or null.
   */
  function buildPdfBase64(draft, computed) {
    var JsPDF = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
    if (!JsPDF) return null;
    var doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageW = 210;
    var pageH = 297;
    var margin = 20;
    var x = margin;
    var y = margin;
    var lineHeight = 6;
    var smallLine = 4;
    var cc = (computed && computed.currencyCode) || (draft.header && draft.header.currencyCode) || 'EUR';
    var h = draft.header || {};
    var seller = draft.seller || {};
    var buyer = draft.buyer || {};
    var payment = draft.payment || {};
    var addrS = seller.address || {};
    var addrB = buyer.address || {};
    var contactS = seller.contact || {};
    var contactB = buyer.contact || {};

    function checkNewPage(need) {
      if (y + need > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    }

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice', x, y);
    y += lineHeight;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('created with invio.app', x, y);
    y += lineHeight + 2;

    doc.setFontSize(10);
    doc.text('Invoice number: ' + (h.invoiceNumber || '—'), pageW - margin, margin, { align: 'right' });
    doc.text('Issued date: ' + (h.issueDate || '—'), pageW - margin, margin + lineHeight, { align: 'right' });
    doc.text('Due date: ' + (h.dueDate || '—'), pageW - margin, margin + lineHeight * 2, { align: 'right' });

    var col1 = x;
    var col2 = pageW / 2 + 5;
    var blockStart = y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Seller', col1, blockStart);
    doc.text('Buyer', col2, blockStart);
    blockStart += smallLine;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    var sy = blockStart;
    if (seller.name) doc.text(seller.name, col1, sy);
    sy += lineHeight;
    var sellerAddr = [addrS.line1, addrS.city, addrS.postalCode, addrS.countryCode].filter(Boolean).join(', ');
    if (sellerAddr) doc.text(sellerAddr, col1, sy);
    sy += lineHeight;
    if (contactS.email) doc.text(contactS.email, col1, sy);
    sy += lineHeight;
    if (seller.legalRegistrationId) doc.text('Registration number: ' + seller.legalRegistrationId, col1, sy);
    sy += smallLine;
    if (seller.vatId) doc.text('VAT number: ' + seller.vatId, col1, sy);
    sy += smallLine;
    if (payment.accountId) doc.text('Bank account: ' + payment.accountId, col1, sy);
    sy += smallLine;
    if (payment.bankName) doc.text('Bank: ' + payment.bankName, col1, sy);

    var by = blockStart;
    if (buyer.name) doc.text(buyer.name, col2, by);
    by += lineHeight;
    var buyerAddr = [addrB.line1, addrB.city, addrB.postalCode, addrB.countryCode].filter(Boolean).join(', ');
    if (buyerAddr) doc.text(buyerAddr, col2, by);
    by += lineHeight;
    if (contactB.email) doc.text(contactB.email, col2, by);
    by += lineHeight;
    if (buyer.legalRegistrationId) doc.text('Registration number: ' + buyer.legalRegistrationId, col2, by);
    by += smallLine;
    if (buyer.vatId) doc.text('VAT number: ' + buyer.vatId, col2, by);

    y = Math.max(sy, by) + lineHeight;
    if (payment.paymentId) {
      doc.setFont('helvetica', 'bold');
      doc.text('Payment reference: ' + payment.paymentId, x, y);
      y += lineHeight + 4;
    }

    checkNewPage(30);
    var tableTop = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Service name', x, y);
    doc.text('Quantity', x + 45, y);
    doc.text('Unit price', x + 65, y);
    doc.text('Discount', x + 90, y);
    doc.text('Tax', x + 115, y);
    doc.text('Total', x + 145, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');

    var lines = draft.lines || [];
    var lineNets = (computed && computed.lines) ? computed.lines : [];
    var lineMap = {};
    lineNets.forEach(function (l) { lineMap[l.id] = l; });

    for (var i = 0; i < lines.length; i++) {
      checkNewPage(lineHeight * 2);
      var line = lines[i];
      var comp = lineMap[line.id] || {};
      doc.setFontSize(9);
      doc.text((line.itemName || '—').slice(0, 28), x, y);
      doc.text(formatQuantity(line.quantity, line.unitCode), x + 45, y);
      doc.text(formatAmount(Number(line.netPrice)) + ' ' + cc, x + 65, y);
      var disc = (line.discountAmount && Number(line.discountAmount) !== 0) ? '- ' + formatAmount(Number(line.discountAmount)) : '0.00';
      doc.text(disc + ' ' + cc, x + 90, y);
      doc.text(formatAmount(comp.lineTaxAmount || 0) + ' ' + cc + (line.vatRate != null ? ' (' + line.vatRate + '%)' : ''), x + 115, y);
      doc.text(formatAmount(comp.lineGrossAmount || 0) + ' ' + cc, x + 145, y);
      y += lineHeight;
    }

    y += 4;
    checkNewPage(60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    var subtotal = (computed && computed.subtotal != null) ? computed.subtotal : 0;
    var documentDiscount = (computed && computed.documentDiscount != null) ? computed.documentDiscount : 0;
    var totalVAT = (computed && computed.totalVAT != null) ? computed.totalVAT : 0;
    var payableAmount = (computed && computed.payableAmount != null) ? computed.payableAmount : 0;
    var rightX = pageW - margin;
    doc.text('Subtotal: ' + formatAmount(subtotal) + ' ' + cc, rightX, y, { align: 'right' });
    y += lineHeight;
    if (computed && computed.taxBreakdown && computed.taxBreakdown.length) {
      computed.taxBreakdown.forEach(function (tb) {
        doc.text('Tax rate (' + tb.rate + '%): ' + formatAmount(tb.taxAmount) + ' ' + cc, rightX, y, { align: 'right' });
        y += smallLine;
      });
    }
    if (documentDiscount > 0) {
      doc.text('Discount: -' + formatAmount(documentDiscount) + ' ' + cc, rightX, y, { align: 'right' });
      y += lineHeight;
    }
    doc.text('Total VAT: ' + formatAmount(totalVAT) + ' ' + cc, rightX, y, { align: 'right' });
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('Total: ' + formatAmount(payableAmount) + ' ' + cc, rightX, y, { align: 'right' });
    y += lineHeight + 6;

    if (h.note && String(h.note).trim()) {
      checkNewPage(20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      var noteLines = doc.splitTextToSize(String(h.note).trim(), pageW - 2 * margin);
      noteLines.forEach(function (nl) {
        checkNewPage(lineHeight);
        doc.text(nl, x, y);
        y += lineHeight;
      });
      y += 4;
    }

    var totalPages = doc.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Page ' + p + ' of ' + totalPages, margin, pageH - 10);
      doc.text('Invoice number: ' + (h.invoiceNumber || '—'), pageW - margin, pageH - 10, { align: 'right' });
    }

    try {
      return doc.output('datauristring').split(',')[1] || null;
    } catch (e) {
      return null;
    }
  }

  if (typeof window !== 'undefined') {
    window.InvioPDF = {
      buildPdfBase64: buildPdfBase64
    };
  }
})();
