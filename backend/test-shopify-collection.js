const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'daginawala11.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!SHOPIFY_ACCESS_TOKEN) {
    console.error('❌ Error: SHOPIFY_ACCESS_TOKEN is not defined in the environment.');
    process.exit(1);
}

async function main() {
    console.log("Testing collection 432092414170...");
    const query = `
    query {
        collection(id: "gid://shopify/Collection/432092414170") {
            products(first: 5) {
                edges {
                    node {
                        id
                    }
                }
            }
        }
    }
    `;
    try {
        const response = await axios.post(
            `https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`,
            { query },
            {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("SUCCESS:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("ERROR:");
        console.error(e.response ? e.response.data : e.message);
    }
}
main();
