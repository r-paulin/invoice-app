/**
 * Invio — validation: mandatory/conditional EN 16931-1 + PEPPOL; block export if not compliant
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/;

const VAT_CATEGORY_CODES = ['S', 'Z', 'E', 'G', 'O', 'K', 'L', 'M', 'N', 'A'];
const UNIT_CODES = ['C62', 'DAY', 'HUR', 'KGM', 'LTR', 'MTR', 'MTK', 'MTQ', 'PCE', 'KMT'];

function nonEmpty(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

function validIsoDate(s) {
  return nonEmpty(s) && ISO_DATE.test(s) && !isNaN(Date.parse(s));
}

function validEmail(s) {
  if (!s) return true;
  return typeof s === 'string' && EMAIL.test(s.trim());
}

function validIban(s) {
  if (!s) return true;
  const normalized = String(s).replace(/\s/g, '').toUpperCase();
  return IBAN.test(normalized);
}

function validVatCategory(code) {
  return code && VAT_CATEGORY_CODES.includes(String(code).toUpperCase());
}

function validUnitCode(code) {
  return code && UNIT_CODES.includes(String(code));
}

/**
 * Validate draft; returns { valid: boolean, errors: string[] }
 */
function validateDraft(draft) {
  const errors = [];

  if (!draft || typeof draft !== 'object') {
    return { valid: false, errors: ['Invalid draft'] };
  }

  const h = draft.header || {};
  const seller = draft.seller || {};
  const buyer = draft.buyer || {};
  const addrS = seller.address || {};
  const addrB = buyer.address || {};
  const lines = draft.lines || [];
  const payment = draft.payment || {};

  // BT-1
  if (!nonEmpty(h.invoiceNumber)) errors.push('Invoice number (BT-1) is required');
  // BT-2
  if (!validIsoDate(h.issueDate)) errors.push('Invoice date (BT-2) must be a valid ISO date (YYYY-MM-DD)');
  // BT-3
  if (!nonEmpty(h.typeCode)) errors.push('Invoice type code (BT-3) is required');
  // BT-5
  if (!nonEmpty(h.currencyCode)) errors.push('Currency code (BT-5) is required');

  // Seller BT-27, BG-5, BT-40
  if (!nonEmpty(seller.name)) errors.push('Seller name (BT-27) is required');
  if (!nonEmpty(addrS.countryCode)) errors.push('Seller country (BT-40) is required');

  // Buyer BT-44, BG-8, BT-55
  if (!nonEmpty(buyer.name)) errors.push('Buyer name (BT-44) is required');
  if (!nonEmpty(addrB.countryCode)) errors.push('Buyer country (BT-55) is required');

  // At least one line (BG-25)
  if (!lines.length) errors.push('At least one invoice line (BG-25) is required');

  lines.forEach((line, i) => {
    const idx = i + 1;
    if (!nonEmpty(line.itemName)) errors.push(`Line ${idx}: Item name (BT-153) is required`);
    const q = Number(line.quantity);
    if (isNaN(q) || q <= 0) errors.push(`Line ${idx}: Quantity (BT-129) must be greater than 0`);
    if (!validUnitCode(line.unitCode)) errors.push(`Line ${idx}: Unit code (BT-130) must be a valid UN/ECE code (e.g. C62, DAY)`);
    const p = Number(line.netPrice);
    if (isNaN(p) || p < 0) errors.push(`Line ${idx}: Net price (BT-146) must be a non-negative number`);
    if (!validVatCategory(line.vatCategoryCode)) errors.push(`Line ${idx}: VAT category code (BT-151) is required and must be one of: ${VAT_CATEGORY_CODES.join(', ')}`);
  });

  // Optional but format checks
  if (seller.contact && seller.contact.email && !validEmail(seller.contact.email)) {
    errors.push('Seller email must be a valid email address');
  }
  if (buyer.contact && buyer.contact.email && !validEmail(buyer.contact.email)) {
    errors.push('Buyer email must be a valid email address');
  }

  // Payment: if credit transfer (30), IBAN recommended/required per BR-61
  const meansCode = payment.meansTypeCode || '';
  if (meansCode === '30' && nonEmpty(payment.accountId) && !validIban(payment.accountId)) {
    errors.push('IBAN (BT-84) must be a valid IBAN when payment is by credit transfer');
  }

  // Due date if present
  if (h.dueDate && !validIsoDate(h.dueDate)) errors.push('Due date (BT-9) must be a valid ISO date');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Run validation and reconciliation; export should call this and block if !result.valid
 */
function validateForExport(draft) {
  const v = validateDraft(draft);
  if (!v.valid) return v;

  if (typeof window !== 'undefined' && window.InvioCalc) {
    const recon = window.InvioCalc.checkReconciliation(draft);
    if (!recon.ok) {
      return {
        valid: false,
        errors: ['Calculations mismatch: totals do not reconcile. Review your data.']
      };
    }
  }

  return v;
}

if (typeof window !== 'undefined') {
  window.InvioValidation = {
    validateDraft,
    validateForExport,
    validIsoDate,
    validEmail,
    validIban,
    validVatCategory,
    validUnitCode,
    VAT_CATEGORY_CODES,
    UNIT_CODES
  };
}
