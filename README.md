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

4. Open http://localhost:4000/invoice-app/

### File Structure

```
invoice-app/
├── _config.yml           # Jekyll configuration
├── index.html            # Main page
├── assets/
│   ├── css/
│   │   └── app.css      # Application styles
│   └── js/
│       ├── state.js     # State management
│       ├── calc.js      # Calculations
│       ├── validation.js # Validation
│       ├── xml.js       # XML export
│       └── app.js       # Main app
└── README.md
```

## GitHub Pages Deployment

The site is configured to work with GitHub Pages:

- `baseurl: "/invoice-app"` is set in `_config.yml`
- All assets use `{{ site.baseurl }}` for proper path resolution
- No build errors or console warnings

### Deploy

1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Select branch: `main`
4. Site will be available at: `https://[username].github.io/invoice-app/`

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
