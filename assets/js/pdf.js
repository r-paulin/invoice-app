/**
 * Invio — PDF generation (pdf-lib). Totals must match XML/calc exactly.
 */

async function generatePDF(draft, totals) {
  const pdfLib = typeof window !== 'undefined' && (window.pdfLib || window);
  if (!pdfLib || !pdfLib.PDFDocument) return { ok: false, error: 'pdf-lib not loaded' };

  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const margin = 50;
  let y = 800;
  const lineHeight = 14;
  const smallLine = 12;

  const h = draft.header || {};
  const seller = draft.seller || {};
  const buyer = draft.buyer || {};
  const addrS = seller.address || {};
  const addrB = buyer.address || {};
  const cc = totals.currencyCode || 'EUR';

  function drawText(text, x, size = 10, bold = false) {
    const f = bold ? fontBold : font;
    page.drawText(text, { x: margin + x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 2;
  }

  page.drawText('INVOICE', { x: margin, y, size: 18, font: fontBold, color: rgb(0, 0.49, 0.31) });
  y -= 24;

  drawText(`Invoice number: ${h.invoiceNumber || '-'}`, 0);
  drawText(`Invoice date: ${h.issueDate || '-'}`, 0);
  drawText(`Due date: ${h.dueDate || '-'}`, 0);
  drawText(`Currency: ${cc}`, 0);
  if (h.buyerReference) drawText(`Reference: ${h.buyerReference}`, 0);
  y -= lineHeight;

  drawText('Seller', 0, 12, true);
  drawText(seller.name || '-', 0);
  if (addrS.line1) drawText(addrS.line1, 0, smallLine);
  if (addrS.city || addrS.postalCode) drawText([addrS.postalCode, addrS.city].filter(Boolean).join(' '), 0, smallLine);
  if (addrS.countryCode) drawText(addrS.countryCode, 0, smallLine);
  if (seller.vatId) drawText(`VAT: ${seller.vatId}`, 0, smallLine);
  y -= lineHeight;

  drawText('Buyer', 0, 12, true);
  drawText(buyer.name || '-', 0);
  if (addrB.line1) drawText(addrB.line1, 0, smallLine);
  if (addrB.city || addrB.postalCode) drawText([addrB.postalCode, addrB.city].filter(Boolean).join(' '), 0, smallLine);
  if (addrB.countryCode) drawText(addrB.countryCode, 0, smallLine);
  if (buyer.vatId) drawText(`VAT: ${buyer.vatId}`, 0, smallLine);
  y -= lineHeight;

  drawText('Invoice lines', 0, 12, true);
  const lineNetsMap = {};
  (totals.lineNets || []).forEach(ln => { lineNetsMap[ln.id] = ln.lineNet; });
  (draft.lines || []).forEach(line => {
    const net = lineNetsMap[line.id] ?? 0;
    drawText(`${line.itemName || '-'} | ${line.quantity} ${line.unitCode || 'C62'} x ${Number(line.netPrice).toFixed(2)} ${cc} = ${net.toFixed(2)} ${cc}`, 0, smallLine);
  });
  y -= lineHeight;

  drawText('Totals', 0, 12, true);
  drawText(`Invoice lines subtotal: ${totals.lineNetSum.toFixed(2)} ${cc}`, 0);
  if (totals.allowanceSum > 0) drawText(`Document discount: -${totals.allowanceSum.toFixed(2)} ${cc}`, 0);
  drawText(`Total net amount: ${totals.taxExclusive.toFixed(2)} ${cc}`, 0);
  (totals.vatBreakdown || []).forEach(vb => {
    drawText(`VAT (${vb.rate}%): ${vb.taxAmount.toFixed(2)} ${cc}`, 0);
  });
  drawText(`Total VAT: ${totals.totalVat.toFixed(2)} ${cc}`, 0);
  drawText(`Total amount: ${totals.taxInclusive.toFixed(2)} ${cc}`, 0);
  drawText(`Amount payable: ${totals.payable.toFixed(2)} ${cc}`, 0, 11, true);
  y -= lineHeight;

  if (draft.payment && (draft.payment.bankName || draft.payment.accountId)) {
    drawText('Payment', 0, 12, true);
    if (draft.payment.bankName) drawText(`Bank: ${draft.payment.bankName}`, 0, smallLine);
    if (draft.payment.accountId) drawText(`IBAN: ${draft.payment.accountId}`, 0, smallLine);
    y -= lineHeight;
  }

  if (h.note) {
    drawText('Note', 0, 12, true);
    drawText(h.note, 0, smallLine);
  }

  const pdfBytes = await doc.save();
  return { ok: true, pdfBytes };
}

async function generateAndDownloadPDF(draft) {
  if (typeof window === 'undefined' || !window.InvioCalc || !window.InvioValidation) return { ok: false, error: 'Missing deps' };
  const result = window.InvioValidation.validateForExport(draft);
  if (!result.valid) return { ok: false, errors: result.errors };
  const totals = window.InvioCalc.computeTotals(draft);
  const recon = window.InvioCalc.checkReconciliation(draft);
  if (!recon.ok) return { ok: false, errors: ['Totals do not reconcile'] };
  const out = await generatePDF(draft, totals);
  if (!out.ok) return out;
  const blob = new Blob([out.pdfBytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (draft.header && draft.header.invoiceNumber) ? `invoice_${draft.header.invoiceNumber}.pdf` : 'invoice.pdf';
  a.click();
  URL.revokeObjectURL(a.href);
  return { ok: true };
}

if (typeof window !== 'undefined') {
  window.InvioPDF = {
    generatePDF,
    generateAndDownloadPDF
  };
}
