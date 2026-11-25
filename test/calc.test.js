import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TAX_RATES_2026,
  parseJapaneseNumber,
  calculateSingleTax,
  calculateDualTax,
  calculateDiscount,
  calculateInvoiceSummary,
} from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

test('parseJapaneseNumber handles full-width digits, yen symbol and commas', () => {
  assert.equal(parseJapaneseNumber('１０，０００円'), 10000);
  assert.equal(parseJapaneseNumber('３９８０'), 3980);
  assert.equal(parseJapaneseNumber('20%'), 20);
  assert.equal(parseJapaneseNumber('invalid', 99), 99);
});

test('10% and 8% external tax (ex-to-in) on 10,000 JPY', () => {
  const res = calculateDualTax(10000, 'ex-to-in', 'floor');
  assert.equal(res.rate10.taxIncluded, 11000);
  assert.equal(res.rate10.taxAmount, 1000);
  assert.equal(res.rate8.taxIncluded, 10800);
  assert.equal(res.rate8.taxAmount, 800);
  assert.equal(res.diffTax, 200);
  assert.equal(res.rate10.hasRoundingDiff, false);
});

test('Internal tax back-calculation (in-to-ex) on 1,000 JPY highlights 1-yen rounding diff', () => {
  const res = calculateDualTax(1000, 'in-to-ex', 'floor');
  assert.equal(res.rate10.taxExcluded, 910);
  assert.equal(res.rate10.taxAmount, 90);
  assert.equal(res.rate10.byRounding.round.tax, 91);
  assert.equal(res.rate10.byRounding.ceil.tax, 91);
  assert.equal(res.rate10.hasRoundingDiff, true);
  assert.equal(res.rate8.taxExcluded, 926);
  assert.equal(res.rate8.taxAmount, 74);
});

test('Discount + 10% tax + 10% point reward effective burden (5,000 JPY, 20% OFF, 10% pt)', () => {
  const res = calculateDiscount({
    basePrice: 5000,
    discountMode: 'percent',
    discountValue: 20,
    priceBasis: 'tax-excluded',
    taxRate: 10,
    rounding: 'floor',
    pointRate: 10,
  });
  assert.equal(res.discountedExcluded, 4000);
  assert.equal(res.taxAmount, 400);
  assert.equal(res.finalPayIncluded, 4400);
  assert.equal(res.pointsEarned, 440);
  assert.equal(res.effectiveBurden, 3960);
  assert.equal(Number(res.effectiveTotalDiscountPct.toFixed(1)), 28.0);
});

test('Qualified Invoice per-rate once rounding vs NG per-item rounding & 2026-10 70% deduction', () => {
  const summary = calculateInvoiceSummary(
    [
      { unitPrice: 1555, quantity: 1, rate: 10 },
      { unitPrice: 785, quantity: 4, rate: 8 },
      { unitPrice: 445, quantity: 1, rate: 10 },
    ],
    'tax-excluded',
    'floor'
  );
  assert.equal(summary.subtotal10Ex, 2000);
  assert.equal(summary.tax10Invoice, 200);
  assert.equal(summary.subtotal8Ex, 3140);
  assert.equal(summary.tax8Invoice, 251);
  assert.equal(summary.grandSubtotalEx, 5140);
  assert.equal(summary.grandTaxInvoice, 451);
  assert.equal(summary.grandTotalIn, 5591);
  assert.equal(summary.grandTaxPerItem, 450);
  assert.equal(summary.roundingDiscrepancy, -1);
  assert.equal(summary.deductible70, 315);
  assert.equal(summary.nonDeductible30, 136);
  assert.equal(summary.deductible80Old, 360);
  assert.equal(summary.diffVs80, 45);
});

test('Open dataset JSON and CSV match engine calculations', () => {
  const jsonPath = path.join(DATA_DIR, 'tax_rates_and_invoice_2026.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  assert.equal(data.jurisdiction, 'JP');
  assert.equal(data.reference_calculator, 'https://shouhizeikeisan.com');
  assert.equal(data.rates.length, 2);
  assert.equal(TAX_RATES_2026.invoiceTransitionalRate2026Oct, 0.7);

  const csvPath = path.join(DATA_DIR, 'quick_reference_table_2026.csv');
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
  assert.ok(lines.length >= 15);
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(Number);
    const [base, ex10Tot, ex10Tax, ex8Tot, ex8Tax, diffYen, in10FloorBase, in10FloorTax, in10RoundTax, in8FloorBase, in8FloorTax, ded70] = cols;
    const ex = calculateDualTax(base, 'ex-to-in', 'floor');
    const inc = calculateDualTax(base, 'in-to-ex', 'floor');
    assert.equal(ex.rate10.taxIncluded, ex10Tot);
    assert.equal(ex.rate10.taxAmount, ex10Tax);
    assert.equal(ex.rate8.taxIncluded, ex8Tot);
    assert.equal(ex.rate8.taxAmount, ex8Tax);
    assert.equal(ex.diffTax, diffYen);
    assert.equal(inc.rate10.taxExcluded, in10FloorBase);
    assert.equal(inc.rate10.taxAmount, in10FloorTax);
    assert.equal(inc.rate10.byRounding.round.tax, in10RoundTax);
    assert.equal(inc.rate8.taxExcluded, in8FloorBase);
    assert.equal(inc.rate8.taxAmount, in8FloorTax);
    assert.equal(Math.floor(ex.rate10.taxAmount * 0.7 + 1e-11), ded70);
  }
});
