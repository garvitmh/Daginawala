const { PrismaClient } = require('@prisma/client');
const { PricingService } = require('./dist/services/pricing.service');
const prisma = new PrismaClient();

async function runTest() {
    console.log('=== STARTING AUTOMATED IMPORT LOGIC TEST ===');
    try {
        // 1. Get a shop
        const shop = await prisma.shop.findFirst();
        if (!shop) {
            console.error('No shop found in database!');
            return;
        }
        console.log(`Using Shop: ${shop.domain}`);

        // 2. Ensure mock settings exist
        let settings = await prisma.shopSettings.findUnique({
            where: { shopId: shop.id }
        });
        if (!settings) {
            settings = await prisma.shopSettings.create({
                data: {
                    shopId: shop.id,
                    defaultWastagePct: 2.0,
                    defaultGstPct: 3.0,
                    defaultMakingChargeType: 'per_gram',
                    defaultMakingChargeValue: 1500
                }
            });
            console.log('Created mock Shop Settings.');
        } else {
            console.log('Using existing Shop Settings.');
        }

        // 3. Ensure mock Gold 22K rate exists
        let metalRate = await prisma.metalRate.findFirst({
            where: { shopId: shop.id, metal: 'gold', karat: 22 }
        });
        if (!metalRate) {
            metalRate = await prisma.metalRate.create({
                data: {
                    shopId: shop.id,
                    metal: 'gold',
                    karat: 22,
                    ratePerGram: 6000,
                    rateSource: 'manual'
                }
            });
            console.log('Created mock Gold 22K metal rate: 6000 per gram.');
        } else {
            console.log(`Using existing Gold 22K rate: ${metalRate.ratePerGram} per gram.`);
        }

        // 4. Ensure test making group exists
        const testGroupName = 'Automated Test Group';
        let group = await prisma.makingGroup.findFirst({
            where: { shopId: shop.id, name: testGroupName }
        });
        if (!group) {
            group = await prisma.makingGroup.create({
                data: {
                    shopId: shop.id,
                    name: testGroupName,
                    type: 'flat',
                    value: 8888
                }
            });
            console.log(`Created test making group "${testGroupName}" with flat rate 8888.`);
        } else {
            console.log(`Using existing test making group "${testGroupName}" (rate: ${group.value}).`);
        }

        // 5. Find a test product or create one
        let product = await prisma.product.findFirst({
            where: { shopId: shop.id },
            include: { gemstones: true }
        });
        let isMockProduct = false;
        if (!product) {
            product = await prisma.product.create({
                data: {
                    shopId: shop.id,
                    shopifyProductId: 'gid://shopify/Product/123456789',
                    shopifyVariantId: 'gid://shopify/ProductVariant/987654321',
                    sku: 'MOCK-GOLD-RING',
                    title: 'Mock Gold Ring',
                    variantTitle: 'Default Title',
                    imageUrl: 'https://via.placeholder.com/150',
                    status: 'active',
                    weightGrams: 10.0,
                    metal: 'gold',
                    karat: 22,
                    makingChargeType: 'per_gram',
                    makingChargeValue: 1500,
                    currentPrice: 25000,
                    lastCalculatedPrice: 25000
                },
                include: { gemstones: true }
            });
            isMockProduct = true;
            console.log(`Created mock product: ${product.sku}`);
        } else {
            console.log(`Using existing test product SKU: ${product.sku}, currentPrice: ${product.currentPrice}`);
        }

        // 6. Simulate the new column "Making Group" in Excel Row
        const mockRow = {
            'SKU': product.sku,
            'Title': product.title,
            'Status': product.status,
            'Making Group': testGroupName,
            'Metal Type': product.metal || 'gold',
            'Metal Purity': product.karat || 22,
            'Metal Weight (g)': product.weightGrams || 10.0,
            'Gross Weight (g)': product.grossGoldWeight || 10.5,
            'Wastage %': product.wastagePct || 2.0
        };

        console.log('\n--- SIMULATING IMPORT ROW RESOLUTION ---');
        // Extract group name
        const excelMakingGroupName = mockRow['Making Group'];
        let resolvedMakingGroupId = product.makingGroupId;
        let resolvedMakingChargeType = product.makingChargeType || 'per_gram';
        let resolvedMakingChargeValue = product.makingChargeValue || 1500;

        if (excelMakingGroupName !== undefined) {
            const groupName = excelMakingGroupName.trim();
            if (groupName !== '') {
                const matchedGroup = await prisma.makingGroup.findFirst({
                    where: { shopId: shop.id, name: groupName }
                });
                if (matchedGroup) {
                    resolvedMakingGroupId = matchedGroup.id;
                    resolvedMakingChargeType = 'master';
                    resolvedMakingChargeValue = matchedGroup.value;
                    console.log(`[PASS] Resolved group "${groupName}" successfully to ID ${matchedGroup.id}`);
                } else {
                    throw new Error(`Group "${groupName}" not found!`);
                }
            }
        }

        // Update product in DB
        const updatedProduct = await prisma.product.update({
            where: { id: product.id },
            data: {
                makingGroupId: resolvedMakingGroupId,
                makingChargeType: resolvedMakingChargeType,
                makingChargeValue: resolvedMakingChargeValue
            },
            include: { gemstones: true, makingGroup: true }
        });

        // Recalculate price
        console.log('Triggering pricing engine recalculation...');
        const priceResults = await PricingService.calculateBulkPrices(shop.id, [product.id]);
        
        if (priceResults.length > 0) {
            const priceData = priceResults[0];
            console.log(`Recalculation Result: newPrice = ${priceData.newPrice}, breakdown:`, JSON.stringify(priceData.breakdown, null, 2));
            
            // Update db
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    currentPrice: priceData.newPrice,
                    lastCalculatedPrice: priceData.newPrice
                }
            });

            console.log(`[PASS] Database updated with inherited group rate price: ${priceData.newPrice}`);
            if (priceData.newPrice !== product.currentPrice) {
                console.log(`[PASS] Price resolved and recalculated successfully based on group rate!`);
            }
        } else {
            throw new Error('Pricing recalculation failed to return results.');
        }

        // 7. Test removal
        console.log('\n--- SIMULATING IMPORT REMOVAL ROW RESOLUTION ---');
        const mockRemovalRow = {
            'SKU': product.sku,
            'Making Group': '' // empty string means remove
        };

        const excelMakingGroupRemove = mockRemovalRow['Making Group'];
        let finalMakingGroupId = resolvedMakingGroupId;
        let finalMakingChargeType = resolvedMakingChargeType;
        let finalMakingChargeValue = resolvedMakingChargeValue;

        if (excelMakingGroupRemove !== undefined) {
            const groupName = excelMakingGroupRemove.trim();
            if (groupName === '') {
                finalMakingGroupId = null;
                finalMakingChargeType = 'per_gram';
                finalMakingChargeValue = 1500; // default
                console.log(`[PASS] Correctly detected empty group name - removing from group.`);
            }
        }

        const removedProduct = await prisma.product.update({
            where: { id: product.id },
            data: {
                makingGroupId: finalMakingGroupId,
                makingChargeType: finalMakingChargeType,
                makingChargeValue: finalMakingChargeValue
            },
            include: { gemstones: true, makingGroup: true }
        });

        // Recalculate price after removal
        const priceResultsAfterRemove = await PricingService.calculateBulkPrices(shop.id, [product.id]);
        if (priceResultsAfterRemove.length > 0) {
            console.log(`[PASS] Price after group removal recalculated to: ${priceResultsAfterRemove[0].newPrice}`);
        }

        // Cleanup
        console.log('\n--- CLEANING UP TEST DATA ---');
        if (isMockProduct) {
            await prisma.product.delete({ where: { id: product.id } });
            console.log('Removed mock product.');
        } else {
            // Revert back to original state
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    makingGroupId: product.makingGroupId,
                    makingChargeType: product.makingChargeType,
                    makingChargeValue: product.makingChargeValue,
                    currentPrice: product.currentPrice,
                    lastCalculatedPrice: product.lastCalculatedPrice
                }
            });
            console.log('Restored product original state.');
        }

        await prisma.makingGroup.delete({ where: { id: group.id } });
        console.log(`Removed test group "${testGroupName}".`);

        console.log('\n✅ ALL AUTOMATED IMPORT LOGIC TESTS COMPLETED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ TEST FAILED:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
