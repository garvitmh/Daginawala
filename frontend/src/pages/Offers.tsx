import { useState, useEffect } from 'react';
import {
    Page,
    Layout,
    Card,
    DataTable,
    Badge,
    Button,
    Modal,
    TextField,
    BlockStack,
    InlineStack,
    Text,
    Divider,
    Box,
    Banner
} from '@shopify/polaris';
import { format } from 'date-fns';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatCurrency';

interface Product {
    title: string;
    sku: string;
    imageUrl?: string;
}

interface Offer {
    id: string;
    offerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    goldRate?: number;
    goldValue?: number;
    stoneValue?: number;
    stoneOffer?: string;
    makingRate?: number;
    makingOffer?: string;
    gst?: number;
    originalTotal?: number;
    offerAmount: number;
    status: string;
    pincode?: string;
    city?: string;
    message?: string;
    counterAmount?: number;
    shopifyDraftOrderId?: string;
    createdAt: string;
    product: Product;
}

export default function Offers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
    const [counterPrice, setCounterPrice] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    const [approvedPrice, setApprovedPrice] = useState('');
    const [approvedLink, setApprovedLink] = useState('');
    const [successBannerMessage, setSuccessBannerMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const [emailInputVal, setEmailInputVal] = useState('');

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await api.get('/offers');
            if (response.data?.success) {
                setOffers(response.data.offers);
            }
        } catch (error) {
            console.error('Error fetching offers:', error);
        }
    };

    const handleStatusUpdate = async (offerId: string, status: string, additionalData?: any) => {
        setLoadingAction(true);
        try {
            const response = await api.put(`/offers/${offerId}`, {
                status,
                ...additionalData
            });
            if (response.data?.success) {
                await fetchOffers();
                setIsCounterModalOpen(false);
                setCounterPrice('');
                
                const updatedOffer = response.data.offer;
                if (status === 'approved' && response.data.invoiceUrl) {
                    setApprovedLink(response.data.invoiceUrl);
                    
                    let msg = 'Offer Approved successfully! Shopify checkout link created.';
                    if (updatedOffer.customerEmail) {
                        msg += ' Invoice email automatically sent to customer.';
                    }
                    setSuccessBannerMessage(msg);
                    setActiveOffer(updatedOffer);
                    
                    // Automatically trigger WhatsApp redirect template for user ease
                    handleWhatsAppRedirect(updatedOffer);
                } else if (status === 'counter_sent') {
                    let msg = `Counter-offer of ${formatCurrency(updatedOffer.counterAmount)} sent successfully!`;
                    if (updatedOffer.customerEmail) {
                        msg += ' Notification email sent to customer.';
                    }
                    setSuccessBannerMessage(msg);
                    setActiveOffer(updatedOffer);
                    
                    // Automatically trigger WhatsApp redirect template for user ease
                    handleWhatsAppRedirect(updatedOffer);
                } else {
                    setIsDetailModalOpen(false);
                }
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update offer status');
        } finally {
            setLoadingAction(false);
        }
    };

    const getStatusBadgeTone = (status: string) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'critical';
            case 'counter_sent':
                return 'warning';
            case 'purchased':
                return 'info';
            default:
                return 'attention';
        }
    };

    const openOfferDetails = (offer: Offer) => {
        setActiveOffer(offer);
        setApprovedPrice((offer.status.toLowerCase() === 'counter_sent' && offer.counterAmount ? offer.counterAmount : offer.offerAmount).toString());
        
        const checkoutLink = offer.shopifyDraftOrderId && offer.shopifyDraftOrderId.includes('|') 
            ? offer.shopifyDraftOrderId.split('|')[1] 
            : offer.shopifyDraftOrderId || '';
            
        setApprovedLink(checkoutLink);
        setEmailInputVal(offer.customerEmail || '');
        setSuccessBannerMessage('');
        setIsDetailModalOpen(true);
    };

    const handleSendEmailInvoice = async () => {
        if (!activeOffer) return;
        setLoadingAction(true);
        try {
            await api.post(`/offers/${activeOffer.id}/send-email`, { email: emailInputVal });
            setSuccessBannerMessage('Shopify invoice email sent to customer successfully!');
            // Update local state
            setActiveOffer(prev => prev ? { ...prev, customerEmail: emailInputVal } : null);
            setOffers(prev => prev.map(o => o.id === activeOffer.id ? { ...o, customerEmail: emailInputVal } : o));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to send invoice email.');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleWhatsAppRedirect = (offer: Offer) => {
        const statusLower = offer.status.toLowerCase();
        const checkoutLink = offer.shopifyDraftOrderId && offer.shopifyDraftOrderId.includes('|') 
            ? offer.shopifyDraftOrderId.split('|')[1] 
            : offer.shopifyDraftOrderId || '';
            
        // Use active screen price inputs if available
        let targetPrice = offer.offerAmount;
        if (statusLower === 'approved') {
            targetPrice = parseFloat(approvedPrice) || offer.offerAmount;
        } else if (statusLower === 'counter_sent') {
            targetPrice = offer.counterAmount || parseFloat(counterPrice) || offer.offerAmount;
        }
            
        const text = `Hello ${offer.customerName}, regarding your offer ${offer.offerId} for ${offer.product.title}:\n\n` +
            (statusLower === 'approved' 
                ? `We have approved your offer of ${formatCurrency(targetPrice)}! You can checkout here:\n${checkoutLink}` 
                : (statusLower === 'counter_sent' 
                    ? `We would like to make a counter offer of ${formatCurrency(targetPrice)}.`
                    : `We are currently reviewing your offer.`));
        
        const url = `https://wa.me/${offer.customerPhone.startsWith('+') ? offer.customerPhone : '+91' + offer.customerPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const offerRows = offers.map((offer) => {
        const diff = (offer.originalTotal || 0) - offer.offerAmount;
        const diffPct = offer.originalTotal && offer.originalTotal > 0 
            ? ((diff / offer.originalTotal) * 100).toFixed(1) 
            : '0';

        return [
            <div>
                <Text variant="bodyMd" as="span" fontWeight="bold">{offer.offerId}</Text>
                <div style={{ color: 'gray', fontSize: '12px', marginTop: '2px' }}>
                    {format(new Date(offer.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
            </div>,
            <div>
                <Text variant="bodyMd" as="span" fontWeight="semibold">{offer.customerName}</Text>
                <div style={{ color: 'gray', fontSize: '12px', marginTop: '2px' }}>{offer.customerPhone}</div>
            </div>,
            <div style={{ maxWidth: '280px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <Text variant="bodyMd" as="span" fontWeight="medium">{offer.product.title}</Text>
                <div style={{ color: 'gray', fontSize: '12px', marginTop: '2px' }}>SKU: {offer.product.sku}</div>
            </div>,
            <div>
                <Text variant="bodyMd" as="span" fontWeight="semibold">{formatCurrency(offer.offerAmount)}</Text>
                <div style={{ color: 'gray', fontSize: '11px', textDecoration: 'line-through', marginTop: '1px' }}>
                    {formatCurrency(offer.originalTotal)}
                </div>
                <div style={{ color: '#b91c1c', fontSize: '11px', fontWeight: 'bold', marginTop: '1px' }}>
                    -{formatCurrency(diff)} ({diffPct}%)
                </div>
            </div>,
            <Badge tone={getStatusBadgeTone(offer.status)}>{offer.status.toUpperCase().replace('_', ' ')}</Badge>,
            <Button onClick={() => openOfferDetails(offer)}>View Details</Button>
        ];
    });

    return (
        <Page title="Offers" subtitle="Manage and negotiate custom customer offers">
            <Layout>
                <Layout.Section>
                    <Card>
                        {offers.length === 0 ? (
                            <BlockStack gap="200" inlineAlign="center">
                                <Box padding="400">
                                    <Text variant="headingMd" as="h2">No offers received yet.</Text>
                                </Box>
                            </BlockStack>
                        ) : (
                            <DataTable
                                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                                headings={['Offer ID / Date', 'Customer', 'Product', 'Offer / Original Price', 'Status', 'Action']}
                                rows={offerRows}
                            />
                        )}
                    </Card>
                </Layout.Section>
            </Layout>

            {/* Detail Modal */}
            {activeOffer && (
                <Modal
                    open={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Offer Details: ${activeOffer.offerId}`}
                    primaryAction={
                        ['pending', 'counter_sent'].includes(activeOffer.status.toLowerCase()) ? {
                            content: 'Approve & Create Draft Order',
                            loading: loadingAction,
                            onAction: () => handleStatusUpdate(activeOffer.id, 'approved', { finalPrice: parseFloat(approvedPrice) })
                        } : undefined
                    }
                    secondaryActions={[
                        ...((['pending', 'counter_sent'].includes(activeOffer.status.toLowerCase())) ? [
                            {
                                content: 'Counter Offer',
                                onAction: () => {
                                    setCounterPrice((activeOffer.counterAmount || activeOffer.offerAmount).toString());
                                    setIsCounterModalOpen(true);
                                }
                            },
                            {
                                content: 'Reject Offer',
                                destructive: true,
                                loading: loadingAction,
                                onAction: () => handleStatusUpdate(activeOffer.id, 'rejected')
                            }
                        ] : []),
                        {
                            content: 'Contact via WhatsApp',
                            onAction: () => handleWhatsAppRedirect(activeOffer)
                        },
                        {
                            content: 'Close',
                            onAction: () => setIsDetailModalOpen(false)
                        }
                    ]}
                >
                    <Modal.Section>
                        <BlockStack gap="400">
                            {successBannerMessage && (
                                <Banner tone="success" onDismiss={() => setSuccessBannerMessage('')}>
                                    <Text as="p" fontWeight="bold">{successBannerMessage}</Text>
                                </Banner>
                            )}
                            <InlineStack align="space-between">
                                <div>
                                    <Text variant="headingSm" as="h3">Customer Info</Text>
                                    <Text variant="bodyMd" as="p">Name: {activeOffer.customerName}</Text>
                                    <Text variant="bodyMd" as="p">Phone: {activeOffer.customerPhone}</Text>
                                    {activeOffer.customerEmail && <Text variant="bodyMd" as="p">Email: {activeOffer.customerEmail}</Text>}
                                    {(activeOffer.city || activeOffer.pincode) && (
                                        <Text variant="bodyMd" as="p">Location: {activeOffer.city || '-'}, {activeOffer.pincode || '-'}</Text>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Text variant="headingSm" as="h3">Status</Text>
                                    <Badge tone={getStatusBadgeTone(activeOffer.status)}>{activeOffer.status.toUpperCase()}</Badge>
                                </div>
                            </InlineStack>

                            {approvedLink && (
                                <div style={{ border: '1px dashed #d1d5db', borderRadius: '8px', padding: '12px', background: '#fafbfb', marginTop: '10px' }}>
                                    <BlockStack gap="200">
                                        <Text variant="headingSm" as="h4">Checkout Link & Email Dispatch</Text>
                                        <TextField
                                            label="Shopify Checkout Link"
                                            labelHidden
                                            value={approvedLink}
                                            readOnly
                                            autoComplete="off"
                                            connectedRight={
                                                <InlineStack gap="100">
                                                    <Button onClick={() => {
                                                        navigator.clipboard.writeText(approvedLink);
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }}>
                                                        {copied ? 'Copied!' : 'Copy Link'}
                                                    </Button>
                                                    <Button url={approvedLink} target="_blank">Open Checkout</Button>
                                                </InlineStack>
                                            }
                                        />
                                        
                                        <div style={{ marginTop: '5px' }}>
                                            <TextField
                                                label="Email Invoice to Customer"
                                                value={emailInputVal}
                                                onChange={(val) => setEmailInputVal(val)}
                                                placeholder="customer@example.com"
                                                autoComplete="email"
                                                connectedRight={
                                                    <Button 
                                                        loading={loadingAction}
                                                        onClick={handleSendEmailInvoice}
                                                        disabled={!emailInputVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInputVal)}
                                                    >
                                                        Send Invoice Email
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </BlockStack>
                                </div>
                            )}

                            <Divider />

                            <div>
                                <Text variant="headingSm" as="h3">Negotiated Breakdown</Text>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                    <Text variant="bodyMd" as="p">Gold Rate (per g):</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold">{formatCurrency(activeOffer.goldRate)}</Text>

                                    <Text variant="bodyMd" as="p">Gold Value (Fixed):</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold">{formatCurrency(activeOffer.goldValue)}</Text>

                                    <Text variant="bodyMd" as="p">Stone Value (Original):</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold">{formatCurrency(activeOffer.stoneValue)}</Text>

                                    <Text variant="bodyMd" as="p">Stone Discount Offer:</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold" tone="caution">{activeOffer.stoneOffer || '0%'}</Text>

                                    <Text variant="bodyMd" as="p">Making Rate (Original):</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold">₹{activeOffer.makingRate}/g</Text>

                                    <Text variant="bodyMd" as="p">Making Rate Offer:</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold" tone="caution">₹{activeOffer.makingOffer}/g</Text>

                                    <Text variant="bodyMd" as="p">GST Amount:</Text>
                                    <Text variant="bodyMd" as="p" fontWeight="bold">{formatCurrency(activeOffer.gst)}</Text>
                                </div>
                            </div>

                            <Divider />

                            <InlineStack align="space-between">
                                <div>
                                    <Text variant="bodyMd" as="p" tone="subdued">Original Total:</Text>
                                    <Text variant="headingLg" as="p" tone="subdued">
                                        <span style={{ textDecoration: 'line-through' }}>{formatCurrency(activeOffer.originalTotal)}</span>
                                    </Text>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Text variant="bodyMd" as="p">Customer Offer Total:</Text>
                                    <Text variant="headingLg" as="p" tone="success">
                                        {formatCurrency(activeOffer.offerAmount)}
                                    </Text>
                                </div>
                            </InlineStack>

                            {activeOffer.message && (
                                <>
                                    <Divider />
                                    <div>
                                        <Text variant="headingSm" as="h3">Customer Message</Text>
                                        <Box padding="300" background="bg-surface-secondary" borderRadius="100">
                                            <Text variant="bodyMd" as="p">{activeOffer.message}</Text>
                                        </Box>
                                    </div>
                                </>
                            )}

                             {activeOffer.counterAmount && (
                                 <>
                                     <Divider />
                                     <div>
                                         <Text variant="headingSm" as="h3">Admin Counter Offer</Text>
                                         <Text variant="bodyMd" as="p" fontWeight="bold" tone="caution">
                                             {formatCurrency(activeOffer.counterAmount)}
                                         </Text>
                                     </div>
                                 </>
                             )}

                             {['pending', 'counter_sent'].includes(activeOffer.status.toLowerCase()) && (
                                 <>
                                     <Divider />
                                     <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                         <BlockStack gap="200">
                                             <Text variant="headingSm" as="h4">Final Deal Price Confirmation</Text>
                                             <Text as="p" tone="subdued">Confirm or adjust the final agreed price before creating the Shopify draft order checkout link.</Text>
                                             <TextField
                                                 label="Final Deal Price (INR)"
                                                 type="number"
                                                 prefix="₹"
                                                 value={approvedPrice}
                                                 onChange={setApprovedPrice}
                                                 autoComplete="off"
                                             />
                                         </BlockStack>
                                     </Box>
                                 </>
                             )}
                         </BlockStack>
                    </Modal.Section>
                </Modal>
            )}

            {/* Counter Offer Modal */}
            {activeOffer && (
                <Modal
                    open={isCounterModalOpen}
                    onClose={() => setIsCounterModalOpen(false)}
                    title="Send Counter Offer"
                    primaryAction={{
                        content: 'Submit Counter Price',
                        loading: loadingAction,
                        onAction: () => handleStatusUpdate(activeOffer.id, 'counter_sent', { counterAmount: counterPrice })
                    }}
                    secondaryActions={[
                        {
                            content: 'Cancel',
                            onAction: () => setIsCounterModalOpen(false)
                        }
                    ]}
                >
                    <Modal.Section>
                        <BlockStack gap="400">
                            <Text variant="bodyMd" as="p">
                                Original Total: <Text variant="bodyMd" as="span" fontWeight="bold">{formatCurrency(activeOffer.originalTotal)}</Text>
                            </Text>
                            <Text variant="bodyMd" as="p">
                                Customer Offer: <Text variant="bodyMd" as="span" fontWeight="bold" tone="success">{formatCurrency(activeOffer.offerAmount)}</Text>
                            </Text>
                            <TextField
                                label="Counter Offer Price (INR)"
                                type="number"
                                value={counterPrice}
                                onChange={setCounterPrice}
                                autoComplete="off"
                            />
                        </BlockStack>
                    </Modal.Section>
                </Modal>
            )}
        </Page>
    );
}
