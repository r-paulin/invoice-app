/**
 * EU 27 countries for seller/buyer address. name is English; flag is Unicode regional indicators (e.g. LV -> U+1F1F1 U+1F1FB).
 */
const EU_COUNTRY_FLAGS = {
  AT: '\uD83C\uDDE6\uD83C\uDDF9', BE: '\uD83C\uDDE7\uD83C\uDDEA', BG: '\uD83C\uDDE7\uD83C\uDDEC',
  HR: '\uD83C\uDDED\uD83C\uDDF7', CY: '\uD83C\uDDE8\uD83C\uDDFE', CZ: '\uD83C\uDDE8\uD83C\uDDFF',
  DK: '\uD83C\uDDE9\uD83C\uDDF0', EE: '\uD83C\uDDEA\uD83C\uDDEA', FI: '\uD83C\uDDEB\uD83C\uDDEE',
  FR: '\uD83C\uDDEB\uD83C\uDDF7', DE: '\uD83C\uDDE9\uD83C\uDDEA', GR: '\uD83C\uDDEC\uD83C\uDDF7',
  HU: '\uD83C\uDDED\uD83C\uDDFA', IE: '\uD83C\uDDEE\uD83C\uDDEA', IT: '\uD83C\uDDEE\uD83C\uDDF9',
  LV: '\uD83C\uDDF1\uD83C\uDDFB', LT: '\uD83C\uDDF1\uD83C\uDDF9', LU: '\uD83C\uDDF1\uD83C\uDDFA',
  MT: '\uD83C\uDDF2\uD83C\uDDF9', NL: '\uD83C\uDDF3\uD83C\uDDF1', PL: '\uD83C\uDDF5\uD83C\uDDF1',
  PT: '\uD83C\uDDF5\uD83C\uDDF9', RO: '\uD83C\uDDF7\uD83C\uDDF4', SK: '\uD83C\uDDF8\uD83C\uDDF0',
  SI: '\uD83C\uDDF8\uD83C\uDDEE', ES: '\uD83C\uDDEA\uD83C\uDDF8', SE: '\uD83C\uDDF8\uD83C\uDDEA'
};

const EU_COUNTRIES = [
  { code: 'AT', name: 'Austria' }, { code: 'BE', name: 'Belgium' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' }, { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' }, { code: 'EE', name: 'Estonia' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' }, { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' }, { code: 'IE', name: 'Ireland' }, { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' }, { code: 'NL', name: 'Netherlands' }, { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' }, { code: 'RO', name: 'Romania' }, { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' }, { code: 'ES', name: 'Spain' }, { code: 'SE', name: 'Sweden' }
];

function getEuCountries() {
  return EU_COUNTRIES.map(function (c) {
    return { code: c.code, name: c.name, flag: EU_COUNTRY_FLAGS[c.code] || '' };
  });
}

if (typeof window !== 'undefined') {
  window.InvioEuCountries = { getEuCountries, EU_COUNTRIES, EU_COUNTRY_FLAGS };
}
