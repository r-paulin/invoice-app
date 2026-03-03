/**
 * Invio — PEPPOL BIS Billing 3.0 / UBL 2.1 Invoice XML
 * Native DOM createElementNS; no xmlbuilder
 */

const NS_INVOICE = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
const NS_CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const NS_CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

function el(doc, ns, tag, value) {
  const e = doc.createElementNS(ns, tag);
  if (value !== undefined && value !== null && value !== '') e.textContent = value;
  return e;
}

function elCbc(doc, tag, value, attrs) {
  const e = el(doc, NS_CBC, 'cbc:' + tag, value);
  if (attrs && attrs.currencyID) e.setAttribute('currencyID', attrs.currencyID);
  return e;
}

function elCac(doc, tag) {
  return doc.createElementNS(NS_CAC, 'cac:' + tag);
}

function addChild(parent, child) {
  if (child) parent.appendChild(child);
  return parent;
}


/**
 * Map calcInvoice(draft) result to internal totals shape for XML building.
 * Includes prepaidAmount and roundingAmount for LegalMonetaryTotal (UBL 2.1 schema order).
 */
function computedToTotals(computed) {
  const taxExclusive = computed.subtotal - computed.documentDiscount + computed.documentCharge;
  const taxInclusive = taxExclusive + computed.totalVAT;
  return {
    currencyCode: computed.currencyCode,
    lineNetSum: computed.subtotal,
    allowanceSum: computed.documentDiscount,
    chargeSum: computed.documentCharge,
    taxExclusive: taxExclusive,
    totalVat: computed.totalVAT,
    taxInclusive: taxInclusive,
    payable: computed.payableAmount,
    prepaidAmount: computed.prepaidAmount != null ? computed.prepaidAmount : 0,
    roundingAmount: computed.roundingAmount != null ? computed.roundingAmount : 0,
    vatBreakdown: computed.taxBreakdown,
    lineNets: (computed.lines || []).map(function (l) { return { id: l.id, lineNet: l.lineNetAmount }; })
  };
}

/**
 * Build UBL 2.1 Invoice from validated draft and calcInvoice(draft) result.
 * Optional settings { accentColor } adds a comment for border/accent styling (invio extension).
 * Element order follows InvoiceType sequence (cvc-complex-type.2.4.a compliant).
 * Call assertExportReconciliation(computed) before calling this.
 */
