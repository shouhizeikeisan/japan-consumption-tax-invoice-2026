/**
 * Japan Consumption Tax (10% Standard / 8% Reduced), Discount & Invoice System (2026)
 * Zero-dependency ESM calculation engine matching https://shouhizeikeisan.com
 * @license MIT
 */

export const TAX_RATES_2026 = Object.freeze({
  standard: { total: 10, national: 7.8, local: 2.2 },
  reduced: { total: 8, national: 6.24, local: 1.76 },
  invoiceTransitionalRate2026Oct: 0.7, // 令和8年度税制改正: 2026-10-01 〜 2028-09-30 (7割控除)
  invoiceTransitionalRatePrev: 0.8,    // 〜2026-09-30 (旧8割控除)
  invoiceAnnualCapPerSupplierYen: 100_000_000, // 同一免税事業者 年間1億円上限
});

/** Normalize Japanese full-width digits/punctuation to finite number */
export function parseJapaneseNumber(raw, fallback = 0) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : fallback;
  const normalized = String(raw ?? '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．，、。]/g, (c) => (c === '，' || c === '、' ? ',' : '.'))
    .replace(/[円¥￥,，\s%％]/g, '')
    .replace(/－|ー/g, '-');
  if (!normalized || normalized === '-' || normalized === '.') return fallback;
  const val = Number(normalized);
  return Number.isFinite(val) ? val : fallback;
}

/** Precision-safe rounding (floor / round / ceil) avoiding IEEE-754 drift */
export function applyRounding(exactValue, mode = 'floor') {
  const cleaned = Math.round(exactValue * 1e9) / 1e9;
  if (mode === 'floor') return Math.floor(cleaned + 1e-11);
  if (mode === 'ceil') return Math.ceil(cleaned - 1e-11);
  return Math.round(cleaned + 1e-11);
}

/** Single tax rate calculation following NTA No.6303 & No.6371 */
export function calculateSingleTax(rawAmount, rate = 10, direction = 'ex-to-in', rounding = 'floor') {
  const inputAmount = Math.max(0, Math.round(Number.isFinite(rawAmount) ? rawAmount : 0));
  const exactTax =
    direction === 'ex-to-in'
      ? (inputAmount * rate) / 100
      : (inputAmount * rate) / (100 + rate);

  const computeFor = (m) => {
    const tax = applyRounding(exactTax, m);
    if (direction === 'ex-to-in') {
      return { tax, taxExcluded: inputAmount, taxIncluded: inputAmount + tax };
    }
    return { tax, taxExcluded: inputAmount - tax, taxIncluded: inputAmount };
  };

  const floor = computeFor('floor');
  const round = computeFor('round');
  const ceil = computeFor('ceil');
  const chosen = rounding === 'floor' ? floor : rounding === 'ceil' ? ceil : round;

  return {
    rate,
    direction,
    rounding,
    inputAmount,
    taxExcluded: chosen.taxExcluded,
    taxIncluded: chosen.taxIncluded,
    taxAmount: chosen.tax,
    exactTax,
    byRounding: { floor, round, ceil },
    hasRoundingDiff: floor.tax !== ceil.tax,
  };
}

/** Dual 10% Standard vs 8% Reduced Tax simultaneous calculation */
export function calculateDualTax(rawAmount, direction = 'ex-to-in', rounding = 'floor') {
  const rate10 = calculateSingleTax(rawAmount, 10, direction, rounding);
  const rate8 = calculateSingleTax(rawAmount, 8, direction, rounding);
  return {
    direction,
    rounding,
    inputAmount: rate10.inputAmount,
    rate10,
    rate8,
    diffTotal:
      direction === 'ex-to-in'
        ? rate10.taxIncluded - rate8.taxIncluded
        : rate8.taxExcluded - rate10.taxExcluded,
    diffTax: rate10.taxAmount - rate8.taxAmount,
  };
}

