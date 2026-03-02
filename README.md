# Invoice App

PEPPOL BIS Billing 3.0 compliant invoice generator built with Jekyll and vanilla JavaScript.

## Features

- ✅ EN 16931-1 / PEPPOL BIS Billing 3.0 compliant
- ✅ UBL 2.1 XML export
- ✅ Full validation with mandatory field checks
- ✅ Accurate VAT calculation and rounding
- ✅ Static site - works on GitHub Pages

## Architecture

### Core Modules

- **state.js** - Application state and invoice schema management
- **calc.js** - Calculation engine (BR-CO-10 to BR-CO-17 compliant)
- **validation.js** - EN 16931-1 mandatory field validation
- **xml.js** - UBL 2.1 XML generation and export
- **app.js** - Main application controller

### Tech Stack

- Jekyll 4.3+ for static site generation
- Vanilla JavaScript (ES6)
- No external dependencies
- GitHub Pages compatible

## Development

### Local Setup

1. Install Ruby and Bundler
2. Install dependencies:
   ```bash
   bundle install
   ```

3. Run Jekyll server:
   ```bash
   bundle exec jekyll serve
   ```

4. Open http://localhost:4000/ (or http://localhost:4000/invoice-app/ if using baseurl)

### Translation Workflow

Translations are static JSON files in **`public/locales/`** (e.g. `en.json`, `es.json`). The app loads the appropriate file via Alpine.js based on `navigator.language` or the URL path (e.g. `/es/` for Spanish).

**Using Google Sheets as the source of truth:**

1. **Master in Sheets:** Keep a sheet with columns **key**, **English**, **Spanish** (add more columns for more languages).
2. **Export from sheet:** Download the sheet as CSV.
3. **CSV → JSON:** Use a free online converter or a script to turn the CSV into nested JSON that matches the structure of `public/locales/en.json`.
4. **Overwrite:** Place the generated `en.json` and `es.json` (and others) into `public/locales/`.

**To create or refresh the sheet from the repo:**

```bash
ruby scripts/export_locales_for_sheet.rb > translations.csv
```

Import `translations.csv` into Google Sheets. You get columns **key**, **English**, **Spanish**. Translate the target column(s), then export the sheet as CSV and convert back to JSON to update `public/locales/`.

### File Structure

```
invoice-app/
├── _config.yml           # Jekyll configuration
├── index.html            # Main page
├── public/
│   └── locales/          # Static translation JSON (en.json, es.json)
├── assets/
│   ├── css/
│   │   └── app.css      # Application styles
│   └── js/
│       ├── state.js     # State management
│       ├── calc.js      # Calculations
│       ├── validation.js # Validation
│       ├── xml.js       # XML export
│       └── app.js       # Main app
├── scripts/
│   └── export_locales_for_sheet.rb  # CSV for Google Sheets import
└── README.md
```

## GitHub Pages Deployment

The site is configured to work with GitHub Pages:

- Production site: **https://invossa.app/**
- For local Jekyll, `baseurl` in `_config.yml` may be `""` (custom domain) or `"/invoice-app"` (repo subpath)
- No build errors or console warnings

### Deploy

1. Push to GitHub
2. Enable GitHub Pages and set custom domain to `invossa.app` if applicable
3. Site will be available at: **https://invossa.app/**

## Compliance

This application generates invoices compliant with:

- **EN 16931-1** - European standard for electronic invoicing
- **PEPPOL BIS Billing 3.0** - Pan-European Public Procurement Online
- **UBL 2.1** - Universal Business Language

### Validation Rules

- Invoice number, date, type, currency (mandatory)
- Seller/Buyer name, city, country (mandatory)
- At least one invoice line with item name, quantity, price
- VAT category and rate validation
- IBAN validation for credit transfer payments

### Calculation Rules

- Line net amounts rounded to currency precision
- VAT calculated per category/rate bucket
- Document-level allowances/charges allocated proportionally
- All amounts rounded to 2 decimal places (BR-CO-10 to BR-CO-17)

## License

MIT
