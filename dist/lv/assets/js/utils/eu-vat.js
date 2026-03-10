/**
 * Invio — EU VAT scenario detection and VAT ID format hints
 * No Alpine or DOM; pure functions for use by store, validation, and XML.
 */

(function () {
  'use strict';

  /** EU member state ISO2 codes (27 members + XI for Northern Ireland). Export only when buyer is NOT in this list. */
  var EU_COUNTRY_CODES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'EL',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE', 'XI'
  ];

  /** ISO 3166-1 alpha-3 to ISO2 for EU states (defensive: if data ever uses SVK/LVA etc., still treat as EU). */
  var EU_ISO3_TO_ISO2 = {
    AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ',
    DNK: 'DK', EST: 'EE', FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'EL',
    HUN: 'HU', IRL: 'IE', ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU',
    MLT: 'MT', NLD: 'NL', POL: 'PL', PRT: 'PT', ROU: 'RO', SVK: 'SK',
    SVN: 'SI', ESP: 'ES', SWE: 'SE'
  };

  function normalizeCountryCode(code) {
    var c = (code || '').trim().toUpperCase();
    if (!c) return '';
    if (c.length === 3 && EU_ISO3_TO_ISO2[c]) return EU_ISO3_TO_ISO2[c];
    return c.length === 2 ? c : c;
  }

  function isEuCountry(code) {
    var c = normalizeCountryCode(code);
    return c.length === 2 && EU_COUNTRY_CODES.indexOf(c) !== -1;
  }

  /**
   * Treat buyer as EU for scenario when GB with XI VAT ID (Northern Ireland).
   */
  function buyerCountryForScenario(buyerCountry, buyerVatId) {
    var cc = (buyerCountry || '').trim().toUpperCase();
    var vat = (buyerVatId || '').trim().toUpperCase();
    if (cc === 'GB' && vat.indexOf('XI') === 0) return 'XI';
    return cc;
  }

  /**
   * Returns true when buyer is GB and VAT ID starts with XI (Windsor Framework).
   */
  function isNorthernIreland(buyerCountry, buyerVatId) {
    var cc = (buyerCountry || '').trim().toUpperCase();
    var vat = (buyerVatId || '').trim().toUpperCase();
    return cc === 'GB' && vat.length >= 2 && vat.indexOf('XI') === 0;
  }

  /**
   * VAT scenario from seller/buyer country and VAT IDs. Evaluate in order; first match wins.
   * @returns {'no_vat_seller'|'domestic'|'intra_eu_rc'|'intra_eu_b2c'|'export'}
   */
  function getVatScenario(sellerVatId, sellerCountry, buyerCountry, buyerVatId) {
    var sVat = (sellerVatId || '').trim();
    var sCc = normalizeCountryCode(sellerCountry);
    var bCc = normalizeCountryCode(buyerCountry);
    var bVat = (buyerVatId || '').trim();
    var buyerEuCc = buyerCountryForScenario(bCc, bVat);

    if (!sVat) return 'no_vat_seller';

    var sellerEu = isEuCountry(sCc);
    var buyerEu = isEuCountry(buyerEuCc);

    if (sellerEu && buyerEu && sCc === buyerEuCc) return 'domestic';
    if (sellerEu && buyerEu && sCc !== buyerEuCc && bVat) return 'intra_eu_rc';
    if (sellerEu && buyerEu && sCc !== buyerEuCc && !bVat) return 'intra_eu_b2c';
    if (!buyerEu) return 'export';

    return 'domestic';
  }

  /** VAT ID format patterns for hint only (non-blocking). Spec: DE, FR, NL, PL, EE, SE; fallback. */
  var VAT_FORMAT_HINT = {
    DE: /^DE[0-9]{9}$/i,
    FR: /^FR[A-Z0-9]{2}[0-9]{9}$/i,
    NL: /^NL[0-9]{9}B[0-9]{2}$/i,
    PL: /^PL[0-9]{10}$/i,
    EE: /^EE[0-9]{9}$/i,
    SE: /^SE[0-9]{10}01$|^SE[0-9]{12}$/i,
    EL: /^EL[0-9]{9}$/i,
    GR: /^EL[0-9]{9}$/i
  };
  var FALLBACK_VAT = /^[A-Z]{2}[A-Z0-9]{2,12}$/i;

  /**
   * Returns a short warning message if buyer VAT ID does not match country/format; otherwise null.
   */
  function vatIdFormatWarning(buyerVatId, buyerCountry) {
    var vat = (buyerVatId || '').trim();
    var cc = normalizeCountryCode(buyerCountry);
    if (!vat || !cc || cc.length !== 2) return null;
    var prefix = vat.substring(0, 2).toUpperCase();
    var prefixOk = prefix === cc || (cc === 'GR' && prefix === 'EL') || (cc === 'EL' && prefix === 'EL') || (cc === 'GB' && (prefix === 'XI' || prefix === 'GB'));
    if (!prefixOk) {
      return 'VAT ID format doesn\'t match the selected country. Check the prefix and number length.';
    }
    var re = VAT_FORMAT_HINT[cc] || (cc.length === 2 ? new RegExp('^' + cc + '[A-Z0-9]{2,12}$', 'i') : FALLBACK_VAT);
    if (!re.test(vat)) {
      return 'VAT ID format doesn\'t match the selected country. Check the prefix and number length.';
    }
    return null;
  }

  function scenarioLocksVatRates(scenario) {
    return scenario === 'no_vat_seller' || scenario === 'intra_eu_rc' || scenario === 'export';
  }

  function getVatScenarioFromDraft(draft) {
    if (!draft || typeof draft !== 'object') return 'domestic';
    var seller = draft.seller || {};
    var buyer = draft.buyer || {};
    var addrS = seller.address || {};
    var addrB = buyer.address || {};
    return getVatScenario(
      seller.vatId,
      addrS.countryCode,
      addrB.countryCode,
      buyer.vatId
    );
  }

  if (typeof window !== 'undefined') {
    window.Invio = window.Invio || {};
    window.Invio.euVat = {
      EU_COUNTRY_CODES: EU_COUNTRY_CODES,
      normalizeCountryCode: normalizeCountryCode,
      isEuCountry: isEuCountry,
      buyerCountryForScenario: buyerCountryForScenario,
      isNorthernIreland: isNorthernIreland,
      getVatScenario: getVatScenario,
      getVatScenarioFromDraft: getVatScenarioFromDraft,
      vatIdFormatWarning: vatIdFormatWarning,
      scenarioLocksVatRates: scenarioLocksVatRates
    };
  }
})();
