const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- PRODUCT STATS ---');
    const total = await prisma.product.count();
    const zeroWeight = await prisma.product.count({ where: { weightGrams: 0 } });
    const nullMetal = await prisma.product.count({ where: { metal: null } });
    const hasWeight = await prisma.product.count({ where: { weightGrams: { gt: 0 } } });
    console.log({ total, zeroWeight, nullMetal, hasWeight });

    console.log('\n--- LATEST PRICE HISTORY ---');
    const history = await prisma.priceHistory.findMany({
        take: 10,
        include: { product: true },
        orderBy: { pushedAt: 'desc' }
    });
    console.log(history.map(h => ({
        sku: h.product.sku,
        oldPrice: h.oldPrice,
        newPrice: h.newPrice,
        date: h.pushedAt
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
