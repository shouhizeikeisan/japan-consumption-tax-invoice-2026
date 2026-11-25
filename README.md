# Japan Consumption Tax (8% / 10%), Discount & Invoice 2026 Open Data & Engine

日本の標準税率 **10%**（国税7.8%・地方税2.2%）および軽減税率 **8%**（飲食料品・定期購読新聞）の税込・税抜計算、1円未満の端数処理3方式（切り捨て・四捨五入・切り上げ）、割引＋ポイント還元実質価格、および **令和8年度（2026年10月〜）税制改正対応インボイス経過措置「7割控除（70%）」・税率別1回端数ルール** を再現するゼロ依存 ESM 計算エンジンと JSON/CSV オープンデータセットです。たとえば税抜 **10,000円** なら 10% 税込 **11,000円**・8% 税込 **10,800円**（差額 200円）、税込 **1,000円** の内税逆算（切り捨て）なら 10% 消費税 **90円**（本体 910円）・8% 消費税 **74円**（本体 926円）と国税庁基準どおりに検算できます。

Zero-dependency Node.js ESM calculation engine and structured JSON/CSV reference datasets for Japan's Consumption Tax (10% standard / 8% reduced rate), retail discount + point-reward effective pricing, and the October 2026 Qualified Invoice System (70% transitional input tax credit & per-rate once rounding).