/** Retail Discount (%OFF / Wari / Yen) + Consumption Tax + Point Reward effective price */
export function calculateDiscount({
  basePrice,
  discountMode = 'percent',
  discountValue = 0,
  priceBasis = 'tax-excluded',
  taxRate = 10,
  rounding = 'floor',
  pointRate = 0,
}) {
  const safeBase = Math.max(0, Math.round(basePrice || 0));
  const safePointRate = Math.min(50, Math.max(0, Number(pointRate) || 0));

  let pct = 0;
  let fixedOff = 0;
  if (discountMode === 'percent') pct = Math.min(99.9, Math.max(0, Number(discountValue) || 0));
  else if (discountMode === 'wari') pct = Math.min(99.9, Math.max(0, (Number(discountValue) || 0) * 10));
  else fixedOff = Math.min(safeBase, Math.max(0, Math.round(Number(discountValue) || 0)));

  let originalExcluded = 0;
  let originalIncluded = 0;
  let discountedExcluded = 0;
  let taxAmount = 0;
  let finalPayIncluded = 0;
  let discountAmountBeforeTax = 0;

  if (priceBasis === 'tax-excluded') {
    originalExcluded = safeBase;
    originalIncluded = safeBase + applyRounding((safeBase * taxRate) / 100, rounding);
    discountAmountBeforeTax =
      discountMode === 'yen' ? fixedOff : applyRounding((safeBase * pct) / 100, rounding);
    discountedExcluded = Math.max(0, safeBase - discountAmountBeforeTax);
    taxAmount = applyRounding((discountedExcluded * taxRate) / 100, rounding);
    finalPayIncluded = discountedExcluded + taxAmount;
  } else {
    originalIncluded = safeBase;
    originalExcluded = safeBase - applyRounding((safeBase * taxRate) / (100 + taxRate), rounding);
    const discountIn =
      discountMode === 'yen' ? fixedOff : applyRounding((safeBase * pct) / 100, rounding);
    finalPayIncluded = Math.max(0, safeBase - discountIn);
    taxAmount = applyRounding((finalPayIncluded * taxRate) / (100 + taxRate), rounding);
    discountedExcluded = finalPayIncluded - taxAmount;
    discountAmountBeforeTax = Math.max(0, originalExcluded - discountedExcluded);
  }

  const savedTotal = Math.max(0, originalIncluded - finalPayIncluded);
  const pointsEarned = Math.floor((finalPayIncluded * safePointRate) / 100 + 1e-11);
  const effectiveBurden = Math.max(0, finalPayIncluded - pointsEarned);
  const effectiveTotalDiscountPct =
    originalIncluded > 0 ? ((originalIncluded - effectiveBurden) / originalIncluded) * 100 : 0;

  return {
    originalExcluded,
    originalIncluded,
    discountAmountBeforeTax,
    discountedExcluded,
    taxAmount,
    finalPayIncluded,
    savedTotal,
    pointsEarned,
    effectiveBurden,
    effectiveTotalDiscountPct,
  };
}

/** Qualified Invoice (適格請求書) Multi-Line Calculator with Per-Rate Once Rounding & 2026-10 70% Transitional Measure */
export function calculateInvoiceSummary(items, priceBasis = 'tax-excluded', rounding = 'floor') {
  let raw10 = 0;
  let raw8 = 0;
  let tax10PerItem = 0;
  let tax8PerItem = 0;

  for (const item of items) {
    const lineTotal = Math.max(0, Math.round(item.unitPrice || 0)) * Math.max(0, Math.round(item.quantity || 0));
    if (item.rate === 10) {
      raw10 += lineTotal;
      tax10PerItem +=
        priceBasis === 'tax-excluded'
          ? applyRounding((lineTotal * 10) / 100, rounding)
          : applyRounding((lineTotal * 10) / 110, rounding);
    } else {
      raw8 += lineTotal;
      tax8PerItem +=
        priceBasis === 'tax-excluded'
          ? applyRounding((lineTotal * 8) / 100, rounding)
          : applyRounding((lineTotal * 8) / 108, rounding);
    }
  }

  let subtotal10Ex = 0;
  let tax10Invoice = 0;
  let total10In = 0;
  let subtotal8Ex = 0;
  let tax8Invoice = 0;
  let total8In = 0;

  if (priceBasis === 'tax-excluded') {
    subtotal10Ex = raw10;
    tax10Invoice = applyRounding((raw10 * 10) / 100, rounding);
    total10In = subtotal10Ex + tax10Invoice;

    subtotal8Ex = raw8;
    tax8Invoice = applyRounding((raw8 * 8) / 100, rounding);
    total8In = subtotal8Ex + tax8Invoice;
  } else {
    total10In = raw10;
    tax10Invoice = applyRounding((raw10 * 10) / 110, rounding);
    subtotal10Ex = total10In - tax10Invoice;

    total8In = raw8;
    tax8Invoice = applyRounding((raw8 * 8) / 108, rounding);
    subtotal8Ex = total8In - tax8Invoice;
  }

  const grandSubtotalEx = subtotal10Ex + subtotal8Ex;
  const grandTaxInvoice = tax10Invoice + tax8Invoice;
  const grandTotalIn = total10In + total8In;
  const grandTaxPerItem = tax10PerItem + tax8PerItem;
  const roundingDiscrepancy = grandTaxPerItem - grandTaxInvoice;

  const deductible70 = applyRounding(grandTaxInvoice * TAX_RATES_2026.invoiceTransitionalRate2026Oct, rounding);
  const nonDeductible30 = grandTaxInvoice - deductible70;
  const deductible80Old = applyRounding(grandTaxInvoice * TAX_RATES_2026.invoiceTransitionalRatePrev, rounding);
  const diffVs80 = deductible80Old - deductible70;

  return {
    priceBasis,
    rounding,
    subtotal10Ex,
    tax10Invoice,
    total10In,
    subtotal8Ex,
    tax8Invoice,
    total8In,
    grandSubtotalEx,
    grandTaxInvoice,
    grandTotalIn,
    tax10PerItem,
    tax8PerItem,
    grandTaxPerItem,
    roundingDiscrepancy,
    deductible70,
    nonDeductible30,
    deductible80Old,
    diffVs80,
  };
}
