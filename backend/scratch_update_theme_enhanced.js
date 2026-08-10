const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

    // Read the remote updated liquid template
    const liquidPath = '/root/gemini-app/shopify-liquid-templates/gemini-price-breakdown-enhanced.liquid';
    if (!fs.existsSync(liquidPath)) {
        console.error(`Liquid template not found at ${liquidPath}!`);
        return;
    }
    const liquidContent = fs.readFileSync(liquidPath, 'utf8');
    console.log(`Read liquid template (${liquidContent.length} characters)`);

    // Fetch active theme
    console.log('Fetching themes from Shopify...');
    const headers = {
        'X-Shopify-Access-Token': shop.accessToken,
        'Content-Type': 'application/json'
    };

    const themesRes = await axios.get(`https://${shop.domain}/admin/api/2024-01/themes.json`, { headers });
    const themes = themesRes.data.themes;
    const activeTheme = themes.find(t => t.role === 'main');

    if (!activeTheme) {
        console.error('Could not find active theme!');
        return;
    }
    console.log(`Found active theme: ${activeTheme.name} (ID: ${activeTheme.id})`);

    // Upload snippet
    console.log(`Uploading snippets/gemini-price-breakdown-enhanced.liquid to active theme ${activeTheme.id}...`);
    const assetUrl = `https://${shop.domain}/admin/api/2024-01/themes/${activeTheme.id}/assets.json`;
    const assetPayload = {
        asset: {
            key: 'snippets/gemini-price-breakdown-enhanced.liquid',
            value: liquidContent
        }
    };

    const uploadRes = await axios.put(assetUrl, assetPayload, { headers });
    if (uploadRes.data && uploadRes.data.asset) {
        console.log(`✅ Successfully updated snippets/gemini-price-breakdown-enhanced.liquid on live Shopify theme!`);
    } else {
        console.error(`❌ Asset upload failed:`, uploadRes.data);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
