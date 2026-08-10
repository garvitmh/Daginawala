const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' }
    });
    console.log('--- AUDIT LOGS ---');
    console.log(logs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
