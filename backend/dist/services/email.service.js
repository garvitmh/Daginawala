const nodemailer = require('nodemailer');

// Initialize transporter inside the function so it reads env vars dynamically
// (in case they change at runtime)
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

/**
 * Sends an email notification for a new offer
 * @param {Object} offerDetails - The details submitted by the customer
 * @param {Object} shopSettings - The settings containing the notification email
 * @param {Object} breakdown - The simulated price breakdown
 */
const sendOfferAlert = async (offerDetails, shopSettings, breakdown) => {
    if (shopSettings && shopSettings.emailNotifications === false) {
        console.log('Email notifications are disabled in settings. Skipping email send.');
        return false;
    }

    if (!shopSettings || !shopSettings.notificationEmail) {
        console.error('No notification email configured in shop settings. Cannot send offer alert.');
        return false;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP credentials are not configured in environment variables. Cannot send offer alert.');
        return false;
    }

    const {
        offerId, customerName, customerPhone, customerEmail, offerAmount, originalTotal,
        productUrl, productTitle, sku, makingOffer, stoneOffer, status, pincode, city, message
    } = offerDetails;
    const toEmail = shopSettings.notificationEmail;

    const inr = (n) => `₹${(Number(n) / 100).toFixed(2)}`;         // breakdown fields are paise
    const rupees = (n) => `₹${Number(n).toFixed(2)}`;              // offer totals are rupees

    // Per-stone rows (multi-stone products show each stone + its negotiated discount)
    let gemRows = '';
    const gems = breakdown.gemstone_details && breakdown.gemstone_details.gemstones;
    if (Array.isArray(gems) && gems.length > 0) {
        gemRows = gems.map(g =>
            `<tr><td>Stone — ${g.type || 'Gemstone'}${g.discountValue ? ` (${g.discountValue}% off)` : ''}</td><td>${inr(g.finalCost)}</td></tr>`
        ).join('');
    } else if (breakdown.gemstone_price > 0) {
        gemRows = `<tr><td>Gemstone</td><td>${inr(breakdown.gemstone_price)}</td></tr>`;
    }
    const enamelRow = breakdown.enamel_price > 0 ? `<tr><td>Enamel</td><td>${inr(breakdown.enamel_price)}</td></tr>` : '';
    const savings = (originalTotal != null && offerAmount != null) ? (originalTotal - offerAmount) : null;
    const statusLabel = status ? status.replace('_', ' ') : 'pending';

    const htmlContent = `
        <h2>New Offer Received${offerId ? ` — ${offerId}` : ''}</h2>
        <p>Status: <strong>${statusLabel}</strong></p>

        <h3>Customer Details</h3>
        <ul>
            <li><strong>Name:</strong> ${customerName}</li>
            <li><strong>Phone:</strong> ${customerPhone}</li>
            <li><strong>Email:</strong> ${customerEmail || 'N/A'}</li>
            <li><strong>Pincode:</strong> ${pincode || 'N/A'}</li>
            <li><strong>City:</strong> ${city || 'N/A'}</li>
            ${message ? `<li><strong>Message:</strong> ${message}</li>` : ''}
        </ul>

        <h3>Offer Details</h3>
        <ul>
            <li><strong>Product:</strong> <a href="${productUrl}">${productTitle}</a>${sku ? ` (SKU: ${sku})` : ''}</li>
            ${originalTotal != null ? `<li><strong>Website Price:</strong> ${rupees(originalTotal)}</li>` : ''}
            <li><strong>Offer Amount:</strong> ${rupees(offerAmount)}</li>
            ${savings != null && savings > 0 ? `<li><strong>Customer wants a discount of:</strong> ${rupees(savings)}</li>` : ''}
            ${makingOffer ? `<li><strong>Making offered:</strong> ₹${makingOffer}/g</li>` : ''}
            ${stoneOffer && stoneOffer !== '0%' ? `<li><strong>Stone discount offered:</strong> ${stoneOffer}</li>` : ''}
        </ul>

        <h3>Simulated Breakdown (if accepted)</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tbody>
                <tr><td>Metal Value</td><td>${inr(breakdown.metal_value)}</td></tr>
                <tr><td>Making Charges</td><td>${inr(breakdown.making_charges)}</td></tr>
                ${gemRows}
                ${enamelRow}
                <tr><td>Subtotal</td><td>${inr(breakdown.subtotal)}</td></tr>
                <tr><td>GST (${breakdown.gst_pct}%)</td><td>${inr(breakdown.gst_amount)}</td></tr>
                <tr><td><strong>Total</strong></td><td><strong>${inr(breakdown.total)}</strong></td></tr>
            </tbody>
        </table>
        <br />
        <p>Contact the customer at <strong>${customerPhone}</strong>${customerEmail ? ` / ${customerEmail}` : ''} to negotiate or accept this offer.</p>
    `;

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"Daginawala Automated Alerts" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: `New Offer${offerId ? ` ${offerId}` : ''}: ₹${offerAmount} from ${customerName}`,
            html: htmlContent,
        });
        
        console.log('Offer alert email sent successfully: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Failed to send offer alert email:', error);
        return false;
    }
};

const sendCounterOfferAlert = async (offer, shopSettings, counterAmount) => {
    if (!offer.customerEmail) {
        console.log('No customer email provided. Skipping counter-offer email.');
        return false;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP credentials are not configured. Cannot send counter-offer email.');
        return false;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e3e5; border-radius: 8px;">
            <h2 style="color: #111827; border-bottom: 1px solid #e1e3e5; padding-bottom: 10px;">Counter-Offer Received - Daginawala</h2>
            <p>Dear ${offer.customerName},</p>
            <p>Thank you for submitting your offer <strong>${offer.offerId}</strong> for <strong>${offer.product?.title || 'your selected item'}</strong>.</p>
            <p>We reviewed your request, and while we are unable to accept your original offer of <strong>₹${offer.offerAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>, we would love to reach a middle ground. We are pleased to make you a counter-offer of:</p>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; color: #b45309;">₹${parseFloat(counterAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <p>If you accept this counter-offer, please reply to this email or contact us via WhatsApp. We will generate your official Shopify checkout link immediately.</p>
            
            <p style="margin-top: 30px; border-top: 1px solid #e1e3e5; padding-top: 15px; color: #6b7280; font-size: 12px;">
                This is an automated notification from Daginawala.
            </p>
        </div>
    `;

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"Daginawala Support" <${process.env.SMTP_USER}>`,
            to: offer.customerEmail,
            subject: `Counter-Offer for your Daginawala request (${offer.offerId})`,
            html: htmlContent,
        });
        
        console.log('Counter-offer email sent successfully: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Failed to send counter-offer email:', error);
        return false;
    }
};

module.exports = {
    sendOfferAlert,
    sendCounterOfferAlert
};
