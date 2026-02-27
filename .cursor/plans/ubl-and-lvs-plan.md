# UBL XML Validation, LVS EN 16931 Cross-Check, and Seller-Buyer Bank Bug

## Overview

1. Fix UBL 2.1 Invoice XML element order so generated XML validates (existing four cvc-complex-type.2.4.a errors).
2. Cross-check the codebase against LVS EN 16931-1+A1+AC:2020 (Latvian adoption of EN 16931-1) so all inputs map correctly to e-invoice (XML) and PDF.
3. Fix bug: seller bank account number and name must not be shown or saved in buyer details; buyer modal must not read or write `draft.payment`.
4. Optional: add European Commission e-invoice validation (link and/or API) before or after generation.

---

## 1. UBL 2.1 XML element order (existing plan)

**File:** [assets/js/xml.js](assets/js/xml.js)

- **Invoice root:** Output all `cbc:Note` before `DocumentCurrencyCode` (after `InvoiceTypeCode`). Remove root-level Note for payment means display; use `cbc:InstructionNote` inside `PaymentMeans` if needed.
- **Party (seller and buyer):** Under `cac:Party`, output in schema order: PartyLegalEntity, PartyTaxScheme, PostalAddress, PartyName.
- **PaymentMeans:** Build in schema order: PayeeFinancialAccount, PaymentID, InstructionNote, PaymentMeansCode (required). Do not add payment text as root Note.

---

## 2. LVS EN 16931-1 cross-check (peer review)

**Reference:** LVS EN 16931-1+A1+AC:2020 (identical to EN 16931-1:2017+A1:2019+AC:2020). Semantic data model in Section 6; business rules in 6.4; supported processes P1–P12; payment = Payee (Maksājuma saņēmējs) = seller by default.

**Inputs vs e-invoice (XML) and PDF:**

| Source / Standard concept | Draft / UI | XML (xml.js) | PDF (pdf.js) |
|--------------------------|------------|--------------|--------------|
| BT-1 Invoice number | `header.invoiceNumber` | `cbc:ID` | "Invoice number" |
| BT-2 Issue date | `header.issueDate` | `cbc:IssueDate` | "Issued date" |
| BT-9 Due date | `header.dueDate` | `cbc:DueDate` | "Due date" |
| BT-3 Type code | `header.typeCode` | `cbc:InvoiceTypeCode` | (implicit) |
| BT-5 Document currency | `header.currencyCode` | `cbc:DocumentCurrencyCode` | (in amounts) |
| BT-24 Buyer reference | `header.buyerReference` | `cbc:BuyerReference` | (optional to add) |
| BG-4 Seller (name, reg, VAT, address, contact) | `draft.seller` | `AccountingSupplierParty` / Party | Seller block (name, address, email, reg, VAT) |
| BG-7 Buyer (name, reg, VAT, address, contact) | `draft.buyer` | `AccountingCustomerParty` / Party | Buyer block (name, address, email, reg, VAT) |
| BT-81 Payment means type | `draft.payment.meansTypeCode` | `cbc:PaymentMeansCode` | (bank details shown only for transfer) |
| BT-84 Payee account (IBAN) | `draft.payment.accountId` / `accounts` | `PayeeFinancialAccount` / `cbc:ID` | "Bank account" under Seller |
| Bank name | `draft.payment.bankName` | `FinancialInstitutionBranch` | "Bank" under Seller |
| BT-20 Payment reference | `draft.payment.paymentId` | `cbc:PaymentID` | "Payment reference" |
| BG-22/23 Totals | `calcInvoice(draft)` | TaxTotal, LegalMonetaryTotal | Table totals |
| BG-25 Invoice lines | `draft.lines` | `InvoiceLine` (ID, quantity, LineExtensionAmount, Item, Price) | Table rows |

**Findings:**

