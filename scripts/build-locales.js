#!/usr/bin/env node
/**
 * Copy locale JSON from scripts/locales_src/<code>.json to assets/i18n/<code>.json.
 * If a locale has no source file, copy en.json so the structure exists.
 * Keeps en.json and es.json unchanged if no source (en is base; es may be in assets already).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'scripts', 'locales_src');
const OUT_DIR = path.join(ROOT, 'assets', 'i18n');

const LOCALES = ['bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv', 'uk'];

const enPath = path.join(OUT_DIR, 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

LOCALES.forEach((code) => {
  const srcPath = path.join(SRC_DIR, code + '.json');
  const outPath = path.join(OUT_DIR, code + '.json');
  let data;
  if (fs.existsSync(srcPath)) {
    data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  } else {
    data = JSON.parse(JSON.stringify(en));
  }
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Wrote', code);
});

console.log('Done.');
