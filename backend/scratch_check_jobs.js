const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- ALL JOBS ---');
    const jobs = await prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log(jobs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
