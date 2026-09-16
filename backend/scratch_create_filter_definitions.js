// Creates PRODUCT metafield definitions so they can be added as storefront filters
// (Shopify Admin -> Settings -> Search & Discovery -> Filters). Uses built-in fetch (no deps).
// Run once:  node scratch_create_filter_definitions.js
let STORE = process.env.SHOPIFY_STORE, TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
try { const s = require('../secrets.json'); STORE = STORE || s.SHOPIFY_STORE; TOKEN = TOKEN || s.SHOPIFY_ACCESS_TOKEN; } catch (e) {}
if (!STORE || !TOKEN) { console.error('Missing SHOPIFY_STORE / SHOPIFY_ACCESS_TOKEN'); process.exit(1); }

const defs = [
  { name: 'Gold Weight (g)', namespace: 'custom', key: 'gold_weight', type: 'number_decimal', ownerType: 'PRODUCT' },
  { name: 'Stone Weight (ct)', namespace: 'custom', key: 'stone_weight', type: 'number_decimal', ownerType: 'PRODUCT' },
  { name: 'Gemstone Type', namespace: 'custom', key: 'gemstone_type', type: 'list.single_line_text_field', ownerType: 'PRODUCT' },
  { name: 'Metal Purity (Karat)', namespace: 'custom', key: 'metal_karat', type: 'number_integer', ownerType: 'PRODUCT' },
  { name: 'Enamel Color', namespace: 'custom', key: 'enamel_color', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { name: 'Enamel Weight (g)', namespace: 'custom', key: 'enamel_weight', type: 'number_decimal', ownerType: 'PRODUCT' },
  { name: 'Making Group', namespace: 'custom', key: 'making_group', type: 'single_line_text_field', ownerType: 'PRODUCT' },
];

const mutation = `mutation CreateDef($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition { id key type { name } }
    userErrors { field message code }
  }
}`;

async function gql(query, variables) {
  const r = await fetch(`https://${STORE}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

(async () => {
  for (const d of defs) {
    try {
      const j = await gql(mutation, { definition: d });
      const r = j.data && j.data.metafieldDefinitionCreate;
      const errs = (r && r.userErrors) || j.errors;
      if (r && r.createdDefinition) console.log(`OK   ${d.key} -> created (${r.createdDefinition.type.name})`);
      else if (errs && /taken|exists/i.test(JSON.stringify(errs))) console.log(`SKIP ${d.key} -> already exists`);
      else console.log(`ERR  ${d.key} ->`, JSON.stringify(errs));
    } catch (e) { console.error(`FAIL ${d.key} ->`, e.message); }
  }
  console.log('\nNext: Shopify Admin -> Settings -> Search & Discovery -> Filters -> Add each as a filter.');
})();
