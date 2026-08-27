const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({
        where: { sku: 'SONC-VBAL-43' },
        include: { gemstones: true }
    });

    console.log('Product SONC-VBAL-43:', JSON.stringify(product, null, 2));

    const emptyProducts = await prisma.product.findMany({
        where: {
            OR: [
                { weightGrams: null },
                { weightGrams: 0 },
                { metal: null },
                { metal: '' },
                { karat: null }
            ]
        },
        select: {
            id: true,
            sku: true,
            title: true,
            metal: true,
            karat: true,
            weightGrams: true,
            currentPrice: true
        }
    });

    console.log(`Total products with missing metal/weight/karat: ${emptyProducts.length}`);
    console.log('List:', JSON.stringify(emptyProducts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
