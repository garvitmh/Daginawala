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

    const { customerName, customerPhone, offerAmount, productUrl, productTitle, pincode, city } = offerDetails;
    const toEmail = shopSettings.notificationEmail;

    const htmlContent = `
        <h2>New Offer Received!</h2>
        <p>A customer has submitted a new offer for a product.</p>
        
        <h3>Customer Details</h3>
        <ul>
            <li><strong>Name:</strong> ${customerName}</li>
            <li><strong>Phone:</strong> ${customerPhone}</li>
            <li><strong>Pincode:</strong> ${pincode || 'N/A'}</li>
            <li><strong>City:</strong> ${city || 'N/A'}</li>
        </ul>

        <h3>Offer Details</h3>
        <ul>
            <li><strong>Product:</strong> <a href="${productUrl}">${productTitle}</a></li>
            <li><strong>Offer Amount:</strong> ₹${offerAmount}</li>
        </ul>

        <h3>Simulated Breakdown (if accepted)</h3>
        <p>To match this offer, the new pricing breakdown would be:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tbody>
                <tr><td>Metal Value</td><td>₹${(breakdown.metal_value / 100).toFixed(2)}</td></tr>
                <tr><td>Making Charges</td><td>₹${(breakdown.making_charges / 100).toFixed(2)}</td></tr>
                <tr><td>Gemstone Cost</td><td>₹${(breakdown.gemstone_price / 100).toFixed(2)}</td></tr>
                <tr><td>Subtotal</td><td>₹${(breakdown.subtotal / 100).toFixed(2)}</td></tr>
                <tr><td>GST (${breakdown.gst_pct}%)</td><td>₹${(breakdown.gst_amount / 100).toFixed(2)}</td></tr>
                <tr><td><strong>Total</strong></td><td><strong>₹${(breakdown.total / 100).toFixed(2)}</strong></td></tr>
            </tbody>
        </table>
        <br />
        <p>Please contact the customer at <strong>${customerPhone}</strong> to negotiate or accept this offer.</p>
    `;

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"Daginawala Automated Alerts" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: `New Offer: ₹${offerAmount} from ${customerName}`,
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
