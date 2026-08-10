const { PrismaClient } = require('@prisma/client');
const { PricingService } = require('./dist/services/pricing.service');
const { ShopifyService } = require('./dist/services/shopify.service');

const prisma = new PrismaClient();

async function main() {
    // Get the shop
    const shop = await prisma.shop.findFirst({
        where: { domain: 'daginawala11.myshopify.com' }
    });
    if (!shop) {
        console.error('Shop not found!');
        return;
    }

    console.log(`PricewaterhouseCoopers - Syncing all products with enableOffer: true to Shopify...`);

    const products = await prisma.product.findMany({
        where: { shopId: shop.id, enableOffer: true },
        include: { gemstones: true, makingGroup: true }
    });

    console.log(`Found ${products.length} products with enableOffer: true.`);

    for (const product of products) {
        console.log(`\nProcessing ${product.sku} - ${product.title}...`);
        
        // Recalculate price
        const priceResult = await PricingService.calculateBulkPrices(shop.id, [product.id]);
        if (priceResult && priceResult.length > 0) {
            const { newPrice, breakdown } = priceResult[0];
            console.log(`  Calculated Price: ₹${newPrice}`);

            // Update database
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    currentPrice: newPrice,
                    lastCalculatedPrice: newPrice,
                }
            });

            // Push to Shopify
            const shopifyService = new ShopifyService(shop.domain, shop.accessToken);
            const shopifyResult = await shopifyService.updateVariantWithBreakdown(
                product.shopifyVariantId,
                newPrice,
                breakdown
            );

            if (shopifyResult.success) {
                console.log(`  ✅ Successfully updated Shopify variant & product metafields!`);
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        lastPushedPrice: newPrice,
                        lastPushedAt: new Date()
                    }
                });
            } else {
                console.error(`  ❌ Shopify push failed: ${shopifyResult.error}`);
            }
        } else {
            console.error('  ❌ Price calculation failed.');
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
