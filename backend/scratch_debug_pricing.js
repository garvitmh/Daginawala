const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PricingService } = require('./dist/services/pricing.service');

async function main() {
    console.log('--- Inspecting Metal Rates ---');
    const metalRates = await prisma.metalRate.findMany();
    console.log('Metal Rates in DB:', JSON.stringify(metalRates, null, 2));

    console.log('--- Inspecting Product BANGLES 18K GEF1YU ---');
    const product = await prisma.product.findFirst({
        where: { title: { contains: 'BANGLES 18K GEF1YU' } },
        include: { gemstones: true, makingGroup: true }
    }) || await prisma.product.findFirst({
        where: { sku: { contains: 'GEF1YU' } },
        include: { gemstones: true, makingGroup: true }
    });

    if (!product) {
        console.log('Product not found by title or SKU. Listing first 5 products:');
        const prods = await prisma.product.findMany({ take: 5 });
        console.log(prods.map(p => ({ id: p.id, sku: p.sku, title: p.title, metal: p.metal, karat: p.karat, weightGrams: p.weightGrams })));
        return;
    }

    console.log('Found product:', {
        id: product.id,
        sku: product.sku,
        title: product.title,
        metal: product.metal,
        karat: product.karat,
        weightGrams: product.weightGrams,
        makingChargeType: product.makingChargeType,
        makingChargeValue: product.makingChargeValue,
        makingGroupId: product.makingGroupId,
        wastagePct: product.wastagePct,
        gstPct: product.gstPct,
        currentPrice: product.currentPrice
    });

    console.log('--- Running PricingService.calculateBulkPrices ---');
    const calc = await PricingService.calculateBulkPrices(product.shopId, [product.id]);
    console.log('Calculation Result:', JSON.stringify(calc, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
