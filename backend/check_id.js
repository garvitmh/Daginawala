const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const product = await prisma.product.findFirst({ where: { sku: '0043-MO.9200' } });
    console.log('Shopify Variant ID in DB:', product ? product.shopifyVariantId : 'Not Found');
}
main().catch(console.error).finally(() => prisma.$disconnect());
