/**
 * Invio — validation: mandatory/conditional EN 16931-1 + PEPPOL; block export if not compliant
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/;

const VAT_CATEGORY_CODES = ['S', 'Z', 'E', 'G', 'O', 'K', 'L', 'M', 'N', 'A'];
const UNIT_CODES = ['C62', 'DAY', 'HUR', 'KGM', 'LTR', 'MTR', 'MTK', 'MTQ', 'PCE', 'KMT'];

/** MVP: per-country registration ID regex (alphanumeric + hyphen, reasonable length) */
const REGISTRATION_REGEX = {
  LV: /^[0-9]{11}$/,
  LT: /^[0-9]{9}$/,
  EE: /^[0-9]{8}$/,
  DE: /^[A-Z0-9]{1,12}$/i,
  AT: /^[0-9]{6,9}$/,
  NL: /^[0-9]{8}$/,
  BE: /^[0-9]{10}$/,
  FR: /^[0-9]{9}$/,
  ES: /^[A-Z0-9]{8,12}$/i,
  IT: /^[0-9]{11}$/,
  PL: /^[0-9]{10}$/,
  CZ: /^[0-9]{8}$/,
  SK: /^[0-9]{8}$/,
  HU: /^[0-9]{8}$/,
  RO: /^[0-9]{2,10}$/,
  BG: /^[0-9]{9,13}$/,
  GR: /^[0-9]{9}$/,
  PT: /^[0-9]{9}$/,
  SE: /^[0-9]{6}-[0-9]{4}$/,
  DK: /^[0-9]{8}$/,
  FI: /^[0-9]{7}-[0-9]{1}$/,
  IE: /^[0-9]{7}[A-Z]{1,2}$/i,
  LU: /^[0-9]{8}$/,
  MT: /^[A-Z0-9]{1,8}$/i,
  CY: /^[0-9]{8}[A-Z]$/i,
  SI: /^[0-9]{8}$/,
  HR: /^[0-9]{11}$/
};

/** EU VAT: country prefix + digits (MVP simplified) */
const VAT_REGEX = {
  LV: /^LV[0-9]{11}$/i,
  LT: /^LT[0-9]{9,12}$/i,
  EE: /^EE[0-9]{9}$/i,
  DE: /^DE[0-9]{9}$/i,
  AT: /^ATU[0-9]{8}$/i,
  NL: /^NL[0-9]{9}B[0-9]{2}$/i,
  BE: /^BE[0-9]{10}$/i,
  FR: /^FR[A-Z0-9]{2}[0-9]{9}$/i,
  ES: /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/i,
  IT: /^IT[0-9]{11}$/i,
  PL: /^PL[0-9]{10}$/i,
  CZ: /^CZ[0-9]{8,10}$/i,
  SK: /^SK[0-9]{10}$/i,
  HU: /^HU[0-9]{8}$/i,
  RO: /^RO[0-9]{2,10}$/i,
  BG: /^BG[0-9]{9,10}$/i,
  GR: /^EL[0-9]{9}$/i,
  PT: /^PT[0-9]{9}$/i,
  SE: /^SE[0-9]{12}$/i,
  DK: /^DK[0-9]{8}$/i,
  FI: /^FI[0-9]{8}$/i,
  IE: /^IE[0-9][A-Z0-9][0-9]{5}[A-Z]$/i,
  LU: /^LU[0-9]{8}$/i,
  MT: /^MT[0-9]{8}$/i,
  CY: /^CY[0-9]{8}[A-Z]$/i,
  SI: /^SI[0-9]{8}$/i,
  HR: /^HR[0-9]{11}$/i
};

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

function validRegistrationId(value, countryCode) {
  if (!nonEmpty(value) || !countryCode) return false;
  var re = REGISTRATION_REGEX[countryCode.toUpperCase()];
  if (!re) return value.trim().length >= 4 && value.trim().length <= 25;
  return re.test(value.trim());
}

function validVatId(value, countryCode) {
  if (!value || !value.trim()) return true;
  var re = VAT_REGEX[countryCode.toUpperCase()];
  if (!re) return value.trim().length >= 10 && value.trim().length <= 20;
  return re.test(value.trim().replace(/\s/g, ''));
}

function validPhone(value, countryCode) {
  if (!value || !value.trim()) return true;
  var s = value.trim().replace(/[\s\-\(\)]/g, '');
  return /^\+?[0-9]{6,15}$/.test(s);
}

function getTempEmailDenylist() {
  if (typeof window !== 'undefined' && window.InvioTempEmailDomains) {
    return window.InvioTempEmailDomains;
  }
  return [];
}

function isTempEmailDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  var d = domain.toLowerCase().trim();
  var list = getTempEmailDenylist();
  return list.indexOf(d) !== -1;
}

function validEmailRejectTemp(s) {
  if (!s || !s.trim()) return true;
  if (!validEmail(s)) return false;
  var parts = s.trim().split('@');
  if (parts.length !== 2) return false;
  return !isTempEmailDomain(parts[1]);
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
  if (!nonEmpty(addrS.city)) errors.push('Seller city is required');
  if (!nonEmpty(addrS.countryCode)) errors.push('Seller country (BT-40) is required');

  // Buyer BT-44, BG-8, BT-55
  if (!nonEmpty(buyer.name)) errors.push('Buyer name (BT-44) is required');
  if (!nonEmpty(addrB.city)) errors.push('Buyer city is required');
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

  // Optional but format checks (reject temp email domains)
  if (seller.contact && seller.contact.email) {
    if (!validEmail(seller.contact.email)) errors.push('Seller email must be a valid email address');
    else if (!validEmailRejectTemp(seller.contact.email)) errors.push('Seller email must not use a temporary email domain');
  }
  if (buyer.contact && buyer.contact.email) {
    if (!validEmail(buyer.contact.email)) errors.push('Buyer email must be a valid email address');
    else if (!validEmailRejectTemp(buyer.contact.email)) errors.push('Buyer email must not use a temporary email domain');
  }

  // Payment: if credit transfer (30), at least one valid IBAN required
  const meansCode = payment.meansTypeCode || '';
  if (meansCode === '30') {
    var accounts = payment.accounts || [];
    if (accounts.length) {
      accounts.forEach(function (acc, i) {
        if (nonEmpty(acc.accountId) && !validIban(acc.accountId)) {
          errors.push('IBAN (BT-84) #' + (i + 1) + ' must be a valid IBAN');
        }
      });
      if (accounts.every(function (acc) { return !nonEmpty(acc.accountId); })) {
        errors.push('At least one bank account (IBAN) is required for credit transfer');
      }
    } else if (nonEmpty(payment.accountId) && !validIban(payment.accountId)) {
      errors.push('IBAN (BT-84) must be a valid IBAN when payment is by credit transfer');
    } else if (!nonEmpty(payment.accountId)) {
      errors.push('At least one bank account (IBAN) is required for credit transfer');
    }
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
    validEmailRejectTemp,
    validIban,
    validVatCategory,
    validUnitCode,
    validRegistrationId,
    validVatId,
    validPhone,
    isTempEmailDomain,
    VAT_CATEGORY_CODES,
    UNIT_CODES
  };
}
