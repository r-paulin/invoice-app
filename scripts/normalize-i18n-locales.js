#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'assets', 'i18n');
const localesPath = path.join(I18N_DIR, 'locales.json');
const enPath = path.join(I18N_DIR, 'en.json');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepFillMissing(target, source) {
  if (!isObject(source)) return target;
  var output = isObject(target) ? target : {};
  Object.keys(source).forEach(function (key) {
    var sourceValue = source[key];
    var targetValue = output[key];
    if (isObject(sourceValue)) {
      output[key] = deepFillMissing(isObject(targetValue) ? targetValue : {}, sourceValue);
      return;
    }
    if (targetValue === undefined || targetValue === null || targetValue === '') {
      output[key] = sourceValue;
    }
  });
  return output;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

var localesConfig = readJson(localesPath);
var supported = Array.isArray(localesConfig.supported) ? localesConfig.supported : [];
var en = readJson(enPath);

supported.forEach(function (locale) {
  var localePath = path.join(I18N_DIR, locale + '.json');
  if (!fs.existsSync(localePath)) return;
  var data = readJson(localePath);
  var normalized = deepFillMissing(data, en);
  writeJson(localePath, normalized);
  console.log('Normalized', locale);
});

console.log('Done.');
