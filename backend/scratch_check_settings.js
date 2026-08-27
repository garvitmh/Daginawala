const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const shops = await prisma.shop.findMany({
        include: { settings: true }
    });
    console.log('Shops and Settings:', JSON.stringify(shops, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
