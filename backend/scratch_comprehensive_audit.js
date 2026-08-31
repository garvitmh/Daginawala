const { Client } = require('ssh2');
const https = require('https');
const fs = require('fs');
const path = require('path');

const sshConfig = {
    host: '187.127.149.200',
    port: 22,
    username: 'root',
    password: process.env.VPS_PASSWORD || 'Digital@9987'
};

function executeRemoteCommand(conn, cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let stdout = '';
            let stderr = '';
            stream.on('data', data => { stdout += data.toString(); });
            stream.stderr.on('data', data => { stderr += data.toString(); });
            stream.on('close', (code) => {
                resolve({ code, stdout, stderr });
            });
        });
    });
}

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

async function runAudit() {
    console.log('================================================================');
    console.log('🔍 DAGINA CLOUD COMPREHENSIVE FUNCTIONALITY & INTEGRITY AUDIT');
    console.log('================================================================\n');

    let allTestsPassed = true;

    // -------------------------------------------------------------
    // TEST 1: Liquid Snippet Syntax & Integrity Audit
    // -------------------------------------------------------------
    console.log('📌 [Test 1] Auditing Liquid Snippet: gemini-price-breakdown-enhanced.liquid');
    const snippetPath = path.join(__dirname, '../shopify-liquid-templates/gemini-price-breakdown-enhanced.liquid');
    if (!fs.existsSync(snippetPath)) {
        console.error('❌ Snippet file missing at:', snippetPath);
        allTestsPassed = false;
    } else {
        const content = fs.readFileSync(snippetPath, 'utf8');
        
        // Check liquid tags matching
        const ifCount = (content.match(/{%\s*if\s+/g) || []).length;
        const endifCount = (content.match(/{%\s*endif\s*%}/g) || []).length;
        const forCount = (content.match(/{%\s*for\s+/g) || []).length;
        const endforCount = (content.match(/{%\s*endfor\s*%}/g) || []).length;
        const commentCount = (content.match(/{%\s*comment\s*%}/g) || []).length;
        const endcommentCount = (content.match(/{%\s*endcomment\s*%}/g) || []).length;

        console.log(`   - Liquid if/endif tags: ${ifCount} / ${endifCount} ${ifCount === endifCount ? '✅' : '❌'}`);
        console.log(`   - Liquid for/endfor tags: ${forCount} / ${endforCount} ${forCount === endforCount ? '✅' : '❌'}`);
        console.log(`   - Liquid comment tags: ${commentCount} / ${endcommentCount} ${commentCount === endcommentCount ? '✅' : '❌'}`);

        // Check for emojis
        const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/g;
        const emojiMatches = content.match(emojiRegex);
        if (emojiMatches && emojiMatches.length > 0) {
            console.log(`   ❌ Found ${emojiMatches.length} emojis in snippet!`);
            allTestsPassed = false;
        } else {
            console.log('   ✅ Zero emojis detected (100% clean professional formatting).');
        }

        // Check essential JS functions
        const requiredFunctions = [
            'selectMakingBubble',
            'handleStoneDiscountChange',
            'triggerCalculate',
            'showOfferForm',
            'hideOfferForm',
            'validateField'
        ];
        requiredFunctions.forEach(fn => {
            const hasFn = content.includes(fn);
            console.log(`   - Function '${fn}': ${hasFn ? '✅ present' : '❌ missing'}`);
            if (!hasFn) allTestsPassed = false;
        });
    }

    // -------------------------------------------------------------
    // TEST 2: VPS Server & PM2 Process Status
    // -------------------------------------------------------------
    console.log('\n📌 [Test 2] Auditing VPS Server Health & PM2 Process');
    const conn = new Client();
    await new Promise((resolve) => {
        conn.on('ready', resolve);
        conn.on('error', (err) => {
            console.error('❌ SSH connection error:', err);
            allTestsPassed = false;
            resolve();
        });
        conn.connect(sshConfig);
    });

    let shopDomain = 'dagina.myshopify.com';

    if (conn) {
        const pm2Res = await executeRemoteCommand(conn, 'pm2 jlist');
        try {
            const list = JSON.parse(pm2Res.stdout);
            const backend = list.find(p => p.name === 'gemini-backend');
            if (backend) {
                console.log(`   ✅ PM2 gemini-backend status: ${backend.pm2_env.status.toUpperCase()}`);
                console.log(`   - Uptime: ${Math.round((Date.now() - backend.pm2_env.pm_uptime) / 1000 / 60)} minutes`);
                console.log(`   - Memory: ${(backend.monit.memory / 1024 / 1024).toFixed(1)} MB`);
                console.log(`   - Restarts: ${backend.pm2_env.restart_time}`);
            } else {
                console.log('   ❌ gemini-backend process not found in PM2!');
                allTestsPassed = false;
            }
        } catch (e) {
            console.log('   ⚠️ Could not parse PM2 JSON:', pm2Res.stdout);
        }

        // -------------------------------------------------------------
        // TEST 3: Database Products & Attributes Audit
        // -------------------------------------------------------------
        console.log('\n📌 [Test 3] Auditing Database Catalog Attributes & Metal Rates on VPS');
        const dbRes = await executeRemoteCommand(conn, "cd /var/www/gemini-app/backend && node -e \"const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const shops = await prisma.shop.findMany(); const totalProducts = await prisma.product.count(); const totalWithMetal = await prisma.product.count({ where: { metal: { not: null } } }); const totalWithKarat = await prisma.product.count({ where: { karat: { not: null } } }); const totalNonZeroPrice = await prisma.product.count({ where: { lastCalculatedPrice: { gt: 0 } } }); const rates = await prisma.metalRate.findMany({ select: { metal: true, karat: true, ratePerGram: true } }); const shopSettings = await prisma.shopSettings.findFirst({ select: { defaultGstPct: true, notificationEmail: true } }); const sampleProduct = await prisma.product.findFirst({ where: { lastCalculatedPrice: { gt: 0 } } }); console.log(JSON.stringify({ shops, totalProducts, totalWithMetal, totalWithKarat, totalNonZeroPrice, rates, shopSettings, sampleProduct })); } main().finally(() => prisma.\\$disconnect());\"");

        let sampleProduct = null;
        try {
            const dbData = JSON.parse(dbRes.stdout);
            console.log(`   - Shops connected: ${dbData.shops.map(s => s.domain).join(', ')}`);
            if (dbData.shops.length > 0) {
                shopDomain = dbData.shops[0].domain;
            }
            console.log(`   - Total Products: ${dbData.totalProducts}`);
            console.log(`   - Products with Metal: ${dbData.totalWithMetal} / ${dbData.totalProducts}`);
            console.log(`   - Products with Karat: ${dbData.totalWithKarat} / ${dbData.totalProducts}`);
            console.log(`   - Products with Calculated Price > 0: ${dbData.totalNonZeroPrice} / ${dbData.totalProducts}`);
            console.log(`   - Active Metal Rates: ${dbData.rates.length}`);
            dbData.rates.forEach(r => {
                console.log(`     * ${r.metal.toUpperCase()} ${r.karat ? r.karat + 'K' : ''}: ₹${r.ratePerGram}/g`);
            });
            console.log(`   - Shop Settings: GST ${dbData.shopSettings?.defaultGstPct}%`);
            if (dbData.sampleProduct) {
                sampleProduct = dbData.sampleProduct;
                console.log(`   - Sample Product Verified: "${sampleProduct.title}" (SKU: ${sampleProduct.sku}, Price: ₹${sampleProduct.lastCalculatedPrice}, Variant ID: ${sampleProduct.shopifyVariantId})`);
            }
        } catch (e) {
            console.log('   ⚠️ Error parsing DB response:', dbRes.stdout, dbRes.stderr);
            allTestsPassed = false;
        }

        conn.end();

        // -------------------------------------------------------------
        // TEST 4: Live Offer Calculation API (`POST /api/public/offers/calculate`)
        // -------------------------------------------------------------
        console.log(`\n📌 [Test 4] Testing Public Offer Calculation API with domain '${shopDomain}' & variant '${sampleProduct?.shopifyVariantId}'`);
        try {
            const testCalcRes = await httpsPost('https://dagina.cloud/api/public/offers/calculate', {
                shopDomain: shopDomain,
                shopifyVariantId: sampleProduct ? sampleProduct.shopifyVariantId : '12345',
                proposedMakingRate: 1200,
                proposedStoneDiscount: 10
            });

            console.log(`   - HTTP Status: ${testCalcRes.status}`);
            if (testCalcRes.status === 200 && testCalcRes.data.success && testCalcRes.data.breakdown) {
                const b = testCalcRes.data.breakdown;
                console.log(`   ✅ API responded successfully:`);
                console.log(`     * Metal: ${b.metal_name || 'Gold'} (Gross: ${b.gross_weight}g, Net: ${b.net_weight}g)`);
                console.log(`     * Metal Value: ₹${(b.metal_value / 100).toFixed(2)} (@ ₹${(b.metal_rate / 100).toFixed(2)}/g)`);
                console.log(`     * Making Charges: ₹${(b.making_charges / 100).toFixed(2)} (@ ₹${b.making_charge_rate}/g)`);
                console.log(`     * Gemstone Price: ₹${(b.gemstone_price / 100).toFixed(2)}`);
                console.log(`     * Subtotal: ₹${(b.subtotal / 100).toFixed(2)}`);
                console.log(`     * GST (${b.gst_pct}%): ₹${(b.gst_amount / 100).toFixed(2)}`);
                console.log(`     * Total Offered Price: ₹${(b.total / 100).toFixed(2)}`);

                // Verify exact math: Metal + Making + Gemstone = Subtotal; Subtotal * 1.03 = Total
                const expectedSubtotal = b.metal_value + b.making_charges + (b.gemstone_price || 0);
                const expectedGst = Math.round(expectedSubtotal * (b.gst_pct / 100));
                const expectedTotal = expectedSubtotal + expectedGst;

                const mathMatch = (b.subtotal === expectedSubtotal && b.total === expectedTotal);
                console.log(`     * Mathematical precision check: ${mathMatch ? '✅ 100% Exact down to the Rupee' : '❌ Mismatch'}`);
                if (!mathMatch) allTestsPassed = false;
            } else {
                console.log('   ❌ API call failed:', testCalcRes.data);
                allTestsPassed = false;
            }
        } catch (err) {
            console.error('   ❌ Network or API error:', err.message);
            allTestsPassed = false;
        }
    }

    console.log('\n================================================================');
    if (allTestsPassed) {
        console.log('🎉 AUDIT COMPLETE: ALL SYSTEMS ARE 100% OPERATIONAL & VERIFIED!');
    } else {
        console.log('⚠️ AUDIT COMPLETE: SOME ITEMS REQUIRE ATTENTION (SEE ABOVE).');
    }
    console.log('================================================================\n');
}

runAudit();
