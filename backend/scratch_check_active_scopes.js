const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to database...');
    const shop = await prisma.shop.findFirst({
        where: { domain: 'daginawala11.myshopify.com' }
    });
    if (!shop) {
        console.error('Shop not found!');
        return;
    }
    console.log(`Checking access token: ${shop.accessToken ? 'Present' : 'Missing'}`);

    const headers = {
        'X-Shopify-Access-Token': shop.accessToken,
        'Content-Type': 'application/json'
    };

    try {
        console.log('Fetching active scopes from Shopify...');
        const response = await axios.get(`https://${shop.domain}/admin/oauth/access_scopes.json`, { headers });
        const scopes = response.data.access_scopes.map(s => s.handle).join(', ');
        console.log(`✅ Active Scopes: ${scopes}`);
    } catch (error) {
        console.error('❌ Failed to fetch access scopes:', error.response ? error.response.data : error.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
