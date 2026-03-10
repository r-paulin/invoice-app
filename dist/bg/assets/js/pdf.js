/**
 * Invio — PDF generation (standalone). Uses calcInvoice(draft) result only; no DOM, no recalculation.
 * A4; multi-page when content overflows.
 */

(function () {
  var MM_PER_PX = 210 / 595; // Keep Figma 595px canvas proportions on A4 width.
  var COLOR_TEXT = [28, 25, 23];       // grey-900 #1c1917
  var COLOR_MUTED = [121, 113, 107];   // grey-500 #79716b
  var COLOR_BORDER = [214, 211, 209];  // grey-300 #d6d3d1
  var COLOR_WARNING = [251, 139, 36];  // amber for date validation warnings

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
    
    // Register Source Sans 3 font if available, otherwise fallback to helvetica.
    var fontFamily = 'helvetica';
    var hasSemibold = false;
    if (typeof window !== 'undefined' && window.InvioPDFFonts && window.InvioPDFFonts.register) {
      if (window.InvioPDFFonts.register(doc)) {
        fontFamily = 'SourceSans3';
        hasSemibold = true;
      }
    }
    // jsPDF style string: 'semibold' only when custom font is loaded, else fall back to 'bold'.
    var SEMIBOLD = hasSemibold ? 'semibold' : 'bold';
    var MEDIUM = hasSemibold ? 'medium' : 'normal';
    var pageW = 210;
    var pageH = 297;
    var margin = pxToMm(24); // Align with Figma frame.
    var footerInset = pxToMm(36);
    var footerY = pageH - footerInset;
    var y = margin;
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

    function drawLinkText(text, url, x, linkY) {
      setColor(COLOR_MUTED);
      doc.setFont(fontFamily, MEDIUM);
      doc.setFontSize(12);
      if (typeof doc.textWithLink === 'function') {
        doc.textWithLink(text, x, linkY, { url: url });
      } else {
        doc.text(text, x, linkY);
      }
    }

    function drawLogoSlot(x, y, w, h) {
      var hasLogo = settings && settings.logo && typeof settings.logo === 'string' && settings.logo.indexOf('data:image') === 0;
      
      // If no logo, don't draw anything - just reserve the space.
      if (!hasLogo) {
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
        var imgX = x + (w - imgW); // Right-aligned within slot.
        var imgY = y + ((h - imgH) / 2); // Vertically centered.
        doc.addImage(settings.logo, format, imgX, imgY, imgW, imgH);
      } catch (e) {}
    }

    function drawPartyColumn(title, party, bankAccounts, x, topY, width) {
      var addr = party.address || {};
      var contact = party.contact || {};
      var lineY = topY;
      var fieldLineHeight = pxToMm(15);
      var fieldFontSize = 10;

      // Title label (10px medium, grey-500).
      doc.setFont(fontFamily, MEDIUM);
      doc.setFontSize(fieldFontSize);
      setColor(COLOR_MUTED);
      doc.text(title, x, lineY);
      lineY += pxToMm(12) + pxToMm(8);

      // Company name (12px semibold, grey-900).
      doc.setFont(fontFamily, SEMIBOLD);
      doc.setFontSize(12);
      setColor(COLOR_TEXT);
      var companyName = safeText(party.name, '—');
      var wrappedName = doc.splitTextToSize(companyName, width);
      for (var i = 0; i < wrappedName.length; i++) {
        doc.text(wrappedName[i], x, lineY);
        lineY += pxToMm(16);
      }
      lineY += pxToMm(4);

      // Inline field: "Label: Value" on same line (10px medium, gap-4).
      function drawInlineField(label, value) {
        if (!value) return;
        doc.setFont(fontFamily, MEDIUM);
        doc.setFontSize(fieldFontSize);
        
        var labelText = label + ': ';
        setColor(COLOR_MUTED);
        var labelWidth = doc.getTextWidth(labelText);
        doc.text(labelText, x, lineY);
        
        setColor(COLOR_TEXT);
        var valueWidth = width - labelWidth;
        var wrappedValue = doc.splitTextToSize(String(value), valueWidth);
        
        for (var i = 0; i < wrappedValue.length; i++) {
          if (i === 0) {
            doc.text(wrappedValue[i], x + labelWidth, lineY);
          } else {
            lineY += fieldLineHeight;
            doc.text(wrappedValue[i], x + labelWidth, lineY);
          }
        }
        lineY += fieldLineHeight;
      }

      var addressValue = [addr.line1, addr.city, addr.postalCode, addr.countryCode].filter(Boolean).join(', ');
      drawInlineField('Address', addressValue);
      drawInlineField('Registration number', party.legalRegistrationId || '');
      drawInlineField('VAT number', party.vatId || '');

      if (Array.isArray(bankAccounts) && bankAccounts.length) {
        for (var i = 0; i < bankAccounts.length; i++) {
          var account = bankAccounts[i] || {};
          var bankValue = account.accountId || '';
          if (account.bankName) {
            bankValue += ' , ' + account.bankName;
          }
          if (account.bic) {
            bankValue += ' (BIC: ' + account.bic + ')';
          }
          drawInlineField('Bank account', bankValue);
        }
      }

      // Contact fields (with extra top padding per Figma).
      if (contact.email || contact.phone) {
        lineY += pxToMm(8);
      }
      drawInlineField('Email', contact.email || '');
      drawInlineField('Phone number', contact.phone || '');
      
      if (contact.website) {
        var urlToDisplayDomain = (typeof window !== 'undefined' && window.InvioValidation && window.InvioValidation.urlToDisplayDomain)
          ? window.InvioValidation.urlToDisplayDomain
          : function (u) { return u || ''; };
        var websiteLabel = urlToDisplayDomain(contact.website);
        if (websiteLabel) drawInlineField('Website', websiteLabel);
      }

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

    // Header title block (40px extrabold, leading 1.1, tracking -3px).
    y = margin;
    doc.setFontSize(40);
    doc.setFont(fontFamily, 'bold');
    setColor(COLOR_TEXT);
    doc.text('Invoice', margin, y + pxToMm(30));
    drawLinkText('Made with invoce.app', 'https://invoce.app', margin, y + pxToMm(44));

    var logoSlotW = pxToMm(140);
    var logoSlotH = pxToMm(80);
    var logoSlotX = pageW - margin - logoSlotW;
    var logoSlotY = margin;
    drawLogoSlot(logoSlotX, logoSlotY, logoSlotW, logoSlotH);

    // Meta row: Invoice number / Issue date / Due date.
    // Position: top(24) + top-grid(80) + gap(16) + padding-top(12) = 132px.
    var metaTop = margin + pxToMm(80) + pxToMm(16) + pxToMm(12);
    var metaYLabel = metaTop;
    var metaYValue = metaTop + pxToMm(12); // 10px label + 2px gap.
    var c1X = margin;
    var c2X = margin + pxToMm(128) + pxToMm(24);
    var c3X = c2X + pxToMm(63) + pxToMm(24);

    // Labels (10px medium, grey-500).
    doc.setFont(fontFamily, MEDIUM);
    doc.setFontSize(10);
    setColor(COLOR_MUTED);
    doc.text('Invoice number:', c1X, metaYLabel);
    doc.text('Issue date:', c2X, metaYLabel);
    doc.text('Due date:', c3X, metaYLabel);

    // Values (14px semibold, grey-900).
    doc.setFont(fontFamily, SEMIBOLD);
    doc.setFontSize(14);
    
    var invoiceNumber = (h.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      setColor(COLOR_WARNING);
      doc.text('[Invoice Number Required]', c1X, metaYValue);
    } else {
      setColor(COLOR_TEXT);
      doc.text(ellipsis(invoiceNumber, 28), c1X, metaYValue);
    }
    
    setColor(COLOR_TEXT);
    doc.text(formatDate(h.issueDate), c2X, metaYValue);
    
    var dueDateInvalid = h.dueDate && h.issueDate && h.dueDate < h.issueDate;
    if (dueDateInvalid) {
      setColor(COLOR_WARNING);
    } else {
      setColor(COLOR_TEXT);
    }
    doc.text(formatDate(h.dueDate), c3X, metaYValue);

    // Seller/Buyer blocks (gap-40 between columns).
    var partiesTop = metaYValue + pxToMm(14) + pxToMm(16);
    var gap = pxToMm(40);
    var partyWidth = (contentW - gap) / 2;
    var sellerBankAccounts = (payment.meansTypeCode === '30' && Array.isArray(payment.accounts)) ? payment.accounts : [];
    var buyerBankAccounts = (payment.meansTypeCode === '30' && Array.isArray(buyer.bankAccounts)) ? buyer.bankAccounts : [];
    var sellerEndY = drawPartyColumn('Seller:', seller, sellerBankAccounts, margin, partiesTop, partyWidth);
    var buyerEndY = drawPartyColumn('Buyer:', buyer, buyerBankAccounts, margin + partyWidth + gap, partiesTop, partyWidth);
    y = Math.max(sellerEndY, buyerEndY) + pxToMm(16);

    // Payment reference (14px medium, not bold).
    if ((payment.paymentId || '').trim()) {
      doc.setFont(fontFamily, MEDIUM);
      doc.setFontSize(14);
      setColor(COLOR_TEXT);
      doc.text('Payment reference: ' + safeText(payment.paymentId), margin, y);
      y += pxToMm(16);
    } else {
      y += pxToMm(6);
    }

    // Helper to draw amount with currency code in muted color (right-aligned).
    function drawAmountWithCurrency(amount, currency, xRight, textY) {
      var amountStr = formatAmount(amount);
      var currencyStr = ' ' + currency;
      var fullWidth = doc.getTextWidth(amountStr + currencyStr);
      var amountX = xRight - fullWidth;
      
      setColor(COLOR_TEXT);
      doc.text(amountStr, amountX, textY);
      setColor(COLOR_MUTED);
      doc.text(currencyStr, amountX + doc.getTextWidth(amountStr), textY);
    }

    var thinLine = 0.15;
    var headerRowH = pxToMm(17);
    var dataRowH = pxToMm(23);

    function drawAccentLine(atY) {
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.setLineWidth(thinLine);
      doc.line(margin, atY, pageW - margin, atY);
    }

    function drawTableHeader(startY) {
      // 1px accent line, then 12px space, then header labels.
      drawAccentLine(startY);
      var labelY = startY + pxToMm(12) + pxToMm(8);
      doc.setFont(fontFamily, SEMIBOLD);
      doc.setFontSize(8);
      setColor(COLOR_MUTED);
      doc.text('Service / Product', xService + pxToMm(4), labelY);
      doc.text('Quantity', xQty + pxToMm(4), labelY);
      doc.text('Unite price', xUnit + colUnit - pxToMm(4), labelY, { align: 'right' });
      doc.text('Tax', xTax + colTax - pxToMm(4), labelY, { align: 'right' });
      doc.text('Tax amount', xTaxAmount + colTaxAmount - pxToMm(4), labelY, { align: 'right' });
      doc.text('Total', xTotal + colTotal - pxToMm(4), labelY, { align: 'right' });
      return startY + pxToMm(12) + headerRowH;
    }

    y = drawTableHeader(y);

    var lines = draft.lines || [];
    var lineComputed = (computed && computed.lines) ? computed.lines : [];
    var lineMap = {};
    lineComputed.forEach(function (l) { lineMap[l.id] = l; });

    for (var i = 0; i < lines.length; i++) {
      ensureSpace(dataRowH + pxToMm(2), drawTableHeader);
      var line = lines[i] || {};
      var comp = lineMap[line.id] || {};
      var rowTextY = y + pxToMm(12);
      doc.setFont(fontFamily, MEDIUM);
      doc.setFontSize(10);
      setColor(COLOR_TEXT);
      doc.text(ellipsis(safeText(line.itemName, '—'), 44), xService + pxToMm(4), rowTextY);
      doc.text(ellipsis(formatQuantity(line.quantity, line.unitCode), 12), xQty + pxToMm(4), rowTextY);
      
      drawAmountWithCurrency(Number(line.netPrice || 0), cc, xUnit + colUnit - pxToMm(4), rowTextY);
      
      setColor(COLOR_TEXT);
      doc.text(String(line.vatRate == null ? '—' : (line.vatRate + '%')), xTax + colTax - pxToMm(4), rowTextY, { align: 'right' });
      
      drawAmountWithCurrency(comp.lineTaxAmount || 0, cc, xTaxAmount + colTaxAmount - pxToMm(4), rowTextY);
      drawAmountWithCurrency(comp.lineGrossAmount || 0, cc, xTotal + colTotal - pxToMm(4), rowTextY);

      y += dataRowH;

      // Row divider (grey-300) except after last row.
      if (i < lines.length - 1) {
        doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        doc.setLineWidth(thinLine);
        doc.line(margin, y, pageW - margin, y);
      }
    }

    // Bottom accent line after last data row.
    y += pxToMm(12);
    drawAccentLine(y);
    y += pxToMm(12);

    ensureSpace(pxToMm(70), null);

    // Totals panel on right side.
    var subtotal = (computed && computed.subtotal != null) ? computed.subtotal : 0;
    var documentDiscount = (computed && computed.documentDiscount != null) ? computed.documentDiscount : 0;
    var totalVAT = (computed && computed.totalVAT != null) ? computed.totalVAT : 0;
    var payableAmount = (computed && computed.payableAmount != null) ? computed.payableAmount : 0;

    var scenario = (typeof window !== 'undefined' && window.Invio && window.Invio.euVat)
      ? window.Invio.euVat.getVatScenarioFromDraft(draft)
      : 'domestic';
    
    // totalRows: { label, labelSuffix (muted), amount, currency, strong, isDiscount }
    var totalRows = [];
    totalRows.push({ label: 'Subtotal', labelSuffix: '', amount: subtotal, currency: cc, strong: false, isDiscount: false });
    
    if (scenario === 'intra_eu_rc') {
      totalRows.push({ label: 'VAT', labelSuffix: ' (Reverse charged)', amount: null, currency: '', strong: false, isDiscount: false });
    } else if (scenario === 'export') {
      totalRows.push({ label: 'VAT', labelSuffix: ' (Zero rated)', amount: null, currency: '', strong: false, isDiscount: false });
    } else if (scenario === 'no_vat_seller') {
      totalRows.push({ label: 'VAT', labelSuffix: ' (Not applicable)', amount: null, currency: '', strong: false, isDiscount: false });
    } else if (computed && computed.taxBreakdown && computed.taxBreakdown.length) {
      computed.taxBreakdown.forEach(function (tb) {
        // Skip Tax (0%) rows where taxAmount is 0 unless there's only one tax rate.
        if (tb.rate === 0 && tb.taxAmount === 0 && computed.taxBreakdown.length > 1) {
          return;
        }
        totalRows.push({ label: 'Tax', labelSuffix: ' (' + tb.rate + '%)', amount: tb.taxAmount, currency: cc, strong: false, isDiscount: false });
      });
    } else if (totalVAT > 0) {
      totalRows.push({ label: 'Total VAT', labelSuffix: '', amount: totalVAT, currency: cc, strong: false, isDiscount: false });
    }
    
    if (documentDiscount > 0) {
      totalRows.push({ label: 'Discount', labelSuffix: '', amount: documentDiscount, currency: cc, strong: false, isDiscount: true });
    }
    totalRows.push({ label: 'Total', labelSuffix: '', amount: payableAmount, currency: cc, strong: true, isDiscount: false });

    // Draw totals rows (no borders between rows).
    var totalsRowH = pxToMm(23);
    for (var r = 0; r < totalRows.length; r++) {
      var tr = totalRows[r];
      var rowTop = y + r * totalsRowH;
      var textY = rowTop + pxToMm(12);
      var labelX = xTaxAmount + colTaxAmount - pxToMm(4);
      var valueX = xTotal + colTotal - pxToMm(4);
      
      doc.setFont(fontFamily, tr.strong ? SEMIBOLD : MEDIUM);
      doc.setFontSize(tr.strong ? 12 : 10);
      
      if (tr.labelSuffix) {
        var fullLabel = tr.label + tr.labelSuffix;
        var fullLabelW = doc.getTextWidth(fullLabel);
        var mainLabelW = doc.getTextWidth(tr.label);
        var labelStartX = labelX - fullLabelW;
        
        setColor(COLOR_TEXT);
        doc.text(tr.label, labelStartX, textY);
        setColor(COLOR_MUTED);
        doc.text(tr.labelSuffix, labelStartX + mainLabelW, textY);
      } else {
        setColor(COLOR_TEXT);
        doc.text(tr.label, labelX, textY, { align: 'right' });
      }
      
      if (tr.amount === null) {
        setColor(COLOR_TEXT);
        doc.text('—', valueX, textY, { align: 'right' });
      } else if (tr.isDiscount) {
        var discountStr = '- ' + formatAmount(tr.amount);
        var currStr = ' ' + tr.currency;
        var totalDiscWidth = doc.getTextWidth(discountStr + currStr);
        var discStartX = valueX - totalDiscWidth;
        setColor(COLOR_TEXT);
        doc.text(discountStr, discStartX, textY);
        setColor(COLOR_MUTED);
        doc.text(currStr, discStartX + doc.getTextWidth(discountStr), textY);
      } else if (tr.strong) {
        setColor(COLOR_TEXT);
        doc.text(formatAmount(tr.amount) + ' ' + tr.currency, valueX, textY, { align: 'right' });
      } else {
        drawAmountWithCurrency(tr.amount, tr.currency, valueX, textY);
      }
    }

    y = y + totalRows.length * totalsRowH + pxToMm(12);

    // Note paragraph (9px medium, grey-500, leading 1.5).
    if (h.note && String(h.note).trim()) {
      ensureSpace(pxToMm(40), null);
      doc.setFont(fontFamily, MEDIUM);
      doc.setFontSize(9);
      setColor(COLOR_MUTED);
      var noteLines = doc.splitTextToSize(String(h.note).trim(), contentW);
      for (var n = 0; n < noteLines.length; n++) {
        ensureSpace(pxToMm(14), null);
        doc.text(noteLines[n], margin, y);
        y += pxToMm(14);
      }
    }

    // Footer on all pages (8px medium, grey-500).
    var totalPages = doc.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setFont(fontFamily, MEDIUM);
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
