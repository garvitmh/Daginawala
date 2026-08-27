require('dotenv').config();

console.log('API_KEY:', process.env.SHOPIFY_API_KEY);
console.log('HOST:', process.env.HOST);
console.log('SCOPES:', process.env.SCOPES);
console.log('SHOP:', process.env.SHOPIFY_STORE);

const installUrl = `https://${process.env.SHOPIFY_STORE || 'daginawala11.myshopify.com'}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=read_products,write_products,read_inventory,write_inventory,read_draft_orders,write_draft_orders,read_themes,write_themes&redirect_uri=${encodeURIComponent((process.env.HOST || 'https://dagina.cloud') + '/auth/callback')}`;

console.log('\n--- Direct Merchant Auth URL ---');
console.log(installUrl);
