# Invio

PEPPOL BIS Billing 3.0 / EN 16931-1 compliant invoice generator. Browser-only: create invoice data, generate UBL 2.1 XML and PDF, download both.

## Tech stack

- Static site: Jekyll (GitHub Pages compatible)
- UI: Alpine.js, vanilla CSS
- Storage: IndexedDB (primary), localStorage (fallback)
- XML: native DOM + `createElementNS` (no xmlbuilder)
- PDF: pdf-lib

## Run locally

1. Install Ruby and Bundler, then:
   ```bash
   bundle install
   bundle exec jekyll serve
   ```
   Or use any static server that serves the repo root (e.g. `npx serve .`). Note: without Jekyll, `{{ site.baseurl }}` in `index.html` will not be replaced; for local dev you can run Jekyll or replace baseurl manually in the HTML.

2. Open `http://localhost:4000` (or the URL your server prints). With default `baseurl: "/invoice-app"` use `http://localhost:4000/invoice-app/`.

**GitHub Pages:** Set `baseurl` in `_config.yml` to your repo path (e.g. `"/invoice-app"`) so asset and script URLs resolve correctly.

**Optional security:** CDN scripts use `crossorigin="anonymous"`. To add [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) integrity hashes, generate them (e.g. `openssl dgst -sha384 -binary < script.js | openssl base64 -A`) and add `integrity="sha384-..."` to each script tag.

## Usage

1. Fill **New Invoice** (number, dates, currency, type, reference, note).
2. Add **Invoice Items** (description, qty, unit, price, VAT category + rate).
3. Fill **Seller** and **Buyer** (name, address, country, VAT, etc.).
4. Fill **Payment** (type, bank name, IBAN).
5. Check **Invoice Summary** (totals must reconcile).
6. Click **Generate XML & PDF** to validate and download both files.

Export is blocked if validation fails or totals do not reconcile.

## Project structure

- `index.html` — single-page app (Alpine.js)
- `_config.yml` — Jekyll config; set `baseurl` for GitHub Pages subpath
- `assets/css/main.css` — design tokens and layout
- `assets/js/state.js` — InvoiceDraft schema and defaults
- `assets/js/storage.js` — IndexedDB + localStorage
- `assets/js/calc.js` — totals and BR-CO reconciliation
- `assets/js/validation.js` — EN 16931-1 / PEPPOL validation
- `assets/js/xml.js` — UBL 2.1 Invoice XML
- `assets/js/pdf.js` — PDF generation (same totals as XML)
- `assets/js/ui.js` — UI options and helpers
- `assets/i18n/` — locale JSON (e.g. en.json)

## Compliance

Aligned with LVS EN 16931-1+A1+AC:2020 and PEPPOL BIS Billing 3.0. Mandatory BT/BG fields and reconciliation rules (BR-CO-10 to BR-CO-18) are enforced before export.
