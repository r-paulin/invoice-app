#!/usr/bin/env node
/**
 * Sync data-i18n and data-i18n-placeholder from lv/index.html to all other locale index.html files.
 * Copies lv/index.html content and replaces (LV) with (XX), lang="lv" with lang="xx", invio-locale content="lv" with content="xx".
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'lv', 'index.html');
const LOCALES = ['bg', 'hr', 'cs', 'da', 'nl', 'es', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv', 'uk'];

let content = fs.readFileSync(SOURCE, 'utf8');

const upper = (c) => c.toUpperCase();
LOCALES.forEach((code) => {
  const target = path.join(ROOT, code, 'index.html');
  const U = code.length === 2 ? code.toUpperCase() : code.slice(0, 2).toUpperCase();
  let out = content
    .replace(/Invossa \(LV\)/g, `Invossa (${U})`)
    .replace(/<html lang="lv">/g, `<html lang="${code}">`)
    .replace(/<meta name="invio-locale" content="lv">/g, `<meta name="invio-locale" content="${code}">`);
  fs.writeFileSync(target, out, 'utf8');
  console.log('Synced', code);
});

console.log('Done.');
