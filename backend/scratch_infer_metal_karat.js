const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany();
    let updatedCount = 0;

    for (const p of products) {
        let newMetal = p.metal;
        let newKarat = p.karat;
        const titleUpper = (p.title || '').toUpperCase();

        if (!newKarat) {
            if (titleUpper.includes('24K')) newKarat = 24;
            else if (titleUpper.includes('22K')) newKarat = 22;
            else if (titleUpper.includes('18K')) newKarat = 18;
            else if (titleUpper.includes('14K')) newKarat = 14;
            else if (titleUpper.includes('925') || titleUpper.includes('SILVER')) {
                newKarat = 925;
                newMetal = 'silver';
            }
        }

        if (!newMetal) {
            if (newKarat === 24 || newKarat === 22 || newKarat === 18 || newKarat === 14 || titleUpper.includes('GOLD')) {
                newMetal = 'gold';
            } else if (titleUpper.includes('SILVER')) {
                newMetal = 'silver';
            } else if (titleUpper.includes('PLATINUM')) {
                newMetal = 'platinum';
            }
        }

        if (newMetal !== p.metal || newKarat !== p.karat) {
            console.log(`Inferring for [${p.sku}] ${p.title} -> Metal: ${newMetal}, Karat: ${newKarat}`);
            await prisma.product.update({
                where: { id: p.id },
                data: { metal: newMetal, karat: newKarat }
            });
            updatedCount++;
        }
    }

    console.log(`✅ Successfully inferred and updated metal/karat for ${updatedCount} products!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
