const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PricingService } = require('../services/pricing.service');
const { sendOfferAlert, sendCounterOfferAlert } = require('../services/email.service');
const { ShopifyService } = require('../services/shopify.service');

// Admin-only guard: this router is mounted at BOTH /api/public/offers (auth bypassed)
// and /api/offers (authenticated). Admin operations must never be reachable via the
// public mount, or they leak/allow customer data without authentication.
function rejectPublic(req, res, next) {
    if ((req.baseUrl || '').includes('/public')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}

// Helper to simulate pricing breakdown
async function calculateSimulatedBreakdown(product, shop, proposedMakingRate, proposedStoneDiscount, stoneDiscounts) {
    const settings = shop.settings || {};
    
    // Find rate per gram
    const metal = product.metal?.toLowerCase() || 'gold';
    const karat = product.karat || 22;
    const rateRecord = shop.metalRates.find(r => r.metal === metal && r.karat === karat);
    const ratePerGram = rateRecord ? rateRecord.ratePerGram : 0;
    
    // Clone product
    const clonedProduct = JSON.parse(JSON.stringify(product));
    
    // Override making charges if provided.
    // Only per-gram-style making can be negotiated via a ₹/g rate; never coerce a percent/flat
    // product to per_gram (that would silently change its price model — estimate ≠ invoice).
    const effMakingType = clonedProduct.makingChargeType === 'master'
        ? 'master'
        : (clonedProduct.makingChargeType || clonedProduct.makingGroup?.type || settings.defaultMakingChargeType || 'per_gram');
    const proposedMaking = parseFloat(proposedMakingRate);
    if (proposedMakingRate !== undefined && proposedMakingRate !== null && proposedMakingRate !== '' && !isNaN(proposedMaking)
        && (effMakingType === 'per_gram' || effMakingType === 'master')) {
        clonedProduct.makingChargeType = 'per_gram';
        clonedProduct.makingChargeValue = proposedMaking;
    }

    // Override gemstone discounts.
    // Preferred: per-stone map `stoneDiscounts` = [{ id, value(pct) }] so a customer can offer a
    // different discount on each stone of a multi-stone product. Falls back to the single
    // `proposedStoneDiscount` applied to every stone (legacy / single-stone / older storefront).
    const perStoneMap = {};
    if (Array.isArray(stoneDiscounts)) {
        for (const s of stoneDiscounts) {
            const v = parseFloat(s && s.value);
            if (s && s.id != null && !isNaN(v)) perStoneMap[String(s.id)] = v;
        }
    }
    if (Object.keys(perStoneMap).length > 0 && clonedProduct.gemstones && clonedProduct.gemstones.length > 0) {
        clonedProduct.gemstones.forEach(gem => {
            const v = perStoneMap[String(gem.id)];
            if (v !== undefined) {
                gem.discountType = 'percent';
                gem.discountValue = v;
            }
        });
    } else {
        const proposedStoneDiscountNum = parseFloat(proposedStoneDiscount);
        if (proposedStoneDiscount !== undefined && proposedStoneDiscount !== null && proposedStoneDiscount !== '' && !isNaN(proposedStoneDiscountNum)) {
            const discountPct = proposedStoneDiscountNum;
            clonedProduct.gemstoneDiscountType = 'percent';
            clonedProduct.gemstoneDiscountValue = discountPct;
            if (clonedProduct.gemstones && clonedProduct.gemstones.length > 0) {
                clonedProduct.gemstones.forEach(gem => {
                    gem.discountType = 'percent';
                    gem.discountValue = discountPct;
                });
            }
        }
    }
    
    // Find enamel rate if applicable
    let enamelRate = null;
    if (clonedProduct.enamelColor) {
        enamelRate = await prisma.enamelRate.findFirst({
            where: {
                shopId: shop.id,
                enamelColor: clonedProduct.enamelColor
            }
        });
    }
    
    const result = await PricingService.calculateProductPrice(
        clonedProduct,
        ratePerGram,
        null,
        settings,
        enamelRate
    );
    
    return result.breakdown;
}

// POST /api/public/offers/calculate
router.post('/calculate', async (req, res) => {
    try {
        const { 
            shopDomain, 
            shopifyProductId, 
            shopifyVariantId, 
            productId,
            variantId,
            proposedMakingRate,
            proposedStoneDiscount,
            offeredMakingCharge,
            stoneDiscountPct,
            stoneDiscounts
        } = req.body;

        const finalVariantId = shopifyVariantId || variantId;
        const finalProductId = shopifyProductId || productId;
        const finalMakingRate = proposedMakingRate !== undefined ? proposedMakingRate : offeredMakingCharge;
        const finalStoneDiscount = proposedStoneDiscount !== undefined ? proposedStoneDiscount : stoneDiscountPct;

        if (!shopDomain || (!finalProductId && !finalVariantId)) {
            return res.status(400).json({ error: 'Missing shopDomain, shopifyProductId or shopifyVariantId' });
        }
        
        const shop = await prisma.shop.findUnique({
            where: { domain: shopDomain },
            include: { settings: true, metalRates: true }
        });
        
        if (!shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        
        const variantIdStr = finalVariantId ? finalVariantId.toString() : '';
        const variantGid = variantIdStr && !variantIdStr.startsWith('gid://') ? `gid://shopify/ProductVariant/${variantIdStr}` : variantIdStr;
        const variantNumeric = variantIdStr && variantIdStr.startsWith('gid://') ? variantIdStr.split('/').pop() : variantIdStr;

        const productIdStr = finalProductId ? finalProductId.toString() : '';
        const productGid = productIdStr && !productIdStr.startsWith('gid://') ? `gid://shopify/Product/${productIdStr}` : productIdStr;
        const productNumeric = productIdStr && productIdStr.startsWith('gid://') ? productIdStr.split('/').pop() : productIdStr;

        const product = await prisma.product.findFirst({
            where: {
                shopId: shop.id,
                OR: [
                    variantGid ? { shopifyVariantId: variantGid } : null,
                    variantNumeric ? { shopifyVariantId: variantNumeric } : null,
                    productGid ? { shopifyProductId: productGid } : null,
                    productNumeric ? { shopifyProductId: productNumeric } : null
                ].filter(Boolean)
            },
            include: { gemstones: true, makingGroup: true }
        });
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const breakdown = await calculateSimulatedBreakdown(product, shop, finalMakingRate, finalStoneDiscount, stoneDiscounts);
        return res.json({ success: true, breakdown });
    } catch (err) {
        console.error('Error calculating simulated breakdown:', err);
        return res.status(500).json({ error: 'Failed to calculate pricing breakdown' });
    }
});

// POST /api/public/offers
router.post('/', async (req, res) => {
    try {
        const {
            shopDomain,
            shopifyProductId,
            shopifyVariantId,
            customerName,
            customerPhone,
            customerEmail,
            proposedMakingRate,
            proposedStoneDiscount,
            stoneDiscounts,
            message,
            pincode,
            city
        } = req.body;

        if (!shopDomain || !customerName || !customerPhone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!/^\d{10}$/.test(customerPhone)) {
            return res.status(400).json({ error: 'Invalid phone number format. Must be 10 digits.' });
        }

        // Email is required so the customer can be sent the invoice/counter-offer.
        if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }

        // Find shop
        const shop = await prisma.shop.findUnique({
            where: { domain: shopDomain },
            include: { settings: true, metalRates: true }
        });

        if (!shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const variantIdStr = shopifyVariantId ? shopifyVariantId.toString() : '';
        const variantGid = variantIdStr && !variantIdStr.startsWith('gid://') ? `gid://shopify/ProductVariant/${variantIdStr}` : variantIdStr;
        const variantNumeric = variantIdStr && variantIdStr.startsWith('gid://') ? variantIdStr.split('/').pop() : variantIdStr;

        const productIdStr = shopifyProductId ? shopifyProductId.toString() : '';
        const productGid = productIdStr && !productIdStr.startsWith('gid://') ? `gid://shopify/Product/${productIdStr}` : productIdStr;
        const productNumeric = productIdStr && productIdStr.startsWith('gid://') ? productIdStr.split('/').pop() : productIdStr;

        // Find product
        const product = await prisma.product.findFirst({
            where: {
                shopId: shop.id,
                OR: [
                    variantGid ? { shopifyVariantId: variantGid } : null,
                    variantNumeric ? { shopifyVariantId: variantNumeric } : null,
                    productGid ? { shopifyProductId: productGid } : null,
                    productNumeric ? { shopifyProductId: productNumeric } : null
                ].filter(Boolean)
            },
            include: { gemstones: true, makingGroup: true }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // 1. Check Max Offers Limit
        const maxOffers = product.maxOffersPerUser || 3;
        const pastOffersCount = await prisma.offerSubmission.count({
            where: {
                productId: product.id,
                customerPhone: customerPhone
            }
        });

        if (pastOffersCount >= maxOffers) {
            return res.status(400).json({ error: `You have reached the maximum limit of ${maxOffers} offers for this product.` });
        }

        // Calculate original price breakdown (without adjustments)
        const originalBreakdown = await calculateSimulatedBreakdown(product, shop, null, null);
        const originalTotal = originalBreakdown.total / 100;

        // Calculate simulated offer price breakdown (per-stone discounts supported)
        const simulatedBreakdown = await calculateSimulatedBreakdown(product, shop, proposedMakingRate, proposedStoneDiscount, stoneDiscounts);
        const offerAmount = simulatedBreakdown.total / 100;

        // Build a human-readable per-stone offer summary, e.g. "Ruby: 10%, Emerald: 5%".
        // Falls back to the single discount / "0%" for single-stone or legacy submissions.
        let stoneOfferStr = '0%';
        const simGems = simulatedBreakdown.gemstone_details && simulatedBreakdown.gemstone_details.gemstones;
        if (Array.isArray(simGems) && simGems.length > 0) {
            stoneOfferStr = simGems.map(g => `${g.type || 'Gemstone'}: ${g.discountValue ?? 0}%`).join(', ');
        } else if (proposedStoneDiscount) {
            stoneOfferStr = `${proposedStoneDiscount}%`;
        }

        // 2. Minimum Offer Validation (Absolute Threshold)
        if (product.minOfferAmount && offerAmount < product.minOfferAmount) {
            return res.status(400).json({ error: `Offer rejected. Minimum acceptable offer for this product is ₹${product.minOfferAmount}` });
        }

        // 3. Margin Threshold Validation (Auto Approve / Auto Reject)
        let status = 'pending';
        const settings = shop.settings || {};
        
        // Calculate offer total vs original total percentage
        const discountPct = originalTotal > 0 ? ((originalTotal - offerAmount) / originalTotal) * 100 : 0;
        const offerPct = 100 - discountPct; // e.g. 95% of original price

        if (settings.minMarginAutoReject !== null && settings.minMarginAutoReject !== undefined) {
            if (offerPct < settings.minMarginAutoReject) {
                status = 'rejected';
            }
        }

        if (status === 'pending' && settings.maxMarginAutoApprove !== null && settings.maxMarginAutoApprove !== undefined) {
            if (offerPct >= settings.maxMarginAutoApprove) {
                status = 'approved';
            }
        }

        // Retrieve metal rate
        const metal = product.metal?.toLowerCase() || 'gold';
        const karat = product.karat || 22;
        const rateRecord = shop.metalRates.find(r => r.metal === metal && r.karat === karat);
        const ratePerGram = rateRecord ? rateRecord.ratePerGram : 0;

        // Generate sequential Offer ID
        const count = await prisma.offerSubmission.count();
        const offerId = `AKD-OFFER-${1000 + count + 1}`;

        // Create Shopify Draft Order if auto-approved
        let shopifyDraftOrderId = null;
        let invoiceUrl = null;
        if (status === 'approved') {
            const shopifyService = new ShopifyService(shop.domain, shop.accessToken);
            const draftRes = await shopifyService.createDraftOrder(
                product.shopifyVariantId || product.shopifyProductId,
                1,
                offerAmount,
                { name: customerName, phone: customerPhone, email: customerEmail }
            );
            if (draftRes.success) {
                shopifyDraftOrderId = draftRes.draftOrderId;
                invoiceUrl = draftRes.invoiceUrl;
            }
        }

        // Save Offer to DB
        const offer = await prisma.offerSubmission.create({
            data: {
                offerId,
                shopId: shop.id,
                productId: product.id,
                shopifyVariantId: product.shopifyVariantId || null,
                customerName,
                customerPhone,
                customerEmail: customerEmail || null,
                goldRate: ratePerGram,
                goldValue: simulatedBreakdown.metal_value / 100,
                stoneValue: simulatedBreakdown.gemstone_price / 100,
                stoneOffer: stoneOfferStr,
                makingRate: originalBreakdown.making_charge_rate,
                makingOffer: proposedMakingRate ? proposedMakingRate.toString() : originalBreakdown.making_charge_rate?.toString() || '0',
                gst: simulatedBreakdown.gst_amount / 100,
                originalTotal,
                offerAmount,
                status,
                whatsAppSent: false,
                pincode: pincode || null,
                city: city || null,
                message: message || null,
                shopifyDraftOrderId: shopifyDraftOrderId ? `${shopifyDraftOrderId}|${invoiceUrl}` : null
            }
        });

        // Send Email Alert (full offer detail so the shop sees exactly what was offered)
        await sendOfferAlert(
            {
                offerId, customerName, customerPhone, customerEmail,
                offerAmount, originalTotal,
                productUrl: `/products/${product.shopifyProductId}`, productTitle: product.title,
                sku: product.sku, makingOffer: proposedMakingRate ? proposedMakingRate.toString() : null,
                stoneOffer: stoneOfferStr, status, pincode, city, message
            },
            settings,
            simulatedBreakdown
        ).catch(err => console.error('Error sending offer alert email:', err));

        res.json({
            success: true,
            status,
            offerId,
            offerAmount,
            originalTotal,
            customerName,
            customerEmail: customerEmail || '',
            stoneOffer: stoneOfferStr,
            pincode: pincode || '',
            city: city || '',
            whatsappNotifications: settings.whatsappNotifications || false,
            notificationWhatsapp: settings.notificationWhatsapp || '',
            message: status === 'approved'
                ? 'Offer auto-approved!'
                : (status === 'rejected' ? 'Offer auto-rejected.' : 'Offer submitted successfully.'),
            invoiceUrl // returns checkout link if approved
        });

    } catch (error) {
        console.error('Error processing offer submission:', error);
        res.status(500).json({ error: 'Internal server error processing offer submission' });
    }
});

// GET /api/offers (Admin list)
router.get('/', rejectPublic, async (req, res) => {
    try {
        const shopDomain = res.locals.shopify?.session?.shop || req.query.shop;
        if (!shopDomain) {
            return res.status(400).json({ error: 'Missing shop parameter' });
        }
        
        const shop = await prisma.shop.findUnique({
            where: { domain: shopDomain }
        });
        
        if (!shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        
        const offers = await prisma.offerSubmission.findMany({
            where: { shopId: shop.id },
            include: {
                product: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return res.json({ success: true, offers });
    } catch (err) {
        console.error('Error listing offers:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/offers/:id (Admin update)
router.put('/:id', rejectPublic, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, counterAmount, finalPrice: reqFinalPrice, approvedPrice } = req.body;
        const shopDomain = res.locals.shopify?.session?.shop;
        
        if (!shopDomain) {
            return res.status(400).json({ error: 'Missing session' });
        }

        const shop = await prisma.shop.findUnique({
            where: { domain: shopDomain },
            include: { settings: true }
        });

        if (!shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const offer = await prisma.offerSubmission.findFirst({
            where: { id, shopId: shop.id },
            include: { product: true }
        });
        
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }
        
        let updateData = { status };
        let invoiceUrl = null;
        
        if (status === 'approved') {
            const finalPrice = parseFloat(reqFinalPrice || approvedPrice) || ((offer.status === 'counter_sent' && offer.counterAmount) ? offer.counterAmount : offer.offerAmount);
            // Create Shopify Draft Order
            const shopifyService = new ShopifyService(shop.domain, shop.accessToken);
            const variantId = offer.shopifyVariantId || offer.product?.shopifyVariantId || offer.productId;
            const draftRes = await shopifyService.createDraftOrder(
                variantId,
                1,
                finalPrice,
                { name: offer.customerName, phone: offer.customerPhone, email: offer.customerEmail }
            );
            if (draftRes.success) {
                updateData.shopifyDraftOrderId = `${draftRes.draftOrderId}|${draftRes.invoiceUrl}`;
                updateData.offerAmount = finalPrice;
                invoiceUrl = draftRes.invoiceUrl;
                
                // Automatically email invoice if customer email is present
                if (offer.customerEmail) {
                    await shopifyService.sendDraftOrderInvoiceEmail(draftRes.draftOrderId, null, offer.customerEmail).catch(err => {
                        console.error('[SHOPIFY] Auto invoice email dispatch failed:', err.message);
                    });
                }
            } else {
                return res.status(500).json({ error: `Failed to create Shopify Draft Order: ${draftRes.error}` });
            }
        } else if (status === 'counter_sent') {
            if (!counterAmount || isNaN(counterAmount)) {
                return res.status(400).json({ error: 'Missing or invalid counterAmount' });
            }
            updateData.counterAmount = parseFloat(counterAmount);
        }
        
        const updatedOffer = await prisma.offerSubmission.update({
            where: { id },
            data: updateData,
            include: { product: true }
        });
        
        if (status === 'counter_sent') {
            const settings = shop.settings || {};
            await sendCounterOfferAlert(updatedOffer, settings, counterAmount).catch(err => {
                console.error('[EMAIL] Failed to send counter offer notification email:', err.message);
            });
        }
        
        return res.json({ success: true, offer: updatedOffer, invoiceUrl });
    } catch (err) {
        console.error('Error updating offer:', err);
        return res.status(500).json({ error: 'Internal server error updating offer' });
    }
});

// POST /api/offers/:id/send-email (Admin send draft order invoice email)
router.post('/:id/send-email', rejectPublic, async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;
        const shopDomain = res.locals.shopify?.session?.shop;
        
        if (!shopDomain) {
            return res.status(400).json({ error: 'Missing session' });
        }
        
        const shop = await prisma.shop.findUnique({
            where: { domain: shopDomain }
        });
        
        if (!shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        
        const offer = await prisma.offerSubmission.findFirst({
            where: { id, shopId: shop.id }
        });
        
        if (!offer || !offer.shopifyDraftOrderId) {
            return res.status(404).json({ error: 'Approved draft order not found for this offer' });
        }
        
        if (!offer.shopifyDraftOrderId.includes('|')) {
            return res.status(400).json({ error: 'This draft order was created with an older version and does not support automated emails. Please copy the checkout link and email it manually.' });
        }
        
        const draftOrderId = offer.shopifyDraftOrderId.split('|')[0];
        const shopifyService = new ShopifyService(shop.domain, shop.accessToken);
        
        const emailRes = await shopifyService.sendDraftOrderInvoiceEmail(draftOrderId, null, email);
        if (emailRes.success) {
            if (email && email !== offer.customerEmail) {
                await prisma.offerSubmission.update({
                    where: { id },
                    data: { customerEmail: email }
                });
            }
            return res.json({ success: true });
        } else {
            return res.status(500).json({ error: `Failed to send invoice email: ${emailRes.error}` });
        }
    } catch (err) {
        console.error('Error sending invoice email:', err);
        return res.status(500).json({ error: 'Internal server error sending invoice email' });
    }
});

module.exports = router;
