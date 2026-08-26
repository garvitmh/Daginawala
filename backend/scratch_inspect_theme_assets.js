const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to VPS database to fetch Shopify credentials...');
    const shop = await prisma.shop.findFirst({
        where: { domain: 'daginawala11.myshopify.com' }
    });
    if (!shop) {
        console.error('Shop not found!');
        return;
    }
    console.log(`Found shop: ${shop.domain}`);

    const headers = {
        'X-Shopify-Access-Token': shop.accessToken,
        'Content-Type': 'application/json'
    };

    console.log('Fetching themes from Shopify...');
    const themesRes = await axios.get(`https://${shop.domain}/admin/api/2024-01/themes.json`, { headers });
    const activeTheme = themesRes.data.themes.find(t => t.role === 'main');

    if (!activeTheme) {
        console.error('Could not find active theme!');
        return;
    }
    console.log(`Active theme: ${activeTheme.name} (ID: ${activeTheme.id})`);

    console.log('Fetching all assets from active theme...');
    const assetsRes = await axios.get(`https://${shop.domain}/admin/api/2024-01/themes/${activeTheme.id}/assets.json`, { headers });
    const assets = assetsRes.data.assets;

    console.log(`Found ${assets.length} assets. Listing key files:`);
    const sections = assets.filter(a => a.key.startsWith('sections/'));
    const templates = assets.filter(a => a.key.startsWith('templates/'));
    const layout = assets.filter(a => a.key.startsWith('layout/'));
    const config = assets.filter(a => a.key.startsWith('config/'));
    const snippets = assets.filter(a => a.key.startsWith('snippets/'));

    console.log('\n--- LAYOUTS ---');
    layout.forEach(a => console.log(a.key));

    console.log('\n--- CONFIG ---');
    config.forEach(a => console.log(a.key));

    console.log('\n--- TEMPLATES ---');
    templates.forEach(a => console.log(a.key));

    console.log('\n--- SECTIONS (First 30) ---');
    sections.slice(0, 30).forEach(a => console.log(a.key));

    console.log('\n--- SNIPPETS (First 30) ---');
    snippets.slice(0, 30).forEach(a => console.log(a.key));
}

main().catch(console.error).finally(() => prisma.$disconnect());
