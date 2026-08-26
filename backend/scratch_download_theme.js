const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

    const headers = {
        'X-Shopify-Access-Token': shop.accessToken,
        'Content-Type': 'application/json'
    };

    console.log('Fetching themes...');
    const themesRes = await axios.get(`https://${shop.domain}/admin/api/2024-01/themes.json`, { headers });
    const activeTheme = themesRes.data.themes.find(t => t.role === 'main');
    if (!activeTheme) {
        console.error('Active theme not found!');
        return;
    }
    console.log(`Active theme ID: ${activeTheme.id}`);

    // List of assets we want to download
    const assetsToDownload = [
        'layout/theme.liquid',
        'sections/header.liquid',
        'sections/announcement-bar.liquid',
        'templates/index.json',
        'templates/collection.json',
        'templates/product.json'
    ];

    const outputDir = path.join(__dirname, '..', 'live-theme-backup');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const assetKey of assetsToDownload) {
        try {
            console.log(`Downloading ${assetKey}...`);
            const assetUrl = `https://${shop.domain}/admin/api/2024-01/themes/${activeTheme.id}/assets.json?asset[key]=${assetKey}`;
            const res = await axios.get(assetUrl, { headers });
            if (res.data && res.data.asset && res.data.asset.value) {
                const localPath = path.join(outputDir, assetKey.replace('/', '_'));
                fs.writeFileSync(localPath, res.data.asset.value, 'utf8');
                console.log(`✅ Saved to ${localPath}`);
            }
        } catch (err) {
            console.warn(`⚠️ Could not download ${assetKey}:`, err.response ? err.response.data : err.message);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
