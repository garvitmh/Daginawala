const { PrismaClient } = require('@prisma/client');
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

    // Add gold 18K rate: 6000 * 18/22 = 4909.09
    const ratePerGram = Math.round(6000 * 18 / 22); // 4909

    // Update or create rate
    const existing = await prisma.metalRate.findFirst({
        where: { shopId: shop.id, metal: 'gold', karat: 18 }
    });

    let rate;
    if (existing) {
        rate = await prisma.metalRate.update({
            where: { id: existing.id },
            data: { ratePerGram }
        });
        console.log(`Updated Gold 18K rate: ${rate.ratePerGram}/g`);
    } else {
        rate = await prisma.metalRate.create({
            data: {
                shopId: shop.id,
                metal: 'gold',
                karat: 18,
                ratePerGram,
                rateSource: 'manual',
                reason: 'Added automatically to restore 18K products'
            }
        });
        console.log(`Created Gold 18K rate: ${rate.ratePerGram}/g`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
