const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- ANALYSIS OF PRICE HISTORY DECREASES TO 0 ---');
    const droppedToZero = await prisma.priceHistory.findMany({
        where: {
            newPrice: 0,
            oldPrice: { gt: 0 }
        },
        include: { product: true },
        orderBy: { pushedAt: 'desc' },
        take: 20
    });
    
    console.log(`Found ${droppedToZero.length} historical drops to 0:`);
    console.log(droppedToZero.map(h => ({
        sku: h.product.sku,
        oldPrice: h.oldPrice,
        newPrice: h.newPrice,
        date: h.pushedAt
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
