const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany();
    const zeroPrice = products.filter(p => p.currentPrice === 0 || !p.currentPrice);
    const nonZeroPrice = products.filter(p => p.currentPrice > 0);
    console.log({
        totalProducts: products.length,
        zeroPriceCount: zeroPrice.length,
        nonZeroPriceCount: nonZeroPrice.length,
        firstFewNonZero: nonZeroPrice.slice(0, 10).map(p => ({ sku: p.sku, metal: p.metal, karat: p.karat, price: p.currentPrice }))
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
