const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const totalHistory = await prisma.priceHistory.count();
    const zeroNew = await prisma.priceHistory.count({ where: { newPrice: 0 } });
    const gtZeroNew = await prisma.priceHistory.count({ where: { newPrice: { gt: 0 } } });
    console.log({ totalHistory, zeroNew, gtZeroNew });
}

main().catch(console.error).finally(() => prisma.$disconnect());
