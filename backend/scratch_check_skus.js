const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        where: { sku: { in: ['RNG-3-10-1', 'RNG-3-10-3', 'RNG-3-10-5'] } }
    });
    console.log(products);
}

main().catch(console.error).finally(() => prisma.$disconnect());
