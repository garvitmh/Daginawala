const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function testThemeAccess() {
    const shop = await prisma.shop.findFirst();
    console.log('Testing theme access for shop:', shop.domain);
    console.log('Scopes in DB:', shop.scope);

    try {
        const response = await axios.get(`https://${shop.domain}/admin/api/2024-01/themes.json`, {
            headers: {
                'X-Shopify-Access-Token': shop.accessToken,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Themes API access SUCCESSFUL!');
        console.log('Themes found:', response.data.themes.map(t => ({ id: t.id, name: t.name, role: t.role })));
    } catch (error) {
        console.error('❌ Themes API access FAILED:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testThemeAccess().catch(console.error).finally(() => prisma.$disconnect());
