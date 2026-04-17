const axios = require('axios');
async function main() {
    console.log("Fetching all collections...");
    const query = `
    query {
        collections(first: 10) {
            edges {
                node {
                    id
                    title
                }
            }
        }
    }
    `;
    try {
        const response = await axios.post(
            'https://daginawala11.myshopify.com/admin/api/2024-01/graphql.json',
            { query },
            {
                headers: {
                    'X-Shopify-Access-Token': 'your_shopify_access_token_here',
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
