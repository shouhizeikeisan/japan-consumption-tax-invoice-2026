export type RoundingMode = 'floor' | 'round' | 'ceil';
export type TaxDirection = 'ex-to-in' | 'in-to-ex';
export type TaxRate = 10 | 8;

export declare const TAX_RATES_2026: Readonly<{
  standard: { total: number; national: number; local: number };
  reduced: { total: number; national: number; local: number };
  invoiceTransitionalRate2026Oct: number;
  invoiceTransitionalRatePrev: number;
  invoiceAnnualCapPerSupplierYen: number;
}>;

export interface SingleTaxResult {
  rate: TaxRate;
  direction: TaxDirection;
  rounding: RoundingMode;
  inputAmount: number;
  taxExcluded: number;
  taxIncluded: number;
  taxAmount: number;
  exactTax: number;
  byRounding: {
    floor: { tax: number; taxExcluded: number; taxIncluded: number };
    round: { tax: number; taxExcluded: number; taxIncluded: number };
    ceil: { tax: number; taxExcluded: number; taxIncluded: number };
  };
  hasRoundingDiff: boolean;
}

export interface DualTaxComparison {
  direction: TaxDirection;
  rounding: RoundingMode;
  inputAmount: number;
  rate10: SingleTaxResult;
  rate8: SingleTaxResult;
  diffTotal: number;
  diffTax: number;
}

export interface DiscountCalcInput {
  basePrice: number;
  discountMode?: 'percent' | 'wari' | 'yen';
  discountValue?: number;
  priceBasis?: 'tax-excluded' | 'tax-included';
  taxRate?: TaxRate;
  rounding?: RoundingMode;
  pointRate?: number;
}

export interface DiscountCalcResult {
  originalExcluded: number;
  originalIncluded: number;
  discountAmountBeforeTax: number;
  discountedExcluded: number;
  taxAmount: number;
  finalPayIncluded: number;
  savedTotal: number;
  pointsEarned: number;
  effectiveBurden: number;
  effectiveTotalDiscountPct: number;
}

export interface InvoiceLineItem {
  unitPrice: number;
  quantity: number;
  rate: TaxRate;
}

export interface InvoiceSummaryResult {
  priceBasis: 'tax-excluded' | 'tax-included';
  rounding: RoundingMode;
  subtotal10Ex: number;
  tax10Invoice: number;
  total10In: number;
  subtotal8Ex: number;
  tax8Invoice: number;
  total8In: number;
  grandSubtotalEx: number;
  grandTaxInvoice: number;
  grandTotalIn: number;
  tax10PerItem: number;
  tax8PerItem: number;
  grandTaxPerItem: number;
  roundingDiscrepancy: number;
  deductible70: number;
  nonDeductible30: number;
  deductible80Old: number;
  diffVs80: number;
}

export declare function parseJapaneseNumber(raw: string | number, fallback?: number): number;
export declare function applyRounding(exactValue: number, mode?: RoundingMode): number;
export declare function calculateSingleTax(
  rawAmount: number,
  rate?: TaxRate,
  direction?: TaxDirection,
  rounding?: RoundingMode
): SingleTaxResult;
export declare function calculateDualTax(
  rawAmount: number,
  direction?: TaxDirection,
  rounding?: RoundingMode
): DualTaxComparison;
export declare function calculateDiscount(input: DiscountCalcInput): DiscountCalcResult;
export declare function calculateInvoiceSummary(
  items: InvoiceLineItem[],
  priceBasis?: 'tax-excluded' | 'tax-included',
  rounding?: RoundingMode
): InvoiceSummaryResult;
