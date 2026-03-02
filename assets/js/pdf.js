/**
 * Invio — PDF generation (standalone). Uses calcInvoice(draft) result only; no DOM, no recalculation.
 * A4; multi-page when content overflows.
 */

(function () {
  var MM_PER_PX = 210 / 595; // Keep Figma 595px canvas proportions on A4 width.
  var COLOR_TEXT = [41, 37, 36];
  var COLOR_MUTED = [87, 83, 77];
  var COLOR_BORDER = [214, 211, 209];

  function pxToMm(px) {
    return px * MM_PER_PX;
  }

  function formatAmount(n) {
    return (typeof n === 'number' && !isNaN(n)) ? n.toFixed(2) : '0.00';
  }

  function formatDate(value) {
    var v = (value || '').trim();
    var m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return v || '—';
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function safeText(v, fallback) {
    var s = (v == null ? '' : String(v)).trim();
    return s || (fallback || '—');
  }

  function ellipsis(text, max) {
    var s = String(text || '');
    if (s.length <= max) return s;
    return s.slice(0, Math.max(0, max - 1)) + '…';
  }

  function formatQuantity(qty, unitCode) {
    var u = unitCode || 'C62';
    var labels = { C62: 'pcs', HUR: 'hr', DAY: 'day', KGM: 'kg', LTR: 'l', MTR: 'm', MTK: 'm²', MTQ: 'm³', PCE: 'pcs' };
    return String(qty) + ' ' + (labels[u] || u);
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
    var m = hex.replace(/^#/, '').match(/^([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  /**
   * Build PDF from draft and computed (calcInvoice result). Optional settings { accentColor, logo } for border color and logo image.
   * Returns base64 string or null.
   */
  function buildPdfBase64(draft, computed, settings) {
    var JsPDF = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
    if (!JsPDF) return null;
    var doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageW = 210;
    var pageH = 297;
    var margin = pxToMm(24); // Align with Figma frame.
    var footerInset = pxToMm(36);
    var footerY = pageH - footerInset;
    var y = margin;
    var rowH = pxToMm(24);
    var contentW = pageW - margin * 2;

    // Table columns mapped from Figma.
    var colService = pxToMm(189);
    var colQty = pxToMm(57);
    var colUnit = pxToMm(70);
    var colTax = pxToMm(57);
    var colTaxAmount = pxToMm(93);
    var colTotal = pxToMm(81);

    var xService = margin;
    var xQty = xService + colService;
    var xUnit = xQty + colQty;
    var xTax = xUnit + colUnit;
    var xTaxAmount = xTax + colTax;
    var xTotal = xTaxAmount + colTaxAmount;

    var cc = (computed && computed.currencyCode) || (draft.header && draft.header.currencyCode) || 'EUR';
    var h = draft.header || {};
    var seller = draft.seller || {};
    var buyer = draft.buyer || {};
    var payment = draft.payment || {};
    function setColor(arr) {
      doc.setTextColor(arr[0], arr[1], arr[2]);
    }

    function drawLinkText(text, url, x, y) {
      setColor(COLOR_MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (typeof doc.textWithLink === 'function') {
        doc.textWithLink(text, x, y, { url: url });
      } else {
        doc.text(text, x, y);
      }
    }

    function drawLogoSlot(x, y, w, h) {
      if (!(settings && settings.logo && typeof settings.logo === 'string' && settings.logo.indexOf('data:image') === 0)) {
        return;
      }
      try {
        var format = settings.logo.indexOf('image/png') !== -1 ? 'PNG' : 'JPEG';
        var props = doc.getImageProperties ? doc.getImageProperties(settings.logo) : null;
        var imgW = w;
        var imgH = h;
        if (props && props.width && props.height) {
          var ratio = Math.min(w / props.width, h / props.height);
          imgW = props.width * ratio;
          imgH = props.height * ratio;
        }
        var imgX = x + (w - imgW); // Right-aligned.
        var imgY = y + ((h - imgH) / 2);
        doc.addImage(settings.logo, format, imgX, imgY, imgW, imgH);
      } catch (e) {}
    }

    function drawPartyColumn(title, party, bankAccounts, x, topY, width) {
      var addr = party.address || {};
      var contact = party.contact || {};
      var lineY = topY;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(COLOR_MUTED);
      doc.text(title, x, lineY);
      lineY += pxToMm(12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      doc.text(ellipsis(safeText(party.name, '—'), 42), x, lineY);
      lineY += pxToMm(10);

      function drawField(label, value) {
        if (!value) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        setColor(COLOR_MUTED);
        doc.text(label, x, lineY);
        lineY += pxToMm(9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(COLOR_TEXT);
        var wrapped = doc.splitTextToSize(String(value), width);
        for (var i = 0; i < wrapped.length; i++) {
          doc.text(ellipsis(wrapped[i], 68), x, lineY);
          lineY += pxToMm(9);
        }
      }

      var addressValue = [addr.line1, addr.city, addr.postalCode, addr.countryCode].filter(Boolean).join(', ');
      drawField('Address', addressValue);
      drawField('Registration number', party.legalRegistrationId || '');
      drawField('VAT number', party.vatId || '');

      if (Array.isArray(bankAccounts) && bankAccounts.length) {
        for (var i = 0; i < bankAccounts.length; i++) {
          var account = bankAccounts[i] || {};
          drawField('Bank account', account.accountId || '');
          if (account.bankName) drawField('Bank name', account.bankName);
        }
      }

      drawField('Email', contact.email || '');
      drawField('Phone number', contact.phone || '');

      return lineY;
    }

    function ensureSpace(need, drawTableHeaderCb) {
      if (y + need > footerY - pxToMm(18)) {
        doc.addPage();
        y = margin;
        if (drawTableHeaderCb) {
          y = drawTableHeaderCb(y);
        }
      }
    }

    var accentHex = (settings && settings.accentColor) ? settings.accentColor : '#000000';
    var rgb = hexToRgb(accentHex);
    var thickLine = pxToMm(2);

    // Top link.
    drawLinkText('invossa.app', 'https://invossa.app', margin, pxToMm(10));

    // Header title block.
    y = pxToMm(36);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    setColor(COLOR_TEXT);
    doc.text('Invoice', margin, y);
    y += pxToMm(12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    setColor(COLOR_MUTED);
    doc.text('Created by invossa.app', margin, y);

    var logoSlotW = pxToMm(174);
    var logoSlotH = pxToMm(56);
    var logoSlotX = pageW - margin - logoSlotW;
    var logoSlotY = pxToMm(24);
    drawLogoSlot(logoSlotX, logoSlotY, logoSlotW, logoSlotH);

    var metaYLabel = pxToMm(67);
    var metaYValue = pxToMm(81);
    var c1X = margin;
    var c2X = margin + (contentW * 0.5);
    var c3X = margin + (contentW * 0.76);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(COLOR_MUTED);
    doc.text('Invoice number:', c1X, metaYLabel);
    doc.text('Issue date:', c2X, metaYLabel);
    doc.text('Due date:', c3X, metaYLabel);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(COLOR_TEXT);
    doc.text(ellipsis(safeText(h.invoiceNumber, '—'), 28), c1X, metaYValue);
    doc.text(formatDate(h.issueDate), c2X, metaYValue);
    doc.text(formatDate(h.dueDate), c3X, metaYValue);

    // CustomBorder (2px accent).
    var customBorderY = pxToMm(132);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(thickLine);
    doc.line(margin, customBorderY, pageW - margin, customBorderY);

    // Seller/Buyer blocks.
    var partiesTop = pxToMm(146);
    var gap = pxToMm(12);
    var partyWidth = (contentW - gap) / 2;
    var sellerBankAccounts = (payment.meansTypeCode === '30' && Array.isArray(payment.accounts)) ? payment.accounts : [];
    var buyerBankAccounts = (payment.meansTypeCode === '30' && Array.isArray(buyer.bankAccounts)) ? buyer.bankAccounts : [];
    var sellerEndY = drawPartyColumn('Seller:', seller, sellerBankAccounts, margin, partiesTop, partyWidth);
    var buyerEndY = drawPartyColumn('Buyer:', buyer, buyerBankAccounts, margin + partyWidth + gap, partiesTop, partyWidth);
    y = Math.max(sellerEndY, buyerEndY) + pxToMm(10);

    // Payment reference.
    if ((payment.paymentId || '').trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      doc.text('Payment reference: ' + safeText(payment.paymentId), margin, y);
      y += pxToMm(16);
    } else {
      y += pxToMm(6);
    }

    function drawTableHeader(startY) {
      var labelY = startY + pxToMm(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setColor(COLOR_TEXT);
      doc.text('Service / Product', xService + pxToMm(4), labelY);
      doc.text('Quantity', xQty + pxToMm(4), labelY);
      doc.text('Unite price', xUnit + colUnit - pxToMm(4), labelY, { align: 'right' });
      doc.text('Tax', xTax + colTax - pxToMm(4), labelY, { align: 'right' });
      doc.text('Tax amount', xTaxAmount + colTaxAmount - pxToMm(4), labelY, { align: 'right' });
      doc.text('Total', xTotal + colTotal - pxToMm(4), labelY, { align: 'right' });
      // Cell bottom border (2px accent).
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.setLineWidth(thickLine);
      doc.line(margin, startY + rowH, pageW - margin, startY + rowH);
      return startY + rowH;
    }

    y = drawTableHeader(y);

    var lines = draft.lines || [];
    var lineComputed = (computed && computed.lines) ? computed.lines : [];
    var lineMap = {};
    lineComputed.forEach(function (l) { lineMap[l.id] = l; });

    for (var i = 0; i < lines.length; i++) {
      ensureSpace(rowH + pxToMm(2), drawTableHeader);
      var line = lines[i] || {};
      var comp = lineMap[line.id] || {};
      var rowTextY = y + pxToMm(15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(COLOR_TEXT);
      doc.text(ellipsis(safeText(line.itemName, '—'), 44), xService + pxToMm(4), rowTextY);
      doc.text(ellipsis(formatQuantity(line.quantity, line.unitCode), 12), xQty + pxToMm(4), rowTextY);
      doc.text(formatAmount(Number(line.netPrice || 0)) + ' ' + cc, xUnit + colUnit - pxToMm(4), rowTextY, { align: 'right' });
      doc.text(String(line.vatRate == null ? '—' : (line.vatRate + '%')), xTax + colTax - pxToMm(4), rowTextY, { align: 'right' });
      doc.text(formatAmount(comp.lineTaxAmount || 0) + ' ' + cc, xTaxAmount + colTaxAmount - pxToMm(4), rowTextY, { align: 'right' });
      doc.text(formatAmount(comp.lineGrossAmount || 0) + ' ' + cc, xTotal + colTotal - pxToMm(4), rowTextY, { align: 'right' });

      // Row divider (neutral).
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(pxToMm(1));
      doc.line(margin, y + rowH, pageW - margin, y + rowH);
      y += rowH;
    }

    y += pxToMm(8);
    ensureSpace(pxToMm(70), null);

    // Totals panel on right side.
    var subtotal = (computed && computed.subtotal != null) ? computed.subtotal : 0;
    var documentDiscount = (computed && computed.documentDiscount != null) ? computed.documentDiscount : 0;
    var totalVAT = (computed && computed.totalVAT != null) ? computed.totalVAT : 0;
    var payableAmount = (computed && computed.payableAmount != null) ? computed.payableAmount : 0;

    var totalRows = [];
    totalRows.push({ label: 'Subtotal', value: formatAmount(subtotal) + ' ' + cc, strong: false });
    if (computed && computed.taxBreakdown && computed.taxBreakdown.length) {
      computed.taxBreakdown.forEach(function (tb) {
        totalRows.push({ label: 'Tax (' + tb.rate + '%)', value: formatAmount(tb.taxAmount) + ' ' + cc, strong: false });
      });
    } else {
      totalRows.push({ label: 'Total VAT', value: formatAmount(totalVAT) + ' ' + cc, strong: false });
    }
    if (documentDiscount > 0) {
      totalRows.push({ label: 'Discount', value: '- ' + formatAmount(documentDiscount) + ' ' + cc, strong: false });
    }
    totalRows.push({ label: 'Total', value: formatAmount(payableAmount) + ' ' + cc, strong: true });

    for (var r = 0; r < totalRows.length; r++) {
      var tr = totalRows[r];
      var rowTop = y + r * rowH;
      var textY = rowTop + pxToMm(15);
      doc.setFont('helvetica', tr.strong ? 'bold' : 'normal');
      doc.setFontSize(tr.strong ? 10 : 8.5);
      setColor(COLOR_TEXT);
      doc.text(tr.label, xTaxAmount + colTaxAmount - pxToMm(4), textY, { align: 'right' });
      doc.text(tr.value, xTotal + colTotal - pxToMm(4), textY, { align: 'right' });

      if (!tr.strong) {
        doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        doc.setLineWidth(pxToMm(1));
        doc.line(xTaxAmount, rowTop + rowH, xTaxAmount + colTaxAmount + colTotal, rowTop + rowH);
      }
    }

    // Total / Value top border (2px accent).
    var strongTopY = y + (totalRows.length - 1) * rowH;
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(thickLine);
    doc.line(xTaxAmount, strongTopY, xTaxAmount + colTaxAmount + colTotal, strongTopY);

    y = y + totalRows.length * rowH + pxToMm(12);

    // Note paragraph.
    if (h.note && String(h.note).trim()) {
      ensureSpace(pxToMm(40), null);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setColor(COLOR_MUTED);
      var noteLines = doc.splitTextToSize(String(h.note).trim(), contentW);
      for (var n = 0; n < noteLines.length; n++) {
        ensureSpace(pxToMm(8), null);
        doc.text(noteLines[n], margin, y);
        y += pxToMm(8);
      }
    }

    // Footer on all pages.
    var totalPages = doc.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      setColor(COLOR_MUTED);
      doc.text('Page ' + p + ' of ' + totalPages, margin, footerY);
      doc.text('Invoice number: ' + safeText(h.invoiceNumber, '—'), pageW - margin, footerY, { align: 'right' });
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
