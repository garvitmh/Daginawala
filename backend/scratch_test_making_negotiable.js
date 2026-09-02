// Verifies BUG 1 fix: making negotiation (₹/g bubbles) enabled only for per_gram/master making,
// disabled for percent/flat. Runs the real compiled PricingService.
const { PricingService } = require('./dist/services/pricing.service');
const assert = require('assert');

const base = { weightGrams: 10, metal: 'gold', karat: 18, gemstones: [], gstPct: 3, wastagePct: 0 };
const ratePerGram = 5000;
const settings = { defaultGstPct: 3, defaultWastagePct: 0 };

(async () => {
  // per_gram: negotiable, bubbles present
  const pg = await PricingService.calculateProductPrice(
    { ...base, makingChargeType: 'per_gram', makingChargeValue: 1500 }, ratePerGram, null, settings, null);
  assert.strictEqual(pg.breakdown.making_negotiable, true, 'per_gram should be negotiable');
  assert.ok(pg.breakdown.making_charge_bubbles.length > 0, 'per_gram should have bubbles');

  // percent: NOT negotiable, bubbles empty, price uses percent (not coerced to per_gram)
  const pc = await PricingService.calculateProductPrice(
    { ...base, makingChargeType: 'percent', makingChargeValue: 15 }, ratePerGram, null, settings, null);
  assert.strictEqual(pc.breakdown.making_negotiable, false, 'percent should NOT be negotiable');
  assert.strictEqual(pc.breakdown.making_charge_bubbles.length, 0, 'percent should have NO bubbles');
  // making = 15% of metal (5000*10=50000) = 7500, NOT 15*10=150
  assert.strictEqual(Math.round(pc.breakdown.making_charges / 100), 7500, 'percent making must be 7500');

  // flat: NOT negotiable
  const fl = await PricingService.calculateProductPrice(
    { ...base, makingChargeType: 'flat', makingChargeValue: 2000 }, ratePerGram, null, settings, null);
  assert.strictEqual(fl.breakdown.making_negotiable, false, 'flat should NOT be negotiable');
  assert.strictEqual(fl.breakdown.making_charge_bubbles.length, 0, 'flat should have NO bubbles');
  assert.strictEqual(Math.round(fl.breakdown.making_charges / 100), 2000, 'flat making must be 2000');

  console.log('ALL PASS: per_gram negotiable w/ bubbles; percent/flat non-negotiable w/ no bubbles; prices correct');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
