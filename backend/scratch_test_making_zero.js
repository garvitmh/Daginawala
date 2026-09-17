// Verify: making charge 0 + a making group assigned -> uses the group's rate (client rule).
const { PricingService } = require('./dist/services/pricing.service');
const assert = require('assert');
const settings = { defaultGstPct: 3, defaultWastagePct: 0, defaultMakingChargeValue: 1500, defaultMakingChargeType: 'per_gram' };
(async () => {
  const base = { weightGrams: 10, metal: 'gold', karat: 18, gstPct: 3, wastagePct: 0, gemstones: [] };
  // making = 0, group assigned (per_gram 900)
  const withGroup = await PricingService.calculateProductPrice(
    { ...base, makingChargeType: 'per_gram', makingChargeValue: 0, makingGroup: { type: 'per_gram', value: 900 } },
    5000, null, settings, null);
  assert.strictEqual(Math.round(withGroup.breakdown.making_charges/100), 9000, 'making 0 + group 900/g x10g => 9000');

  // making = 0, NO group -> stays 0 (not forced to default)
  const noGroup = await PricingService.calculateProductPrice(
    { ...base, makingChargeType: 'per_gram', makingChargeValue: 0 },
    5000, null, settings, null);
  assert.strictEqual(Math.round(noGroup.breakdown.making_charges/100), 0, 'making 0 + no group => 0');

  // making set (1200) + group present -> uses product value, NOT group
  const both = await PricingService.calculateProductPrice(
    { ...base, makingChargeType: 'per_gram', makingChargeValue: 1200, makingGroup: { type: 'per_gram', value: 900 } },
    5000, null, settings, null);
  assert.strictEqual(Math.round(both.breakdown.making_charges/100), 12000, 'making 1200 wins over group => 12000');

  console.log('PASS: making=0+group uses group(9000); 0+no group stays 0; nonzero making wins over group');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
