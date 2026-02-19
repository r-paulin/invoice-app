/**
 * Invio — application state and InvoiceDraft schema
 * EN 16931-1 / PEPPOL BIS Billing 3.0 aligned
 */

const INVIO_SPECIFICATION_ID = 'urn:cen.eu:en16931:2017';

/**
 * Default header (BT-1, BT-2, BT-3, BT-5, BT-24, etc.)
 */
function defaultHeader() {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + 7);
  return {
    invoiceNumber: '',
    issueDate: today,
    typeCode: '380',
    currencyCode: 'EUR',
    specificationId: INVIO_SPECIFICATION_ID,
    dueDate: due.toISOString().slice(0, 10),
    buyerReference: null,
    note: null
  };
}

/**
 * Default address block (seller BG-5 or buyer BG-8)
 */
function defaultAddress() {
  return {
    line1: '',
    line2: null,
    city: null,
    postalCode: null,
    countrySubdivision: null,
    countryCode: ''
  };
}

/**
 * Default contact (BG-6 / BG-9)
 */
function defaultContact() {
  return {
    contactName: null,
    phone: null,
    email: null
  };
}

/**
 * Default seller (BG-4)
 */
function defaultSeller() {
  return {
    name: '',
    tradeName: null,
    id: null,
    legalRegistrationId: null,
    vatId: null,
    address: defaultAddress(),
    contact: defaultContact(),
    electronicAddress: null
  };
}

/**
 * Default buyer (BG-7)
 */
function defaultBuyer() {
  return {
    name: '',
    tradeName: null,
    id: null,
    legalRegistrationId: null,
    vatId: null,
    address: defaultAddress(),
    contact: defaultContact(),
    electronicAddress: null
  };
}

/**
 * Default payment (BT-81, BT-84, bank name)
 */
function defaultPayment() {
  return {
    meansTypeCode: '30',
    bankName: null,
    accountId: null,
    bic: null,
    paymentId: null
  };
}

/**
 * Single document-level allowance (BG-20). amount or (baseAmount + percent) for discount.
 */
function defaultDocumentAllowance() {
  return {
    amount: 0,
    baseAmount: null,
    percent: null,
    reasonCode: null,
    reason: null,
    vatCategoryCode: 'S',
    vatRate: 21
  };
}

/**
 * Single invoice line (BG-25). id, quantity, unitCode, itemName, netPrice, vatCategoryCode, vatRate required.
 */
function defaultLine(id = 1) {
  return {
    id: String(id),
    quantity: 1,
    unitCode: 'C62',
    itemName: '',
    itemDescription: null,
    netPrice: 0,
    vatCategoryCode: 'S',
    vatRate: 21,
    lineAllowances: [],
    lineCharges: []
  };
}

/**
 * Full InvoiceDraft default (no computed totals; those come from calc.js)
 */
function createDefaultDraft() {
  return {
    header: defaultHeader(),
    seller: defaultSeller(),
    buyer: defaultBuyer(),
    payee: null,
    payment: defaultPayment(),
    documentAllowances: [],
    documentCharges: [],
    lines: [defaultLine(1)]
  };
}

/**
 * Deep clone draft for immutability where needed
 */
function cloneDraft(draft) {
  return JSON.parse(JSON.stringify(draft));
}

/**
 * Add a new empty line with next id
 */
function addLine(draft) {
  const ids = draft.lines.map(l => parseInt(l.id, 10)).filter(n => !isNaN(n));
  const nextId = ids.length ? Math.max(...ids) + 1 : 1;
  return {
    ...draft,
    lines: [...draft.lines, defaultLine(nextId)]
  };
}

/**
 * Remove line at index (must leave at least one line for compliance)
 */
function removeLine(draft, index) {
  if (draft.lines.length <= 1) return draft;
  const lines = draft.lines.filter((_, i) => i !== index);
  return { ...draft, lines };
}

/**
 * Update line at index (partial update)
 */
function updateLine(draft, index, updates) {
  const lines = draft.lines.slice();
  lines[index] = { ...lines[index], ...updates };
  return { ...draft, lines };
}

// Export for use in UI and other modules
if (typeof window !== 'undefined') {
  window.InvioState = {
    createDefaultDraft,
    cloneDraft,
    addLine,
    removeLine,
    updateLine,
    defaultHeader,
    defaultLine,
    INVIO_SPECIFICATION_ID
  };
}
