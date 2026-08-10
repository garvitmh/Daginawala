const axios = require('axios');

const shop = 'daginawala11.myshopify.com';
const accessToken = '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';

async function checkAccess() {
    console.log(`Checking access for shop: ${shop}...`);
    try {
        const response = await axios.get(`https://${shop}/admin/api/2024-01/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Shopify Access is active!');
        console.log(`Shop Name: ${response.data.shop.name}`);
        console.log(`Email: ${response.data.shop.email}`);
        console.log(`Plan: ${response.data.shop.plan_name}`);
    } catch (error) {
        console.error('❌ Failed to connect to Shopify API:', error.response ? error.response.data : error.message);
    }
}

checkAccess();
