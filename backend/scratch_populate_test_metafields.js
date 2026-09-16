// Populates filter metafields on a few products for testing (built-in fetch, no deps).
// Values mirror what the plugin's Update-All-Prices writes, derived from the live breakdown.
let STORE = process.env.SHOPIFY_STORE, TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
try { const s = require('../secrets.json'); STORE = STORE || s.SHOPIFY_STORE; TOKEN = TOKEN || s.SHOPIFY_ACCESS_TOKEN; } catch (e) {}
const DOMAIN = 'daginawala11.myshopify.com';
const setM = `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{key} userErrors{field message} } }`;

const j = (url, opts) => fetch(url, opts).then(r => r.json());
const gql = (q, v) => j(`https://${STORE}/admin/api/2024-01/graphql.json`, {
  method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: q, variables: v }),
});

(async () => {
  const feed = (await j('https://dagina.shop/products.json?limit=250')).products;
  const ring = feed.filter(p => /moss?anite ring|ruby|emerald/i.test(p.title) && parseFloat(p.variants[0].price) > 0).slice(0, 2);
  const bangle = feed.find(p => /bangle/i.test(p.title) && parseFloat(p.variants[0].price) > 0);
  const pick = [...ring, bangle].filter(Boolean).map(p => ({ pid: p.id, vid: p.variants[0].id, title: p.title }));

  for (const it of pick) {
    try {
      const b = (await j('https://dagina.cloud/api/public/offers/calculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: DOMAIN, shopifyVariantId: String(it.vid) }),
      })).breakdown;
      if (!b) { console.log('no breakdown', it.title); continue; }
      const gold = b.net_weight != null ? b.net_weight : null;
      const gems = (b.gemstone_details && Array.isArray(b.gemstone_details.gemstones)) ? b.gemstone_details.gemstones : [];
      const stoneWt = Math.round(gems.reduce((s, g) => s + (parseFloat(g.weight) || 0), 0) * 1000) / 1000;
      const types = [...new Set(gems.map(g => g.type).filter(Boolean))];
      const karat = b.karat != null ? b.karat : null;

      const owner = `gid://shopify/Product/${it.pid}`, m = [];
      if (gold != null) m.push({ ownerId: owner, namespace: 'custom', key: 'gold_weight', type: 'number_decimal', value: String(gold) });
      if (stoneWt > 0) m.push({ ownerId: owner, namespace: 'custom', key: 'stone_weight', type: 'number_decimal', value: String(stoneWt) });
      if (types.length) m.push({ ownerId: owner, namespace: 'custom', key: 'gemstone_type', type: 'list.single_line_text_field', value: JSON.stringify(types) });
      if (karat != null) m.push({ ownerId: owner, namespace: 'custom', key: 'metal_karat', type: 'number_integer', value: String(Math.round(karat)) });

      const res = await gql(setM, { m });
      const err = res.data.metafieldsSet.userErrors;
      console.log(`${it.title.slice(0,36).padEnd(36)} gold=${gold} stone=${stoneWt} karat=${karat} gems=${JSON.stringify(types)} ${err.length ? 'ERR ' + JSON.stringify(err) : 'OK'}`);
    } catch (e) { console.error('FAIL', it.title, e.message); }
  }
})();
