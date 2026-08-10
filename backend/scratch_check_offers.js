const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        where: {
            OR: [
                { gemstones: { some: {} } },
                { isManualGemstonePrice: true },
                { stoneWeightCarat: { gt: 0 } },
                { stoneType: { not: null } }
            ]
        },
        include: { gemstones: true }
    });
    console.log(`Found ${products.length} products with stones/gemstones on VPS:`);
    products.forEach(p => {
        console.log(`- SKU: ${p.sku} | Title: ${p.title} | manualGemstonePrice: ${p.manualGemstonePrice} | Gemstones count: ${p.gemstones.length} | stoneType: ${p.stoneType}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
