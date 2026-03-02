/**
 * Best-effort bank name from IBAN (ISO 13616-1). MVP: map country code to generic label or known prefixes.
 * Can be extended with real BIC/prefix data.
 */
var IBAN_BANK_MAP = {
  LV: 'Latvian bank',
  LT: 'Lithuanian bank',
  EE: 'Estonian bank',
  DE: 'German bank',
  AT: 'Austrian bank',
  NL: 'Dutch bank',
  BE: 'Belgian bank',
  FR: 'French bank',
  ES: 'Spanish bank',
  IT: 'Italian bank',
  PL: 'Polish bank',
  CZ: 'Czech bank',
  SK: 'Slovak bank',
  HU: 'Hungarian bank',
  RO: 'Romanian bank',
  BG: 'Bulgarian bank',
  GR: 'Greek bank',
  PT: 'Portuguese bank',
  SE: 'Swedish bank',
  DK: 'Danish bank',
  FI: 'Finnish bank',
  IE: 'Irish bank',
  GB: 'UK bank',
  LU: 'Luxembourg bank',
  MT: 'Maltese bank',
  CY: 'Cypriot bank',
  SI: 'Slovenian bank',
  HR: 'Croatian bank'
};

function getBankNameFromIban(iban) {
  if (!iban || typeof iban !== 'string') return null;
  var normalized = iban.replace(/\s/g, '').toUpperCase();
  var countryCode = normalized.slice(0, 2);
  return IBAN_BANK_MAP[countryCode] || (countryCode ? countryCode + ' bank' : null);
}

if (typeof window !== 'undefined') {
  window.InvioIbanBank = { getBankNameFromIban, IBAN_BANK_MAP };
}
