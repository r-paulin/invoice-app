/**
 * Invio — calculation engine (pure functions)
 * BR-CO-10 to BR-CO-17; single source of truth for XML and PDF
 */

const CURRENCY_DECIMALS = { EUR: 2, USD: 2, GBP: 2 };

function currencyDecimals(currencyCode) {
  return CURRENCY_DECIMALS[currencyCode] ?? 2;
}

function roundAmount(amount, decimals) {
  const d = Math.pow(10, decimals);
  return Math.round(amount * d) / d;
}

/**
 * Line subtotal (qty * netPrice) before discount, rounded to currency precision
 */
function lineSubtotal(line, currencyCode) {
  const q = Number(line.quantity);
  const p = Number(line.netPrice);
  const dec = currencyDecimals(currencyCode);
  return roundAmount(q * p, dec);
}

/**
 * Line discount amount (fixed amount), clamped between 0 and subtotal
 */
function lineDiscountAmount(line, currencyCode) {
  const amt = Math.max(0, Number(line.discountAmount) || 0);
  if (amt === 0) return 0;
  const sub = lineSubtotal(line, currencyCode);
  const dec = currencyDecimals(currencyCode);
  return roundAmount(Math.min(amt, sub), dec);
}

/**
 * Line net amount (BT-131): subtotal minus discount, rounded to currency precision
 */
function lineNet(line, currencyCode) {
  const sub = lineSubtotal(line, currencyCode);
  const disc = lineDiscountAmount(line, currencyCode);
  const dec = currencyDecimals(currencyCode);
  return roundAmount(sub - disc, dec);
}

/**
 * Line VAT amount: lineNet * vatRate / 100, rounded to currency precision
 */
function lineTaxAmount(line, currencyCode) {
  const net = lineNet(line, currencyCode);
  const rate = Number(line.vatRate) || 0;
  const dec = currencyDecimals(currencyCode);
  return roundAmount(net * rate / 100, dec);
}

/**
 * Line total including tax: lineNet + lineTaxAmount
 */
function lineTotal(line, currencyCode) {
  const net = lineNet(line, currencyCode);
  const tax = lineTaxAmount(line, currencyCode);
  const dec = currencyDecimals(currencyCode);
  return roundAmount(net + tax, dec);
}

/**
 * BT-106: Sum of invoice line net amounts
 */
function sumLineNets(lines, currencyCode) {
  return lines.reduce((sum, line) => sum + lineNet(line, currencyCode), 0);
}

/**
 * Document allowance total (BT-107) and charge total (BT-108)
 */
function documentAllowanceChargeTotals(draft, currencyCode) {
  const dec = currencyDecimals(currencyCode);
  const allowance = (draft.documentAllowances || []).reduce(
    (s, a) => s + roundAmount(Number(a.amount) || 0, dec),
    0
  );
  const charge = (draft.documentCharges || []).reduce(
    (s, c) => s + roundAmount(Number(c.amount) || 0, dec),
    0
  );
  return { allowanceSum: roundAmount(allowance, dec), chargeSum: roundAmount(charge, dec) };
}

/**
 * BT-109: Tax exclusive amount = lineNetSum - allowanceSum + chargeSum
 */
function taxExclusiveAmount(draft, currencyCode) {
  const lineNetSum = sumLineNets(draft.lines || [], currencyCode);
  const { allowanceSum, chargeSum } = documentAllowanceChargeTotals(draft, currencyCode);
  const dec = currencyDecimals(currencyCode);
  return roundAmount(lineNetSum - allowanceSum + chargeSum, dec);
}

/**
 * Allocate document-level allowance/charge to VAT buckets by proportion of line nets per (categoryCode, rate)
 */
function allocateDocumentToVatBuckets(draft, currencyCode) {
  const lines = draft.lines || [];
  const dec = currencyDecimals(currencyCode);
  const lineNetSum = sumLineNets(lines, currencyCode);
  const { allowanceSum, chargeSum } = documentAllowanceChargeTotals(draft, currencyCode);
  const netAfterDoc = lineNetSum - allowanceSum + chargeSum;
  if (netAfterDoc <= 0) return [];

  const bucketKeys = {};
  lines.forEach(line => {
    const key = `${line.vatCategoryCode || 'S'}|${Number(line.vatRate) || 0}`;
    if (!bucketKeys[key]) bucketKeys[key] = { categoryCode: line.vatCategoryCode || 'S', rate: Number(line.vatRate) || 0, lineTotal: 0 };
    bucketKeys[key].lineTotal += lineNet(line, currencyCode);
  });
  const buckets = Object.values(bucketKeys);
  const totalLineNet = buckets.reduce((s, b) => s + b.lineTotal, 0);
  if (totalLineNet <= 0) return buckets.map(b => ({ ...b, taxableAmount: 0, taxAmount: 0 }));

  const docDelta = -allowanceSum + chargeSum;
  const results = buckets.map(b => {
    const share = b.lineTotal / totalLineNet;
    const taxableAmount = roundAmount(b.lineTotal + docDelta * share, dec);
    const taxAmount = roundAmount((taxableAmount * b.rate) / 100, 2);
    return {
      categoryCode: b.categoryCode,
      rate: b.rate,
      taxableAmount,
      taxAmount
    };
  });
  return results;
}

