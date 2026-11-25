# Changelog

## v2026.1.0 (2026-11-25)
- Initial release of zero-dependency ESM calculation engine (`src/index.js`, `src/index.d.ts`) for Japan Consumption Tax (10% standard / 8% reduced rate), retail discount + point-reward effective pricing, and Qualified Invoice System calculations.
- Added structured open reference datasets (`data/tax_rates_and_invoice_2026.json`, `data/quick_reference_table_2026.csv`, `data/invoice_transitional_schedule_2026.csv`) reflecting Japan's FY2026 (令和8年度) Tax Reform: 70% transitional input tax credit effective October 1, 2026, 100M JPY annual cap per exempt supplier, and FY2027–2028 30% sole-proprietor special rule.
- Added native `node:test` verification suite covering full-width Japanese numeral parsing, 3-way rounding differences, discount + point calculations, per-rate once invoice rounding vs per-item NG discrepancies, and CSV/JSON consistency.
