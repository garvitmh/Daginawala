const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rates = await prisma.metalRate.findMany();
    console.log('--- METAL RATES ---');
    console.log(rates);

    const enamel = await prisma.enamelRate.findMany();
    console.log('--- ENAMEL RATES ---');
    console.log(enamel);

    const settings = await prisma.shopSettings.findMany();
    console.log('--- SETTINGS ---');
    console.log(settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
