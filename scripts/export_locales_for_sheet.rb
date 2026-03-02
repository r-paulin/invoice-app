#!/usr/bin/env ruby
# frozen_string_literal: true

# Exports public/locales/*.json to CSV with columns: key, English, Spanish (and optional columns).
# Use the output to import into Google Sheets for translation. After editing, export the sheet as
# CSV and convert to JSON (e.g. online tool) to overwrite public/locales/en.json and es.json.

require "csv"
require "json"

LOCALES_DIR = File.expand_path("../public/locales", __dir__)
COLUMNS = ["key", "English", "Spanish"].freeze

def dig_dot(data, dot_key)
  dot_key.split(".").reduce(data) { |h, p| h.is_a?(Hash) ? h[p] : nil }
end

def nested_to_flat(hash, prefix = "")
  result = {}
  hash.each do |key, value|
    dot_key = prefix == "" ? key : "#{prefix}.#{key}"
    if value.is_a?(Hash)
      result.merge!(nested_to_flat(value, dot_key))
    else
      result[dot_key] = value
    end
  end
  result
end

en_path = File.join(LOCALES_DIR, "en.json")
abort "Missing #{en_path}" unless File.exist?(en_path)

en_json = JSON.parse(File.read(en_path))
keys = nested_to_flat(en_json).keys.sort

# Map column name to locale file key
col_to_locale = { "English" => "en", "Spanish" => "es" }

rows = keys.map do |dot_key|
  row = { "key" => dot_key }
  col_to_locale.each do |col_name, locale|
    path = File.join(LOCALES_DIR, "#{locale}.json")
    data = File.exist?(path) ? JSON.parse(File.read(path)) : en_json
    val = dig_dot(data, dot_key)
    row[col_name] = val.is_a?(String) ? val : (dig_dot(en_json, dot_key) || "")
  end
  row
end

csv_out = CSV.generate do |csv|
  csv << COLUMNS
  rows.each { |row| csv << COLUMNS.map { |c| (row[c] || "").to_s } }
end

puts csv_out