- **Payment (BT-81, BT-84, bank name) is payee/seller only.** The standard does not define “buyer bank account” on the core invoice; the invoice states where the buyer must pay (seller’s account). The app currently uses a single `draft.payment` for this, which is correct. The bug is that the buyer modal wrongly uses the same `draft.payment` for the buyer form, so seller bank data appears under buyer and can overwrite payment on save.
- **State shape:** [assets/js/state.js](assets/js/state.js) already aligns draft to EN 16931 (header BT-1/BT-2/BT-5, seller/buyer/payment, lines). `normalizeDraft` must be extended to support `draft.buyer.bankAccounts` if buyer bank UI is kept for optional/internal use only (see below).
- **PDF:** [assets/js/pdf.js](assets/js/pdf.js) correctly shows payment (accountId, bankName) only under Seller and payment reference once; buyer block has no bank fields. No change needed for PDF once `draft.payment` is no longer overwritten by the buyer modal.
- **Optional:** Add Buyer reference (BT-24) to PDF if not yet displayed; ensure any free-text note (BT-22) is mapped to `cbc:Note` in XML in the correct order (see UBL order fix above).

**Action:** No new EN 16931 data elements required. Ensure all form inputs that feed the draft are used only for the correct party (seller vs buyer) and that payment-related fields are seller-only in persistence and export.

---

## 3. Bug: Seller bank account copied into buyer details

**Cause:** Buyer modal loads bank accounts from `draft.payment` (seller’s payment data) into `buyerBankAccounts` and, on save, writes `buyerBankAccounts` back into `draft.payment`, overwriting the seller’s IBAN and bank name.

**Fix:**

1. **openBuyerModal** ([assets/js/app.js](assets/js/app.js)): Do **not** populate `buyerBankAccounts` from `draft.payment`. Populate from `draft.buyer.bankAccounts` if present (array of `{ accountId, bankName }`), otherwise one empty row `[{ iban: '', bankName: '', ibanError: '', _id: '...' }]`.
2. **saveBuyerForm** ([assets/js/app.js](assets/js/app.js)): Do **not** update `draft.payment` from `buyerBankAccounts`. Update only `draft.buyer` (name, address, contact, etc.) and, if you keep buyer bank UI, set `draft.buyer.bankAccounts` from the current `buyerBankAccounts` (and do not touch `draft.payment.accounts`, `draft.payment.accountId`, or `draft.payment.bankName`).
3. **State:** In [assets/js/state.js](assets/js/state.js), extend `defaultBuyer()` with optional `bankAccounts: []` and in `normalizeDraft` ensure `draft.buyer.bankAccounts` is normalized (e.g. from saved drafts) so it does not affect `draft.payment`. XML and PDF continue to use only `draft.payment` for payee account; they must not use `draft.buyer.bankAccounts`.

**Result:** Seller bank account and name are only in seller/payment; buyer form no longer shows or overwrites them.

---

## 4. European Commission e-invoice validation

- Add a “Validate with European Commission” link (e.g. to https://www.itb.ec.europa.eu/invoice/upload) and short guidance to validate the downloaded XML there.
- If EC REST API is usable from the browser (CORS), optionally add a “Validate before download” step that POSTs the generated XML and shows success/errors before offering the file; otherwise keep link-only.

---

## 5. Verification

- Regenerate an invoice with notes, buyer reference, seller and buyer with addresses and VAT, and payment means 30 with account and payment reference; validate the XML with the same tool until all four cvc-complex-type.2.4.a errors are gone.
- Fill seller bank account and name, open buyer modal: buyer bank section must be empty (or show only previously saved buyer bank data, not seller’s). Save buyer without changing bank: seller’s payment data must remain unchanged in draft and in exported XML/PDF.
- Spot-check that each main input (invoice number, dates, seller/buyer name, address, VAT, payment reference, IBAN, bank name, lines) appears in both XML and PDF in the correct place per the table above and LVS EN 16931-1.

---

## Files to change

- [assets/js/xml.js](assets/js/xml.js): UBL element order (Notes, Party, PaymentMeans).
- [assets/js/app.js](assets/js/app.js): openBuyerModal (load bank from `draft.buyer.bankAccounts`), saveBuyerForm (write bank to `draft.buyer.bankAccounts` only; never `draft.payment`).
- [assets/js/state.js](assets/js/state.js): `defaultBuyer()` add `bankAccounts: []`; `normalizeDraft` normalize `buyer.bankAccounts` without touching payment.
- Optional: UI link to EC validator; optional “Validate before download” if API is usable.
