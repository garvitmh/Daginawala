const { PrismaClient } = require('@prisma/client');
const { PricingService } = require('./dist/services/pricing.service');
const { ShopifyService } = require('./dist/services/shopify.service');

const prisma = new PrismaClient();

async function main() {
    // 1. Get the shop
    const shop = await prisma.shop.findFirst({
        where: { domain: 'daginawala11.myshopify.com' }
    });
    if (!shop) {
        console.error('Shop not found!');
        return;
    }

    // 2. Find MINA MOSSONITE RING 18K 0043-MO.9200
    const product = await prisma.product.findFirst({
        where: { sku: '0043-MO.9200' }
    });
    if (!product) {
        console.error('Product 0043-MO.9200 not found!');
        return;
    }

    console.log(`Setting up demo gemstones for: ${product.title} (${product.sku})`);

    // Clean up existing gemstones first to start fresh
    await prisma.productGemstone.deleteMany({
        where: { productId: product.id }
    });

    // Create 2 gemstones: Moissanite and Blue Sapphire
    await prisma.productGemstone.create({
        data: {
            productId: product.id,
            gemstoneType: 'Moissanite',
            gemstoneWeight: 1.5,
            gemstonePieces: 1,
            pricePerCarat: 6000,
            totalPrice: 9000,
            isCustom: true,
            unitType: 'carat'
        }
    });

    await prisma.productGemstone.create({
        data: {
            productId: product.id,
            gemstoneType: 'Blue Sapphire',
            gemstoneWeight: 2.0,
            gemstonePieces: 2,
            pricePerPiece: 4500,
            totalPrice: 9000,
            isCustom: true,
            unitType: 'piece'
        }
    });

    // Set enableOffer to true
    await prisma.product.update({
        where: { id: product.id },
        data: { enableOffer: true }
    });

    console.log('✅ Gemstones created successfully. Triggering price recalculation and Shopify sync...');

    // Recalculate price
    const priceResult = await PricingService.calculateBulkPrices(shop.id, [product.id]);
    if (priceResult && priceResult.length > 0) {
        const { newPrice, breakdown } = priceResult[0];
        console.log(`  Calculated New Price: ₹${newPrice}`);

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

main().catch(console.error).finally(() => prisma.$disconnect());
