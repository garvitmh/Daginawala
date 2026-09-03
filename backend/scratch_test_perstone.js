// Verify the pricing engine applies a DIFFERENT discount per stone.
const { PricingService } = require('./dist/services/pricing.service');
const assert = require('assert');
const base = { weightGrams: 5, metal: 'gold', karat: 18, gstPct: 3, wastagePct: 0,
  makingChargeType: 'per_gram', makingChargeValue: 1500 };
const settings = { defaultGstPct: 3, defaultWastagePct: 0 };
(async () => {
  // Two custom stones, ₹10000 and ₹20000 pre-discount; offer 10% on stone A, 50% on stone B
  const product = { ...base, gemstones: [
    { id: 'A', gemstoneType: 'ruby', isCustom: true, pricePerPiece: 10000, gemstonePieces: 1, discountType: 'percent', discountValue: 10 },
    { id: 'B', gemstoneType: 'emerald', isCustom: true, pricePerPiece: 20000, gemstonePieces: 1, discountType: 'percent', discountValue: 50 },
  ]};
  const r = await PricingService.calculateProductPrice(product, 5000, null, settings, null);
  const gems = r.breakdown.gemstone_details.gemstones;
  assert.strictEqual(gems.length, 2, 'two stones');
  const a = gems.find(g => g.id === 'A'), b = gems.find(g => g.id === 'B');
  assert.ok(a && b, 'both stones have ids');
  assert.strictEqual(Math.round(a.finalCost/100), 9000, 'stone A 10% off -> 9000');   // 10000*0.9
  assert.strictEqual(Math.round(b.finalCost/100), 10000, 'stone B 50% off -> 10000');  // 20000*0.5
  assert.strictEqual(a.discountValue, 10); assert.strictEqual(b.discountValue, 50);
  // gemstone total = 9000+10000 = 19000
  assert.strictEqual(Math.round(r.breakdown.gemstone_price/100), 19000, 'stone total 19000');
  console.log('PASS: per-stone discounts applied independently (A 10%->9000, B 50%->10000, ids present)');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
