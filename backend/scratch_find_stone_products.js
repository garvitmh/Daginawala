const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Searching for MINA or 0043 product in the database...');
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: 'MINA' } },
          { title: { contains: '0043' } }
        ]
      },
      include: { gemstones: true }
    });

    console.log(`Found ${products.length} products:`);
    products.forEach((p, idx) => {
      console.log(`[${idx + 1}] Title: ${p.title}, SKU: ${p.sku}, Shopify ID: ${p.shopifyProductId}`);
      console.log(`    Gemstones Count: ${p.gemstones ? p.gemstones.length : 0}`);
    });

  } catch (error) {
    console.error('Error running search query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