/**
 * BT-110: Total VAT = sum of VAT per category; BT-116, BT-117, BT-118, BT-119 per BG-23
 */
function vatBreakdown(draft, currencyCode) {
  return allocateDocumentToVatBuckets(draft, currencyCode);
}

/**
 * BT-110: Invoice total VAT
 */
function totalVat(draft, currencyCode) {
  const breakdown = vatBreakdown(draft, currencyCode);
  return roundAmount(
    breakdown.reduce((s, b) => s + b.taxAmount, 0),
    2
  );
}

/**
 * BT-112: Tax inclusive amount = BT-109 + BT-110
 */
function taxInclusiveAmount(draft, currencyCode) {
  const dec = currencyDecimals(currencyCode);
  const taxExcl = taxExclusiveAmount(draft, currencyCode);
  const vat = totalVat(draft, currencyCode);
  return roundAmount(taxExcl + vat, dec);
}

/**
 * BT-113: Prepaid (optional)
 */
function prepaidAmount(draft, currencyCode) {
  const dec = currencyDecimals(currencyCode);
  return roundAmount(Number(draft.header?.prepaidAmount) || 0, dec);
}

/**
 * BT-115: Payable = BT-112 - BT-113 + BT-114 (rounding)
 */
function payableAmount(draft, currencyCode) {
  const dec = currencyDecimals(currencyCode);
  const incl = taxInclusiveAmount(draft, currencyCode);
  const prepaid = prepaidAmount(draft, currencyCode);
  const rounding = roundAmount(Number(draft.header?.roundingAmount) || 0, dec);
  return roundAmount(incl - prepaid + rounding, dec);
}

/**
 * Single computed result for export (XML + PDF). All amounts in invoice currency.
 */
function computeTotals(draft) {
  const cc = (draft.header && draft.header.currencyCode) || 'EUR';
  const lineNetSum = sumLineNets(draft.lines || [], cc);
  const { allowanceSum, chargeSum } = documentAllowanceChargeTotals(draft, cc);
  const taxExclusive = taxExclusiveAmount(draft, cc);
  const vatTotal = totalVat(draft, cc);
  const taxInclusive = taxInclusiveAmount(draft, cc);
  const prepaid = prepaidAmount(draft, cc);
  const rounding = roundAmount(Number(draft.header?.roundingAmount) || 0, currencyDecimals(cc));
  const payable = payableAmount(draft, cc);
  const vatBreakdownList = vatBreakdown(draft, cc);

  return {
    currencyCode: cc,
    lineNetSum,
    allowanceSum,
    chargeSum,
    taxExclusive,
    totalVat: vatTotal,
    taxInclusive,
    prepaidAmount: prepaid,
    roundingAmount: rounding,
    payable,
    vatBreakdown: vatBreakdownList,
    lineNets: (draft.lines || []).map(l => ({ id: l.id, lineNet: lineNet(l, cc) }))
  };
}

/**
 * Internal consistency: BR-CO-10, BR-CO-13, BR-CO-14, BR-CO-15, BR-CO-16
 */
function checkReconciliation(draft) {
  const t = computeTotals(draft);
  const cc = t.currencyCode;
  const dec = currencyDecimals(cc);

  const lineNetSumCheck = roundAmount(
    t.lineNets.reduce((s, x) => s + x.lineNet, 0),
    dec
  );
  const bt106Ok = Math.abs(lineNetSumCheck - t.lineNetSum) < 1e-6;

  const bt109Ok = Math.abs(t.taxExclusive - (t.lineNetSum - t.allowanceSum + t.chargeSum)) < 1e-6;

  const vatSum = roundAmount(
    t.vatBreakdown.reduce((s, b) => s + b.taxAmount, 0),
    2
  );
  const bt110Ok = Math.abs(vatSum - t.totalVat) < 1e-6;

  const bt112Ok = Math.abs(t.taxInclusive - (t.taxExclusive + t.totalVat)) < 1e-6;

  const bt115Ok = Math.abs(t.payable - (t.taxInclusive - t.prepaidAmount + t.roundingAmount)) < 1e-6;

  return {
    ok: bt106Ok && bt109Ok && bt110Ok && bt112Ok && bt115Ok,
    bt106Ok,
    bt109Ok,
    bt110Ok,
    bt112Ok,
    bt115Ok
  };
}

if (typeof window !== 'undefined') {
  window.InvioCalc = {
    currencyDecimals,
    roundAmount,
    lineSubtotal,
    lineDiscountAmount,
    lineNet,
    lineTaxAmount,
    lineTotal,
    sumLineNets,
    taxExclusiveAmount,
    vatBreakdown,
    totalVat,
    taxInclusiveAmount,
    payableAmount,
    computeTotals,
    checkReconciliation
  };
}
