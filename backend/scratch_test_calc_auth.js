const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
    const user = await prisma.adminUser.findFirst();
    const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role, shop: 'daginawala11.myshopify.com' },
        process.env.JWT_SECRET || 'your_jwt_secret_fallback_here',
        { expiresIn: '7d' }
    );

    const payload = {
        weightGrams: 30,
        metal: "gold",
        karat: "18",
        makingChargeType: "per_gram",
        makingChargeValue: 1500,
        gemstones: []
    };

    try {
        console.log('Sending payload:', payload);
        const res = await axios.post('http://localhost:3000/api/products/calculate-price', payload, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Response status:', res.status);
        console.log('Breakdown result:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
