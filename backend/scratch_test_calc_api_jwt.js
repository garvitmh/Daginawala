const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
    const payload = {
        weightGrams: 30,
        metal: "gold",
        karat: "18",
        makingChargeType: "per_gram",
        makingChargeValue: 1500,
        gemstones: []
    };

    const token = jwt.sign(
        { shop: 'daginawala11.myshopify.com' },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    try {
        console.log('Sending payload:', payload);
        const res = await axios.post('http://localhost:3000/api/products/calculate-price', payload, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Response status:', res.status);
        console.log('Response data:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

test();
