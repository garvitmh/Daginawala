const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ShopifyService } = require('./dist/services/shopify.service');

async function main() {
    const shop = await prisma.shop.findFirst();
    const shopify = new ShopifyService(shop.domain, shop.accessToken);

    const emptyProds = await prisma.product.findMany({
        where: {
            OR: [
                { weightGrams: null },
                { weightGrams: 0 },
                { metal: null },
                { karat: null }
            ]
        },
        take: 10
    });

    console.log(`Checking Shopify data for ${emptyProds.length} empty products...`);

    for (const p of emptyProds) {
        if (!p.shopifyProductId) continue;
        try {
            const shProduct = await shopify.getProduct(p.shopifyProductId);
            const variant = shProduct.variants ? shProduct.variants.find(v => v.id.toString() === p.shopifyVariantId) || shProduct.variants[0] : null;
            console.log(`Product: ${p.title} (SKU: ${p.sku})`);
            console.log(`  Shopify Variant grams: ${variant ? variant.grams : 'N/A'}, weight: ${variant ? variant.weight : 'N/A'}, weight_unit: ${variant ? variant.weight_unit : 'N/A'}`);
            console.log(`  Shopify Tags: ${shProduct.tags}`);
        } catch (e) {
            console.error(`  Error fetching ${p.title}:`, e.message);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
