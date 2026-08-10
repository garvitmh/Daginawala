const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- HISTORICAL PRICE HISTORY (NON-ZERO NEW PRICES) ---');
    const history = await prisma.priceHistory.findMany({
        where: {
            newPrice: { gt: 0 }
        },
        include: { product: true },
        orderBy: { pushedAt: 'desc' },
        take: 30
    });
    console.log(history.map(h => ({
        sku: h.product.sku,
        oldPrice: h.oldPrice,
        newPrice: h.newPrice,
        date: h.pushedAt
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
