const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { ShopifyService } = require('./dist/services/shopify.service');
const serverSimple = require('./dist/server-simple');

async function runTest() {
    console.log('============= STARTING JEWELRY FIELDS TEST =============');
    
    // 1. Fetch a shop to associate the product with
    const shop = await prisma.shop.findFirst();
    if (!shop) {
        console.error('❌ Error: No shop found in the database. Please run the app or a seed script first.');
        process.exit(1);
    }
    console.log(`✓ Associated with shop: ${shop.domain} (${shop.id})`);

    const testVariantId = 'gid://shopify/ProductVariant/test-jewelry-fields-unique-999';
    const testSku = 'TEST-JEWELRY-FIELDS-999';

    try {
        // Cleanup if any existing test variant
        await prisma.product.deleteMany({
            where: { shopifyVariantId: testVariantId }
        });

        // 2. Insert product with the 11 new premium jewelry fields
        console.log('\n--- 1. Testing SQLite Database Insertion ---');
        const createdProduct = await prisma.product.create({
            data: {
                shopId: shop.id,
                shopifyProductId: 'gid://shopify/Product/test-parent-123',
                shopifyVariantId: testVariantId,
                sku: testSku,
                title: 'Test Premium Ring with Pearls & Diamonds',
                status: 'active',
                weightGrams: 4.8,
                metal: 'gold',
                karat: 18,
                // The 11 new fields
                huid: 'HUID-TEST-ABC-123',
                diamondCertified: true,
                diamondLab: 'GIA',
                diamondCertificateId: 'GIA-CERT-987654',
                pearlType: 'South Sea Pearls',
                pearlPieces: 8,
                pearlWeight: 2.45,
                pearlQuality: 'AAAA+',
                ringSize: '15.5',
                bangleSize: '2.4',
                jewelryLength: '18 inches'
            }
        });

        console.log('✓ Product inserted successfully in database.');

        // 3. Query product back and assert all fields are exactly correct
        console.log('\n--- 2. Testing SQLite Query & Retrievals ---');
        const retrieved = await prisma.product.findUnique({
            where: { shopifyVariantId: testVariantId }
        });

        const assertions = [
            { field: 'huid', expected: 'HUID-TEST-ABC-123', actual: retrieved.huid },
            { field: 'diamondCertified', expected: true, actual: retrieved.diamondCertified },
            { field: 'diamondLab', expected: 'GIA', actual: retrieved.diamondLab },
            { field: 'diamondCertificateId', expected: 'GIA-CERT-987654', actual: retrieved.diamondCertificateId },
            { field: 'pearlType', expected: 'South Sea Pearls', actual: retrieved.pearlType },
            { field: 'pearlPieces', expected: 8, actual: retrieved.pearlPieces },
            { field: 'pearlWeight', expected: 2.45, actual: retrieved.pearlWeight },
            { field: 'pearlQuality', expected: 'AAAA+', actual: retrieved.pearlQuality },
            { field: 'ringSize', expected: '15.5', actual: retrieved.ringSize },
            { field: 'bangleSize', expected: '2.4', actual: retrieved.bangleSize },
            { field: 'jewelryLength', expected: '18 inches', actual: retrieved.jewelryLength }
        ];

        let failedCount = 0;
        assertions.forEach(({ field, expected, actual }) => {
            if (expected === actual) {
                console.log(`  ✓ Field "${field}" matches: "${actual}"`);
            } else {
                console.error(`  ❌ Assertion Failed: Field "${field}" expected "${expected}" but got "${actual}"`);
                failedCount++;
            }
        });

        if (failedCount > 0) {
            throw new Error(`${failedCount} database assertions failed.`);
        }
        console.log('✓ All 11 new database fields retrieved successfully and match perfectly!');

        // 4. Assert template columns definitions are present
        console.log('\n--- 3. Testing Server Template Column Definitions ---');
        const expectedCols = [
            'HUID', 'Diamond Certified', 'Diamond Lab', 'Diamond Certificate ID', 
            'Pearl Type', 'Pearl Pieces', 'Pearl Weight (ct)', 'Pearl Quality', 
            'Ring Size', 'Bangle Size', 'Jewelry Length'
        ];

        // We can inspect server-simple's template columns
        // Since we can't easily require express app const, let's read the file directly or just trust our replace.
        // Wait, let's check if the module exports or has them defined. Since it's inside server-simple.js, 
        // we can read server-simple.js as text and check!
        const fs = require('fs');
        const serverSimpleContent = fs.readFileSync(path.resolve(__dirname, './dist/server-simple.js'), 'utf-8');
        
        let templateFailed = false;
        expectedCols.forEach(col => {
            if (serverSimpleContent.includes(`'${col}'`) || serverSimpleContent.includes(`"${col}"`)) {
                console.log(`  ✓ Column "${col}" is defined in server-simple.js`);
            } else {
                console.error(`  ❌ Column "${col}" is missing from server-simple.js`);
                templateFailed = true;
            }
        });

        if (templateFailed) {
            throw new Error('Template columns verification failed.');
        }

        // 5. Test Shopify Metafields Generation Payload
        console.log('\n--- 4. Testing Shopify Metafield Generation Payload ---');
        
        // Mock axios to intercept graphql requests
        const axios = require('axios');
        const originalPost = axios.post;
        
        let interceptedPayload = null;
        axios.post = async (url, data, config) => {
            if (url.includes('graphql.json') && data.query && data.query.includes('metafieldsSet')) {
                interceptedPayload = data.variables;
                return {
                    data: {
                        data: {
                            metafieldsSet: {
                                metafields: [{ id: 'metafield-id-123', key: 'huid' }],
                                userErrors: []
                            }
                        }
                    }
                };
            }
            // Fallback
            return { data: {} };
        };

        // Mock axios.put for variant rest price update
        axios.put = async (url, data, config) => {
            return {
                data: {
                    variant: {
                        id: 999,
                        price: "10000.00"
                    }
                }
            };
        };

        const shopifyService = new ShopifyService(shop.domain, 'mock-access-token');
        const mockBreakdown = {
            metal_name: 'Gold',
            metal_rate: 600000,
            metal_value: 2880000,
            metal_value_original: 2880000,
            wastage_pct: 2,
            wastage_amount: 57600,
            making_charges: 720000,
            making_charges_original: 720000,
            making_charge_type: 'per_gram',
            making_charge_rate: 1500,
            subtotal: 3657600,
            gst_pct: 3,
            gst_amount: 109728,
            total: 3767328,
            total_original: 3767328
        };

        console.log('  Calling updateVariantWithBreakdown()...');
        await shopifyService.updateVariantWithBreakdown(testVariantId, 37673.28, mockBreakdown);

        // Restore axios
        axios.post = originalPost;

        if (!interceptedPayload) {
            throw new Error('GraphQL metafieldsSet mutation was not called.');
        }

        console.log('  Intercepted Shopify Metafields variables:');
        console.log(JSON.stringify(interceptedPayload, null, 2));

        // Check if all our new metafields are in the variables list
        const mfMap = {};
        interceptedPayload.metafields.forEach(m => {
            if (m.namespace === 'custom') {
                mfMap[m.key] = m;
            }
        });

        const expectedMetafields = [
            { key: 'huid', value: 'HUID-TEST-ABC-123', type: 'single_line_text_field' },
            { key: 'diamond_certified', value: 'true', type: 'boolean' },
            { key: 'diamond_lab', value: 'GIA', type: 'single_line_text_field' },
            { key: 'diamond_certificate_id', value: 'GIA-CERT-987654', type: 'single_line_text_field' },
            { key: 'pearl_type', value: 'South Sea Pearls', type: 'single_line_text_field' },
            { key: 'pearl_pieces', value: '8', type: 'number_integer' },
            { key: 'pearl_weight', value: '2.45', type: 'number_decimal' },
            { key: 'pearl_quality', value: 'AAAA+', type: 'single_line_text_field' },
            { key: 'ring_size', value: '15.5', type: 'single_line_text_field' },
            { key: 'bangle_size', value: '2.4', type: 'single_line_text_field' },
            { key: 'jewelry_length', value: '18 inches', type: 'single_line_text_field' }
        ];

        let mfFailedCount = 0;
        expectedMetafields.forEach(({ key, value, type }) => {
            const actual = mfMap[key];
            if (!actual) {
                console.error(`  ❌ Intercepted Metafields Missing Key: "${key}"`);
                mfFailedCount++;
            } else if (actual.value !== value) {
                console.error(`  ❌ Metafield "${key}" value expected "${value}" but got "${actual.value}"`);
                mfFailedCount++;
            } else if (actual.type !== type) {
                console.error(`  ❌ Metafield "${key}" type expected "${type}" but got "${actual.type}"`);
                mfFailedCount++;
            } else {
                console.log(`  ✓ Metafield "${key}" matched exactly: value="${value}", type="${type}"`);
            }
        });

        if (mfFailedCount > 0) {
            throw new Error(`${mfFailedCount} Shopify metafield payload assertions failed.`);
        }
        console.log('✓ All 11 new Shopify variant metafield payloads created and formatted perfectly!');

        // 6. Cleanup DB
        await prisma.product.deleteMany({
            where: { shopifyVariantId: testVariantId }
        });
        console.log('\n✓ Cleaned up test data from SQLite.');

        console.log('\n========================================================');
        console.log('✅ ALL TESTS PASSED SUCCESSFULLY! THE IMPLEMENTATION IS 100% CORRECT!');
        console.log('========================================================');

    } catch (e) {
        console.error('\n========================================================');
        console.error('❌ TEST FAILED:');
        console.error(e.message);
        console.error(e.stack);
        console.error('========================================================');
        
        // Cleanup on failure
        try {
            await prisma.product.deleteMany({
                where: { shopifyVariantId: testVariantId }
            });
        } catch (_) {}
        
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
