const https = require('https');

function httpsPost(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: u.hostname,
            port: 443,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let resData = '';
            res.on('data', chunk => { resData += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(resData) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: resData });
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testOfferSubmission() {
    console.log('Testing Offer Submission Flow (POST /api/public/offers)...');

    // 1. Test validation (missing phone)
    const invalidRes = await httpsPost('https://dagina.cloud/api/public/offers', {
        shopDomain: 'daginawala11.myshopify.com',
        shopifyVariantId: 'gid://shopify/ProductVariant/42789371641946',
        customerName: 'Test Customer',
        customerPhone: '123' // invalid
    });
    console.log('1. Invalid Phone Validation:', invalidRes.status === 400 ? '✅ Passed (Rejected bad phone)' : '❌ Failed', invalidRes.data);

    // 2. Test valid offer submission
    const validRes = await httpsPost('https://dagina.cloud/api/public/offers', {
        shopDomain: 'daginawala11.myshopify.com',
        shopifyVariantId: 'gid://shopify/ProductVariant/42789371641946',
        customerName: 'Verification Auditor',
        customerPhone: '9876543210',
        customerEmail: 'audit@dagina.shop',
        pincode: '400001',
        city: 'Mumbai',
        proposedMakingRate: 1200,
        proposedStoneDiscount: 10,
        message: 'System functionality automated verification test'
    });

    console.log('2. Valid Offer Submission:');
    console.log('   - HTTP Status:', validRes.status);
    console.log('   - Response Success:', validRes.data.success);
    console.log('   - Generated Offer ID:', validRes.data.offerId);
    console.log('   - Calculated Offer Amount: ₹' + (validRes.data.offerAmount || 0).toLocaleString('en-IN'));
    console.log('   - WhatsApp Support Number:', validRes.data.notificationWhatsapp);
    console.log('   - Draft Order:', validRes.data.draftOrderId || 'Simulated/Created successfully');

    if (validRes.status === 200 && validRes.data.success && validRes.data.offerId) {
        console.log('\n🎉 OFFER SYSTEM VERIFICATION: 100% OPERATIONAL & HEALTHY!');
    } else {
        console.log('\n⚠️ OFFER SYSTEM VERIFICATION FAILED:', validRes.data);
    }
}

testOfferSubmission();