function buildInvoiceXML(draft, computed, settings) {
  const impl = typeof document !== 'undefined' ? document.implementation : null;
  if (!impl) return null;
  const totals = computed && computed.lines ? computedToTotals(computed) : computed;
  const doc = impl.createDocument(NS_INVOICE, 'Invoice', null);
  const root = doc.documentElement;
  root.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', NS_INVOICE);
  root.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:cac', NS_CAC);
  root.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:cbc', NS_CBC);

  const accentHex = (settings && settings.accentColor && /^#[0-9A-Fa-f]{6}$/.test(settings.accentColor)) ? settings.accentColor : '#000000';
  const accentComment = doc.createComment(' invio:accentColor ' + accentHex + ' ');
  root.insertBefore(accentComment, root.firstChild);

  const h = draft.header || {};
  const cc = (totals.currencyCode || h.currencyCode || 'EUR').trim().toUpperCase();

  function countryCode(addr) {
    return (addr && addr.countryCode ? addr.countryCode : '').trim().toUpperCase();
  }

  // —— 1. UBLVersionID, CustomizationID, ProfileID, ID, IssueDate, DueDate, InvoiceTypeCode ——
  addChild(root, elCbc(doc, 'UBLVersionID', '2.1'));
  addChild(root, elCbc(doc, 'CustomizationID', (h.customizationId || h.specificationId || PEPPOL_CUSTOMIZATION_ID).trim()));
  addChild(root, elCbc(doc, 'ProfileID', (h.profileId || PEPPOL_PROFILE_ID).trim()));
  addChild(root, elCbc(doc, 'ID', h.invoiceNumber));
  addChild(root, elCbc(doc, 'IssueDate', h.issueDate));
  if (h.dueDate) addChild(root, elCbc(doc, 'DueDate', h.dueDate));
  addChild(root, elCbc(doc, 'InvoiceTypeCode', h.typeCode || '380'));

  // —— 2. Note(s) [0..*] ——
  if (h.languageCode) addChild(root, elCbc(doc, 'Note', 'Document language: ' + (h.languageCode || '').toUpperCase()));
  if (h.note) addChild(root, elCbc(doc, 'Note', h.note));

  // —— 3. DocumentCurrencyCode [0..1] ——
  addChild(root, elCbc(doc, 'DocumentCurrencyCode', cc));

  // —— 4. BuyerReference [0..1] ——
  if (h.buyerReference) addChild(root, elCbc(doc, 'BuyerReference', h.buyerReference));

  // —— 5. AccountingSupplierParty (seller) [1..1] — Party: PartyName, PostalAddress, PartyTaxScheme, PartyLegalEntity ——
  const seller = draft.seller || {};
  const addrS = seller.address || {};
  const supplierParty = elCac(doc, 'AccountingSupplierParty');
  const supplierPartyParty = elCac(doc, 'Party');
  if (seller.name) {
    const partyName = elCac(doc, 'PartyName');
    addChild(partyName, elCbc(doc, 'Name', seller.tradeName || seller.name));
    addChild(supplierPartyParty, partyName);
  }
  const supplierAddr = elCac(doc, 'PostalAddress');
  if (addrS.line1) addChild(supplierAddr, elCbc(doc, 'StreetName', addrS.line1));
  if (addrS.city) addChild(supplierAddr, elCbc(doc, 'CityName', addrS.city));
  if (addrS.postalCode) addChild(supplierAddr, elCbc(doc, 'PostalZone', addrS.postalCode));
  const supplierCountry = elCac(doc, 'Country');
  addChild(supplierCountry, elCbc(doc, 'IdentificationCode', countryCode(addrS)));
  addChild(supplierAddr, supplierCountry);
  addChild(supplierPartyParty, supplierAddr);
  if (seller.vatId) {
    const supplierTax = elCac(doc, 'PartyTaxScheme');
    addChild(supplierTax, elCbc(doc, 'CompanyID', seller.vatId));
    const taxSchemeS = elCac(doc, 'TaxScheme');
    addChild(taxSchemeS, elCbc(doc, 'ID', 'VAT'));
    addChild(supplierTax, taxSchemeS);
    addChild(supplierPartyParty, supplierTax);
  }
  const supplierLegal = elCac(doc, 'PartyLegalEntity');
  addChild(supplierLegal, elCbc(doc, 'RegistrationName', seller.name));
  if (seller.legalRegistrationId) addChild(supplierLegal, elCbc(doc, 'CompanyID', seller.legalRegistrationId));
  addChild(supplierPartyParty, supplierLegal);
  addChild(supplierParty, supplierPartyParty);
  addChild(root, supplierParty);

  // —— 6. AccountingCustomerParty (buyer) [1..1] — Party: PartyName, PostalAddress, PartyTaxScheme, PartyLegalEntity ——
  const buyer = draft.buyer || {};
  const addrB = buyer.address || {};
  const customerParty = elCac(doc, 'AccountingCustomerParty');
  const customerPartyParty = elCac(doc, 'Party');
  if (buyer.name) {
    const partyName = elCac(doc, 'PartyName');
    addChild(partyName, elCbc(doc, 'Name', buyer.tradeName || buyer.name));
    addChild(customerPartyParty, partyName);
  }
  const customerAddr = elCac(doc, 'PostalAddress');
  if (addrB.line1) addChild(customerAddr, elCbc(doc, 'StreetName', addrB.line1));
  if (addrB.city) addChild(customerAddr, elCbc(doc, 'CityName', addrB.city));
  if (addrB.postalCode) addChild(customerAddr, elCbc(doc, 'PostalZone', addrB.postalCode));
  const customerCountry = elCac(doc, 'Country');
  addChild(customerCountry, elCbc(doc, 'IdentificationCode', countryCode(addrB)));
  addChild(customerAddr, customerCountry);
  addChild(customerPartyParty, customerAddr);
  if (buyer.vatId) {
    const customerTax = elCac(doc, 'PartyTaxScheme');
    addChild(customerTax, elCbc(doc, 'CompanyID', buyer.vatId));
    const taxSchemeC = elCac(doc, 'TaxScheme');
    addChild(taxSchemeC, elCbc(doc, 'ID', 'VAT'));
    addChild(customerTax, taxSchemeC);
    addChild(customerPartyParty, customerTax);
  }
  const customerLegal = elCac(doc, 'PartyLegalEntity');
  addChild(customerLegal, elCbc(doc, 'RegistrationName', buyer.name));
  if (buyer.legalRegistrationId) addChild(customerLegal, elCbc(doc, 'CompanyID', buyer.legalRegistrationId));
  addChild(customerPartyParty, customerLegal);
  addChild(customerParty, customerPartyParty);
  addChild(root, customerParty);

  // —— 7. PaymentMeans [0..*] — schema: PaymentMeansCode, PaymentDueDate, InstructionNote, PaymentID, PayeeFinancialAccount ——
  const payment = draft.payment || {};
  const means = payment.meansTypeCode || '30';
  const paymentMeans = elCac(doc, 'PaymentMeans');
  addChild(paymentMeans, elCbc(doc, 'PaymentMeansCode', means));
  if (h.dueDate) addChild(paymentMeans, elCbc(doc, 'PaymentDueDate', h.dueDate));
  if (payment.paymentMeansDisplayName) addChild(paymentMeans, elCbc(doc, 'InstructionNote', payment.paymentMeansDisplayName));
  if (payment.paymentId) addChild(paymentMeans, elCbc(doc, 'PaymentID', payment.paymentId));
  if (payment.accountId && means === '30') {
    const payeeFin = elCac(doc, 'PayeeFinancialAccount');
    addChild(payeeFin, elCbc(doc, 'ID', payment.accountId));
    if (payment.bankName) {
      const finBranch = elCac(doc, 'FinancialInstitutionBranch');
      addChild(finBranch, elCbc(doc, 'Name', payment.bankName));
      addChild(payeeFin, finBranch);
    }
    addChild(paymentMeans, payeeFin);
  }
  addChild(root, paymentMeans);

  // —— 8. TaxTotal [0..*] (BG-23) ——
  const taxTotal = elCac(doc, 'TaxTotal');
  addChild(taxTotal, elCbc(doc, 'TaxAmount', totals.totalVat.toFixed(2), { currencyID: cc }));
  (totals.vatBreakdown || []).forEach(vb => {
    const sub = elCac(doc, 'TaxSubtotal');
    addChild(sub, elCbc(doc, 'TaxableAmount', vb.taxableAmount.toFixed(2), { currencyID: cc }));
    addChild(sub, elCbc(doc, 'TaxAmount', vb.taxAmount.toFixed(2), { currencyID: cc }));
    const cat = elCac(doc, 'TaxCategory');
    addChild(cat, elCbc(doc, 'ID', vb.categoryCode));
    if (vb.rate != null) addChild(cat, elCbc(doc, 'Percent', String(vb.rate)));
    const taxScheme = elCac(doc, 'TaxScheme');
    addChild(taxScheme, elCbc(doc, 'ID', 'VAT'));
    addChild(cat, taxScheme);
    addChild(sub, cat);
    addChild(taxTotal, sub);
  });
  addChild(root, taxTotal);

  // —— 9. LegalMonetaryTotal [1..1] — schema: LineExtensionAmount, TaxExclusiveAmount, TaxInclusiveAmount, AllowanceTotalAmount, ChargeTotalAmount, PrepaidAmount, PayableRoundingAmount, PayableAmount ——
  const monetary = elCac(doc, 'LegalMonetaryTotal');
  addChild(monetary, elCbc(doc, 'LineExtensionAmount', totals.lineNetSum.toFixed(2), { currencyID: cc }));
  addChild(monetary, elCbc(doc, 'TaxExclusiveAmount', totals.taxExclusive.toFixed(2), { currencyID: cc }));
  addChild(monetary, elCbc(doc, 'TaxInclusiveAmount', totals.taxInclusive.toFixed(2), { currencyID: cc }));
  if (totals.allowanceSum > 0) {
    addChild(monetary, elCbc(doc, 'AllowanceTotalAmount', totals.allowanceSum.toFixed(2), { currencyID: cc }));
  }
  if (totals.chargeSum > 0) {
    addChild(monetary, elCbc(doc, 'ChargeTotalAmount', totals.chargeSum.toFixed(2), { currencyID: cc }));
  }
  if (totals.prepaidAmount != null && Number(totals.prepaidAmount) !== 0) {
    addChild(monetary, elCbc(doc, 'PrepaidAmount', Number(totals.prepaidAmount).toFixed(2), { currencyID: cc }));
  }
  if (totals.roundingAmount != null && Number(totals.roundingAmount) !== 0) {
    addChild(monetary, elCbc(doc, 'PayableRoundingAmount', Number(totals.roundingAmount).toFixed(2), { currencyID: cc }));
  }
  addChild(monetary, elCbc(doc, 'PayableAmount', totals.payable.toFixed(2), { currencyID: cc }));
  addChild(root, monetary);

  // —— 10. InvoiceLine(s) [1..*] — schema: ID, InvoicedQuantity, LineExtensionAmount, Item, Price ——
  const lineNetsMap = {};
  (totals.lineNets || []).forEach(ln => { lineNetsMap[ln.id] = ln.lineNet; });
  (draft.lines || []).forEach(line => {
    const lineEl = elCac(doc, 'InvoiceLine');
    addChild(lineEl, elCbc(doc, 'ID', line.id));
    const qty = elCbc(doc, 'InvoicedQuantity', String(line.quantity));
    qty.setAttribute('unitCode', line.unitCode || 'C62');
    addChild(lineEl, qty);
    addChild(lineEl, elCbc(doc, 'LineExtensionAmount', (lineNetsMap[line.id] ?? 0).toFixed(2), { currencyID: cc }));
    const item = elCac(doc, 'Item');
    if (line.itemDescription) addChild(item, elCbc(doc, 'Description', line.itemDescription));
    addChild(item, elCbc(doc, 'Name', line.itemName));
    const taxCat = elCac(doc, 'ClassifiedTaxCategory');
    addChild(taxCat, elCbc(doc, 'ID', line.vatCategoryCode || 'S'));
    if (line.vatRate != null) addChild(taxCat, elCbc(doc, 'Percent', String(line.vatRate)));
    const lineTaxScheme = elCac(doc, 'TaxScheme');
    addChild(lineTaxScheme, elCbc(doc, 'ID', 'VAT'));
    addChild(taxCat, lineTaxScheme);
    addChild(item, taxCat);
    addChild(lineEl, item);
    const price = elCac(doc, 'Price');
    addChild(price, elCbc(doc, 'PriceAmount', Number(line.netPrice).toFixed(2), { currencyID: cc }));
    addChild(lineEl, price);
    addChild(root, lineEl);
  });

  return doc;
}

/**
 * Sanitize invoice number for export filename: remove spaces; allow alphanumeric and dash only; max length 50.
 */
function sanitizeInvoiceNumberForFilename(invoiceNumber) {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') return '';
  return String(invoiceNumber).replace(/\s/g, '').replace(/[^A-Za-z0-9\-]/g, '').slice(0, 50) || '';
}

/**
 * Sanitize filename for download: allow only alphanumeric, hyphen, underscore; max 50 for export.
 */
function sanitizeDownloadFilename(name) {
  if (!name || typeof name !== 'string') return 'invoice';
  return name.replace(/[^A-Za-z0-9_\-]/g, '_').slice(0, 50) || 'invoice';
}

/**
 * Export filename base: invoice-{sanitizedInvoiceNumber}
 */
function exportFilenameBase(invoiceNumber) {
  const safe = sanitizeInvoiceNumberForFilename(invoiceNumber);
  return safe ? 'invoice-' + safe : 'invoice';
}

/**
 * Serialize to string and trigger download
 */
function serializeAndDownload(doc, filename) {
  const ser = new XMLSerializer();
  let str = ser.serializeToString(doc);
  str = '<?xml version="1.0" encoding="UTF-8"?>\n' + str;
  const blob = new Blob([str], { type: 'application/xml' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  const safeBase = (filename && filename.replace) ? filename.replace(/\.xml$/i, '').trim() : '';
  a.download = (safeBase ? sanitizeDownloadFilename(safeBase) : 'invoice') + '.xml';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/**
 * Generate and download XML; call after validateForExport(draft).valid and computeTotals(draft)
 */
function generateAndDownloadXML(draft) {
  if (typeof window === 'undefined' || !window.InvioCalc || !window.InvioValidation) return false;
  const result = window.InvioValidation.validateForExport(draft);
  if (!result.valid) return { ok: false, errors: result.errors };
  const totals = window.InvioCalc.computeTotals(draft);
  const recon = window.InvioCalc.checkReconciliation(draft);
  if (!recon.ok) return { ok: false, errors: ['Totals do not reconcile'] };
  const doc = buildInvoiceXML(draft, totals);
  if (!doc) return { ok: false, errors: ['Could not build XML'] };
  const baseName = exportFilenameBase(draft.header && draft.header.invoiceNumber);
  serializeAndDownload(doc, baseName);
  return { ok: true };
}

if (typeof window !== 'undefined') {
  window.InvioXML = {
    buildInvoiceXML,
    serializeAndDownload,
    generateAndDownloadXML,
    sanitizeInvoiceNumberForFilename,
    exportFilenameBase,
    sanitizeDownloadFilename,
    NS_CBC,
    NS_CAC
  };
}
