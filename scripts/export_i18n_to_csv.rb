#!/usr/bin/env ruby
# frozen_string_literal: true

# Flattens assets/i18n/*.json to one CSV with columns: key, bg, hr, cs, ... uk
# Use the output to paste into the Translations Google Sheet.

require "csv"
require "json"

SUPPORTED = %w[bg hr cs da nl en et fi fr de el hu ga it lv lt mt pl pt ro sk sl es sv uk].freeze
I18N_DIR = File.expand_path("../assets/i18n", __dir__)

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

en_path = File.join(I18N_DIR, "en.json")
abort "Missing #{en_path}" unless File.exist?(en_path)

en_json = JSON.parse(File.read(en_path))
keys = nested_to_flat(en_json).keys.sort

rows = keys.map do |dot_key|
  row = { "key" => dot_key }
  SUPPORTED.each do |locale|
    path = File.join(I18N_DIR, "#{locale}.json")
    val = if File.exist?(path)
      dig_dot(JSON.parse(File.read(path)), dot_key)
    else
      dig_dot(en_json, dot_key)
    end
    row[locale] = val.is_a?(String) ? val : (dig_dot(en_json, dot_key) || "")
  end
  row
end

csv_out = CSV.generate do |csv|
  csv << ["key"] + SUPPORTED
  rows.each { |row| csv << [row["key"]] + SUPPORTED.map { |c| (row[c] || "").to_s } }
end

puts csv_out
