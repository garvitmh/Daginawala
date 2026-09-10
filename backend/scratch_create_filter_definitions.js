// Creates PRODUCT metafield definitions for gold_weight, stone_weight, gemstone_type so they can be
// added as storefront filters (Shopify Admin -> Settings -> Search & Discovery -> Filters).
// Reads creds from env, falling back to secrets.json. Run once:
//   node scratch_create_filter_definitions.js
const axios = require('axios');
let STORE = process.env.SHOPIFY_STORE, TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
try { const s = require('../secrets.json'); STORE = STORE || s.SHOPIFY_STORE; TOKEN = TOKEN || s.SHOPIFY_ACCESS_TOKEN; } catch (e) {}
if (!STORE || !TOKEN) { console.error('Missing SHOPIFY_STORE / SHOPIFY_ACCESS_TOKEN'); process.exit(1); }

const defs = [
  { name: 'Gold Weight (g)', namespace: 'custom', key: 'gold_weight', type: 'number_decimal', ownerType: 'PRODUCT' },
  { name: 'Stone Weight (ct)', namespace: 'custom', key: 'stone_weight', type: 'number_decimal', ownerType: 'PRODUCT' },
  { name: 'Gemstone Type', namespace: 'custom', key: 'gemstone_type', type: 'list.single_line_text_field', ownerType: 'PRODUCT' },
];

const mutation = `
  mutation CreateDef($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id name namespace key ownerType type { name } }
      userErrors { field message code }
    }
  }`;

(async () => {
  for (const d of defs) {
    try {
      const res = await axios.post(
        `https://${STORE}/admin/api/2024-01/graphql.json`,
        { query: mutation, variables: { definition: d } },
        { headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
      );
      const r = res.data.data && res.data.data.metafieldDefinitionCreate;
      const errs = (r && r.userErrors) || res.data.errors;
      if (r && r.createdDefinition) console.log(`OK   ${d.key} -> created (${r.createdDefinition.id})`);
      else if (errs && errs.length && /taken|exists/i.test(JSON.stringify(errs))) console.log(`SKIP ${d.key} -> already exists`);
      else console.log(`ERR  ${d.key} ->`, JSON.stringify(errs));
    } catch (e) { console.error(`FAIL ${d.key} ->`, e.response && e.response.data ? JSON.stringify(e.response.data) : e.message); }
  }
  console.log('\nNext: Shopify Admin -> Settings -> Search & Discovery -> Filters -> Add filter -> pick Gold Weight / Stone Weight / Gemstone Type.');
})();
