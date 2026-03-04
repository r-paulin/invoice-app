# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Use placeholder image for missing illustration assets so images load on all pages
- Correct entity card image path in JS (`assets/img/export-placeholder.svg`)
- Modal focus return to trigger button on close (accessibility)
- Validation alert built with DOM instead of `innerHTML` (defence in depth)

### Added

- Explicit focus-visible styles for items table inputs
- `prefers-reduced-motion` media query for animations/transitions
- SRI and `crossorigin` for jspdf script on download and processing pages
- `package.json` and ESLint config for optional static checks
- PR template, CHANGELOG, CODEOWNERS

### Changed

- `og:image` meta points to local `assets/img/Invossa.svg`