> **Online Interactive Calculator**: The browser-based interactive calculator powered by this exact engine is maintained by the same team at **[shouhizeikeisan.com](https://shouhizeikeisan.com/)** (free, no login required / 無料・登録不要のWeb計算ツールは同一運営チームが公開しています).

---

## 2026 Quick Reference Table (10% Standard vs 8% Reduced, Floor Rounding)

| 基準金額 (JPY) | 10% 税込 (外税) | 10% 消費税 | 8% 税込 (外税) | 10% vs 8% 差額 | 税込→10% 本体 | 税込→10% 内税 | 免税仕入 7割控除 (10%外税) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500円 | 550円 | 50円 | 540円 | 10円 | 455円 | 45円 | 35円 |
| 1,000円 | 1,100円 | 100円 | 1,080円 | 20円 | 910円 | 90円 | 70円 |
| 3,980円 | 4,378円 | 398円 | 4,298円 | 80円 | 3,619円 | 361円 | 278円 |
| 5,000円 | 5,500円 | 500円 | 5,400円 | 100円 | 4,546円 | 454円 | 350円 |
| 10,000円 | 11,000円 | 1,000円 | 10,800円 | 200円 | 9,091円 | 909円 | 700円 |
| 50,000円 | 55,000円 | 5,000円 | 54,000円 | 1,000円 | 45,455円 | 4,545円 | 3,500円 |
| 100,000円 | 110,000円 | 10,000円 | 108,000円 | 2,000円 | 90,910円 | 9,090円 | 7,000円 |
| 1,000,000円 | 1,100,000円 | 100,000円 | 1,080,000円 | 20,000円 | 909,091円 | 90,909円 | 70,000円 |

Full machine-readable datasets are available in [`data/quick_reference_table_2026.csv`](./data/quick_reference_table_2026.csv), [`data/invoice_transitional_schedule_2026.csv`](./data/invoice_transitional_schedule_2026.csv), and [`data/tax_rates_and_invoice_2026.json`](./data/tax_rates_and_invoice_2026.json).

---

## Quick Usage (Node.js 18+ ESM)

```js
import {
  calculateDualTax,
  calculateDiscount,
  calculateInvoiceSummary,
} from './src/index.js';

// 1. 税込 1,000円 → 税抜逆算（切り捨て・四捨五入比較）
const backCalc = calculateDualTax(1000, 'in-to-ex', 'floor');
// rate10: { taxExcluded: 910, taxAmount: 90, hasRoundingDiff: true }
// rate8:  { taxExcluded: 926, taxAmount: 74 }

// 2. 税抜 5,000円・20%OFF・10%課税・10%ポイント還元
const sale = calculateDiscount({
  basePrice: 5000,
  discountMode: 'percent',
  discountValue: 20,
  priceBasis: 'tax-excluded',
  taxRate: 10,
  pointRate: 10,
});
// { finalPayIncluded: 4400, pointsEarned: 440, effectiveBurden: 3960 }

// 3. インボイス適格請求書（税率ごとに1回端数処理）＆ 2026年10月〜7割控除
const invoice = calculateInvoiceSummary([
  { unitPrice: 1555, quantity: 1, rate: 10 },
  { unitPrice: 785, quantity: 4, rate: 8 },
  { unitPrice: 445, quantity: 1, rate: 10 },
]);
// { grandTotalIn: 5591, grandTaxInvoice: 451, roundingDiscrepancy: -1, deductible70: 315 }
```

Run tests locally (zero external packages):

```bash
npm test
```

---

## API Overview

| Function | Purpose |
| :--- | :--- |
| `parseJapaneseNumber(raw, fallback)` | Parses Japanese full-width digits (`０-９`), commas, and `円` / `%` markers safely. |
| `applyRounding(exactValue, mode)` | Precision-safe rounding (`floor` / `round` / `ceil`) eliminating IEEE-754 drift. |
| `calculateSingleTax(amount, rate, direction, rounding)` | Computes 10% or 8% external/internal tax plus 3-way rounding comparison. |
| `calculateDualTax(amount, direction, rounding)` | Side-by-side 10% standard vs 8% reduced rate comparison and diff. |
| `calculateDiscount(options)` | Retail `%OFF` / `○割引` / `○円引き` + 8%/10% tax + point-reward effective burden. |
| `calculateInvoiceSummary(items, basis, rounding)` | Per-rate once rounding vs per-item NG discrepancy + Oct 2026 70% transitional credit. |

---

## FAQ（日本の消費税・インボイス計算でよくある質問）

### 2026年10月からのインボイス経過措置は50%控除ですか、70%控除ですか？
令和8年度（2026年度）税制改正により当初予定の50%から緩和・延長され、**2026年10月1日〜2028年9月30日は「7割控除（70%）」**が適用されます（同一免税事業者からの課税仕入れにつき年間1億円上限を新設）。

### インボイス（適格請求書）の端数処理は商品ごとに行ってよいですか？
認められていません。国税庁 No.6371 の規定により、**「一の適格請求書につき、税率ごとに1回」**のみ端数処理を行う必要があります（切り捨て・四捨五入・切り上げの選択自体は事業者任意）。

### 税込1,000円から10%の内税を逆算すると90円と91円のどちらになりますか？
正確な消費税額は `1,000 × 10 ÷ 110 ＝ 90.909…円` のため、切り捨て採用時は **90円（税抜910円）**、四捨五入・切り上げ採用時は **91円（税抜909円）** となります。

### 税抜5,000円の20%OFF＋10%ポイント還元は実質何%引きですか？
割引後税抜4,000円に10%税を加えて支払額4,400円、10%還元（440pt）を差し引いた実質負担は **3,960円** となり、元の税込定価5,500円に対し **実質28.0%引き** 相当になります。

---

## Online Calculator & Official Sources

- **Interactive Web Calculators**（同一運営チームが公開している無料オンライン計算ツール）:
  - 消費税 8%・10% 税込／税抜リアルタイム電卓: https://shouhizeikeisan.com/
  - 割引（％OFF・何割引）＋消費税＆ポイント実質価格電卓: https://shouhizeikeisan.com/waribiki/
  - パーセント4モード万能電卓（割合・増減率・定価逆算＆Excel式）: https://shouhizeikeisan.com/percent/
  - インボイス8%・10%混在明細＆2026年10月7割控除電卓: https://shouhizeikeisan.com/invoice/
- **Official National Tax Agency (NTA Japan) References**:
  - [国税庁 No.6303 消費税および地方消費税の税率](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6303.htm)
  - [国税庁 No.6371 端数処理の計算](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6371.htm)
  - [国税庁 消費税の軽減税率制度について](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/index.htm)
  - [国税庁 インボイス制度特設サイト](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice.htm)

## License

- Source code (`src/`, `test/`): [MIT License](./LICENSE)
- Reference datasets (`data/*.json`, `data/*.csv`): [CC BY 4.0](./data/LICENSE-DATA.md)
