const { PrismaClient } = require('@prisma/client');
const { PricingService } = require('./dist/services/pricing.service');
const { ShopifyService } = require('./dist/services/shopify.service');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('Starting restoration import from Excel...');
    
    // 1. Fetch shop and settings
    const shop = await prisma.shop.findFirst({
        where: { domain: 'daginawala11.myshopify.com' }
    });
    if (!shop) {
        console.error('Shop daginawala11.myshopify.com not found!');
        return;
    }
    console.log(`Found shop ID: ${shop.id}`);

    const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: shop.id }
    });

    // 2. Read the Excel file
    const filePath = '/root/gemini-app/backend/detailing_export_1780133251642.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Successfully parsed Excel file: ${rows.length} rows found.`);

    let successCount = 0;
    let failCount = 0;

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const SKU = row.SKU || row.sku;
        if (!SKU) {
            console.log(`[Row ${index + 1}] Skipping: SKU is missing.`);
            continue;
        }

        // Normalize row keys for robustness
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
            normalizedRow[key.trim()] = row[key];
        });

        const existingProduct = await prisma.product.findFirst({
            where: { shopId: shop.id, sku: SKU.toString() },
            include: { gemstones: true, makingGroup: true }
        });

        if (!existingProduct) {
            console.log(`[Row ${index + 1}] SKU ${SKU}: Not found in local database, skipping.`);
            continue;
        }

        console.log(`\nProcessing SKU ${SKU} (${successCount + failCount + 1}/${rows.length})...`);

        try {
            // Resolve Making Group
            let resolvedMakingGroupId = existingProduct.makingGroupId;
            let resolvedMakingChargeType = existingProduct.makingChargeType || 'per_gram';
            let resolvedMakingChargeValue = existingProduct.makingChargeValue ?? 1500;

            const groupName = normalizedRow['Making Group'];
            if (groupName !== undefined) {
                if (groupName !== '') {
                    const group = await prisma.makingGroup.findFirst({
                        where: { shopId: shop.id, name: groupName.toString().trim() }
                    });
                    if (group) {
                        resolvedMakingGroupId = group.id;
                        resolvedMakingChargeType = 'master';
                        resolvedMakingChargeValue = group.value;
                    } else {
                        console.log(`  Warning: Making Group "${groupName}" not found.`);
                    }
                } else {
                    resolvedMakingGroupId = null;
                    if (existingProduct.makingGroupId) {
                        resolvedMakingChargeType = 'per_gram';
                        resolvedMakingChargeValue = shopSettings?.defaultMakingChargeValue ?? 1500;
                    }
                }
            }

            // Making discount logic
            let makingDiscountType = existingProduct.makingDiscountType || 'none';
            let makingDiscountValue = existingProduct.makingDiscountValue ?? 0;

            const mDiscType = normalizedRow['Making Discount Type'];
            const mDiscVal = normalizedRow['Making Discount Value'] !== undefined ? parseFloat(normalizedRow['Making Discount Value']) : undefined;
            const mDiscPct = normalizedRow['Making Discount %'] !== undefined ? parseFloat(normalizedRow['Making Discount %']) : undefined;

            if (mDiscType !== undefined) {
                makingDiscountType = mDiscType.toString().toLowerCase().trim();
                if (makingDiscountType === 'none') {
                    makingDiscountValue = 0;
                } else if (makingDiscountType === 'percent' && mDiscPct !== undefined) {
                    makingDiscountValue = mDiscPct;
                } else if (mDiscVal !== undefined) {
                    makingDiscountValue = mDiscVal;
                }
            }

            // Update core product details
            const updateData = {
                status: normalizedRow['Status'] || existingProduct.status,
                metal: (normalizedRow['Metal Type'] || normalizedRow['metal'] || '').toString().toLowerCase().trim() || null,
                karat: parseInt(normalizedRow['Metal Karat'] || normalizedRow['Metal Purity'] || normalizedRow['karat'] || 0) || null,
                weightGrams: parseFloat(normalizedRow['Metal Weight Net (g)'] || normalizedRow['Metal Weight (g)'] || normalizedRow['weightGrams'] || 0),
                grossGoldWeight: parseFloat(normalizedRow['Metal Weight Gross (g)'] || normalizedRow['Gross Weight (g)'] || normalizedRow['grossGoldWeight'] || 0),
                wastagePct: parseFloat(normalizedRow['Wastage %'] || normalizedRow['wastagePct'] || 0),
                enamelColor: normalizedRow['Enamel Color'] || null,
                enamelWeightGrams: parseFloat(normalizedRow['Enamel Weight (g)'] || 0),
                enamelDiscountType: normalizedRow['Enamel Discount Type'] || 'none',
                enamelDiscountValue: parseFloat(normalizedRow['Enamel Discount Value'] || 0),
                discountType: normalizedRow['Product Discount Type'] || normalizedRow['Discount Type'] || 'none',
                discount: parseFloat(normalizedRow['Product Discount Value'] || normalizedRow['Discount Value'] || 0),
                gstPct: parseFloat(normalizedRow['GST %'] || existingProduct.gstPct || shopSettings?.defaultGstPct || 3),
                stoneWeightCarat: parseFloat(normalizedRow['Gemstone Weight (ct)'] || normalizedRow['Stone Weight (ct)'] || normalizedRow['stoneWeightCarat'] || 0),
                stonePieces: parseInt(normalizedRow['Gemstone Pieces'] || normalizedRow['Stone Pieces'] || normalizedRow['stonePieces'] || 0),
                makingChargeType: resolvedMakingChargeType,
                makingChargeValue: resolvedMakingChargeValue,
                makingDiscountType: makingDiscountType,
                makingDiscountValue: makingDiscountValue,
                makingGroupId: resolvedMakingGroupId,
                huid: normalizedRow['HUID'] !== undefined ? (normalizedRow['HUID'] ? String(normalizedRow['HUID']).trim() : null) : existingProduct.huid,
                diamondCertified: normalizedRow['Diamond Certified'] !== undefined ? (normalizedRow['Diamond Certified']?.toString().toUpperCase() === 'TRUE') : existingProduct.diamondCertified,
                diamondLab: normalizedRow['Diamond Lab'] !== undefined ? (normalizedRow['Diamond Lab'] ? String(normalizedRow['Diamond Lab']).trim() : null) : existingProduct.diamondLab,
                diamondCertificateId: normalizedRow['Diamond Certificate ID'] !== undefined ? (normalizedRow['Diamond Certificate ID'] ? String(normalizedRow['Diamond Certificate ID']).trim() : null) : existingProduct.diamondCertificateId,
                pearlType: normalizedRow['Pearl Type'] !== undefined ? (normalizedRow['Pearl Type'] ? String(normalizedRow['Pearl Type']).trim() : null) : existingProduct.pearlType,
                pearlPieces: normalizedRow['Pearl Pieces'] !== undefined ? (parseInt(normalizedRow['Pearl Pieces']) || null) : existingProduct.pearlPieces,
                pearlWeight: normalizedRow['Pearl Weight (ct)'] !== undefined ? (parseFloat(normalizedRow['Pearl Weight (ct)']) || null) : existingProduct.pearlWeight,
                pearlQuality: normalizedRow['Pearl Quality'] !== undefined ? (normalizedRow['Pearl Quality'] ? String(normalizedRow['Pearl Quality']).trim() : null) : existingProduct.pearlQuality,
                ringSize: normalizedRow['Ring Size'] !== undefined ? (normalizedRow['Ring Size'] ? String(normalizedRow['Ring Size']).trim() : null) : existingProduct.ringSize,
                bangleSize: normalizedRow['Bangle Size'] !== undefined ? (normalizedRow['Bangle Size'] ? String(normalizedRow['Bangle Size']).trim() : null) : existingProduct.bangleSize,
                jewelryLength: normalizedRow['Jewelry Length'] !== undefined ? (normalizedRow['Jewelry Length'] ? String(normalizedRow['Jewelry Length']).trim() : null) : existingProduct.jewelryLength,
                enableOffer: normalizedRow['Enable Offer'] !== undefined ? (normalizedRow['Enable Offer']?.toString().toUpperCase() === 'TRUE') : existingProduct.enableOffer,
                minOfferAmount: normalizedRow['Min Offer Amount (₹)'] !== undefined ? (parseFloat(normalizedRow['Min Offer Amount (₹)']) || null) : existingProduct.minOfferAmount,
                maxOffersPerUser: normalizedRow['Max Offers Per User'] !== undefined ? (parseInt(normalizedRow['Max Offers Per User']) || null) : existingProduct.maxOffersPerUser
            };

            await prisma.product.update({
                where: { id: existingProduct.id },
                data: updateData
            });

            // Gemstones handling
            const stonesToSave = [];
            for (let i = 1; i <= 3; i++) {
                const prefix = `Stone ${i}: `;
                const source = normalizedRow[`${prefix}Source`];
                const used = normalizedRow[`${prefix}Used`]?.toString().toUpperCase() === 'TRUE';
                if (source || used) {
                    const isCustom = source?.toLowerCase() === 'custom' || normalizedRow[`${prefix}Custom`]?.toString().toUpperCase() === 'TRUE';
                    const isMaster = source?.toLowerCase() === 'master';
                    const stoneData = {
                        gemstoneType: isMaster ? normalizedRow[`${prefix}Master Name`] : (normalizedRow[`${prefix}Custom Type`] || normalizedRow[`${prefix}Type`]),
                        gemstoneShape: normalizedRow[`${prefix}Shape`],
                        gemstoneQuality: normalizedRow[`${prefix}Quality`],
                        gemstoneColor: normalizedRow[`${prefix}Color`],
                        gemstoneClarity: normalizedRow[`${prefix}Clarity`],
                        gemstoneCut: normalizedRow[`${prefix}Cut`],
                        gemstoneCaratRange: normalizedRow[`${prefix}Carat Range`],
                        gemstoneWeight: parseFloat(normalizedRow[`${prefix}Weight (ct)`] || 0),
                        gemstonePieces: parseInt(normalizedRow[`${prefix}Pieces`] || 1),
                        discountType: normalizedRow[`${prefix}Discount Type`] || 'none',
                        discountValue: parseFloat(normalizedRow[`${prefix}Discount Value`] || 0),
                        unitType: normalizedRow[`${prefix}Rate Type`] === 'piece' ? 'piece' : 'carat',
                        pricePerPiece: normalizedRow[`${prefix}Rate Type`] === 'piece' ? parseFloat(normalizedRow[`${prefix}Rate Per Piece`] || normalizedRow[`${prefix}Rate Value`] || 0) : null,
                        pricePerCarat: normalizedRow[`${prefix}Rate Type`] !== 'piece' ? parseFloat(normalizedRow[`${prefix}Rate Per Carat`] || normalizedRow[`${prefix}Rate Value`] || 0) : null,
                        isCustom: isCustom
                    };
                    stonesToSave.push(stoneData);
                }
            }

            await prisma.productGemstone.deleteMany({ where: { productId: existingProduct.id } });
            if (stonesToSave.length > 0) {
                await prisma.productGemstone.createMany({
                    data: stonesToSave.map(s => ({
                        ...s,
                        productId: existingProduct.id
                    }))
                });
            }

            // Recalculate price
            const refreshedProduct = await prisma.product.findUnique({
                where: { id: existingProduct.id },
                include: { gemstones: true, makingGroup: true }
            });

            const priceResults = await PricingService.calculateBulkPrices(shop.id, [refreshedProduct.id]);
            if (priceResults.length > 0) {
                const priceData = priceResults[0];
                
                // Update local price
                await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: {
                        currentPrice: priceData.newPrice,
                        lastCalculatedPrice: priceData.newPrice,
                    }
                });

                // Push to Shopify
                const shopifyService = new ShopifyService(shop.domain, shop.accessToken);
                const shopifyResult = await shopifyService.updateVariantWithBreakdown(
                    refreshedProduct.shopifyVariantId,
                    priceData.newPrice,
                    priceData.breakdown
                );

                if (shopifyResult.success) {
                    console.log(`  ✓ Restored & Synced Shopify for ${SKU}: Price = ₹${priceData.newPrice}`);
                    await prisma.product.update({
                        where: { id: existingProduct.id },
                        data: {
                            lastPushedPrice: priceData.newPrice,
                            lastPushedAt: new Date()
                        }
                    });
                    successCount++;
                } else {
                    console.log(`  ✗ Shopify Push Failed for ${SKU}: ${shopifyResult.error}`);
                    failCount++;
                }
            } else {
                console.log(`  ✗ Price Calculation Failed for ${SKU}`);
                failCount++;
            }
            
            // Stagger requests to Shopify to avoid rate limits (approx 500ms)
            await delay(500);

        } catch (err) {
            console.error(`  ✗ Error processing SKU ${SKU}:`, err.message);
            failCount++;
        }
    }

    console.log(`\nImport completed! Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
