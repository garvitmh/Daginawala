import { useState, useEffect } from 'react';
import {
    Page,
    Layout,
    Card,
    TextField,
    Select,
    BlockStack,
    InlineStack,
    Banner,
    Text,
    Checkbox,
} from '@shopify/polaris';
import api from '../utils/api';

interface Settings {
    defaultMakingChargeType: string;
    defaultMakingChargeValue: number;

    // Discounts
    defaultMetalDiscountType: string;
    defaultMetalDiscountValue: number;
    defaultMakingDiscountType: string;
    defaultMakingDiscountValue: number;
    defaultGemstoneDiscountType: string;
    defaultGemstoneDiscountValue: number;
    defaultEnamelDiscountType: string;
    defaultEnamelDiscountValue: number;

    defaultWastagePct: number;
    defaultGstPct: number;
    defaultDiscount: number;
    defaultDiscountType: string;
    emailNotifications: boolean;
    notificationEmail?: string;
    whatsappNotifications?: boolean;
    notificationWhatsapp?: string;
    offerEnabled?: boolean;
    makingChargeBubbles?: string;
    stoneDiscountOptions?: string;
    minMarginAutoReject?: number;
    maxMarginAutoApprove?: number;
}

const jsonToTextMapping = (jsonStr: string | undefined): string => {
    if (!jsonStr) return '';
    try {
        const obj = JSON.parse(jsonStr);
        return Object.entries(obj)
            .map(([key, value]) => {
                const arr = Array.isArray(value) ? value : [];
                return `${key}: ${arr.join(', ')}`;
            })
            .join('\n');
    } catch (e) {
        return jsonStr;
    }
};

const textToJsonMapping = (textStr: string): string | null => {
    if (!textStr.trim()) return '{}';
    const lines = textStr.split('\n');
    const obj: Record<string, number[]> = {};
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const parts = line.split(':');
        if (parts.length < 2) return null;
        const key = parts[0].trim();
        if (isNaN(Number(key))) return null;
        const vals = parts[1].split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (vals.length === 0) return null;
        obj[key] = vals;
    }
    return JSON.stringify(obj, null, 2);
};

export default function Settings() {
    const [settings, setSettings] = useState<Settings>({
        defaultMakingChargeType: 'per_gram',
        defaultMakingChargeValue: 1500,
        defaultMetalDiscountType: 'none',
        defaultMetalDiscountValue: 0,
        defaultMakingDiscountType: 'none',
        defaultMakingDiscountValue: 0,
        defaultGemstoneDiscountType: 'none',
        defaultGemstoneDiscountValue: 0,
        defaultEnamelDiscountType: 'none',
        defaultEnamelDiscountValue: 0,
        defaultWastagePct: 0,
        defaultGstPct: 3,
        defaultDiscount: 0,
        defaultDiscountType: 'flat',
        emailNotifications: true,
        whatsappNotifications: false,
        notificationWhatsapp: '919588977645',
        offerEnabled: true,
        makingChargeBubbles: '{\n  "1500": [1500, 1350, 1200, 1050],\n  "1850": [1850, 1500, 1350, 1050],\n  "2500": [2500, 2150, 1850, 1500]\n}',
        stoneDiscountOptions: '0%,2%,5%,7%,10%',
        minMarginAutoReject: 80,
        maxMarginAutoApprove: 97
    });
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [applyingToAll, setApplyingToAll] = useState(false);
    const [mappingText, setMappingText] = useState(`1500: 1500, 1350, 1200, 1050\n1850: 1850, 1500, 1350, 1050\n2500: 2500, 2150, 1850, 1500`);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            if (response.data.settings) {
                setSettings(response.data.settings);
                setMappingText(jsonToTextMapping(response.data.settings.makingChargeBubbles));
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setErrorMessage('');
        const jsonStr = textToJsonMapping(mappingText);
        if (jsonStr === null) {
            setErrorMessage('Invalid Making Charge Bubbles format. Please use "BaseRate: Option1, Option2..." format (e.g. 1500: 1500, 1350, 1200).');
            setLoading(false);
            return;
        }

        try {
            const payload = { ...settings, makingChargeBubbles: jsonStr };
            await api.put('/settings', payload);
            setSuccessMessage('Settings saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setErrorMessage('Failed to save settings. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyToAll = async () => {
        if (!confirm('This will apply current settings to ALL products and recalculate prices. This may take several minutes. Continue?')) {
            return;
        }

        setApplyingToAll(true);

        try {
            const response = await api.post('/settings/apply-to-all');
            setSuccessMessage(`Successfully applied settings to ${response.data.successCount} products!`);
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error applying settings:', error);
            setSuccessMessage('Failed to apply settings to products');
            setTimeout(() => setSuccessMessage(''), 5000);
        } finally {
            setApplyingToAll(false);
        }
    };

    return (
        <Page
            title="Settings"
            subtitle="Configure default pricing rules and preferences"
            primaryAction={{
                content: 'Save',
                onAction: handleSave,
                loading,
            }}
            secondaryActions={[
                {
                    content: 'Apply to All Products',
                    onAction: handleApplyToAll,
                    loading: applyingToAll,
                    destructive: true,
                }
            ]}
        >
            <Layout>
                {successMessage && (
                    <Layout.Section>
                        <Banner tone="success" onDismiss={() => setSuccessMessage('')}>
                            {successMessage}
                        </Banner>
                    </Layout.Section>
                )}

                {errorMessage && (
                    <Layout.Section>
                        <Banner tone="critical" onDismiss={() => setErrorMessage('')}>
                            {errorMessage}
                        </Banner>
                    </Layout.Section>
                )}

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h3">
                                Default Pricing Rules
                            </Text>
                            <Text as="p" tone="subdued">
                                These values will be used as defaults for all products unless overridden.
                            </Text>

                            <BlockStack gap="200">
                                <Select
                                    label="Making Charge Type"
                                    options={[
                                        { label: 'Per Gram (e.g. ₹1500/g)', value: 'per_gram' },
                                        { label: 'Percentage (e.g. 10% of metal)', value: 'percent' },
                                        { label: 'Flat Rate (e.g. ₹500 fixed)', value: 'flat' },
                                    ]}
                                    value={settings.defaultMakingChargeType}
                                    onChange={(value) => setSettings({ ...settings, defaultMakingChargeType: value })}
                                />
                                <TextField
                                    label="Making Charge Value"
                                    type="number"
                                    value={String(settings.defaultMakingChargeValue)}
                                    onChange={(value) =>
                                        setSettings({ ...settings, defaultMakingChargeValue: parseFloat(value) || 0 })
                                    }
                                    autoComplete="off"
                                    prefix={settings.defaultMakingChargeType === 'percent' ? '' : '₹'}
                                    suffix={settings.defaultMakingChargeType === 'percent' ? '%' : ''}
                                    helpText={
                                        settings.defaultMakingChargeType === 'per_gram' ? 'Using ₹ X per gram of metal weight' :
                                            settings.defaultMakingChargeType === 'percent' ? 'Using X% of metal value + wastage' :
                                                'Using flat ₹ X per item'
                                    }
                                />
                            </BlockStack>

                            <TextField
                                label="Wastage (%)"
                                type="number"
                                value={String(settings.defaultWastagePct)}
                                onChange={(value) =>
                                    setSettings({ ...settings, defaultWastagePct: parseFloat(value) || 0 })
                                }
                                autoComplete="off"
                            />

                            <TextField
                                label="GST (%)"
                                type="number"
                                value={String(settings.defaultGstPct)}
                                onChange={(value) =>
                                    setSettings({ ...settings, defaultGstPct: parseFloat(value) || 0 })
                                }
                                autoComplete="off"
                            />

                            <BlockStack gap="200">
                                <Text variant="headingSm" as="h4">Default Overall Discount</Text>
                                <InlineStack gap="300" wrap={false}>
                                    <div style={{ flex: 1 }}>
                                        <Select
                                            label="Type"
                                            options={[
                                                { label: 'Amount (₹)', value: 'flat' },
                                                { label: 'Percentage (%)', value: 'percent' },
                                            ]}
                                            value={settings.defaultDiscountType}
                                            onChange={(val) => setSettings({ ...settings, defaultDiscountType: val })}
                                        />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <TextField
                                            label="Value"
                                            type="number"
                                            value={settings.defaultDiscount.toString()}
                                            onChange={(val) => setSettings({ ...settings, defaultDiscount: parseFloat(val) || 0 })}
                                            prefix={settings.defaultDiscountType === 'flat' ? '₹' : ''}
                                            suffix={settings.defaultDiscountType === 'percent' ? '%' : ''}
                                            autoComplete="off"
                                        />
                                    </div>
                                </InlineStack>
                            </BlockStack>

                            <Text variant="headingMd" as="h3">Component Discounts</Text>
                            <Text as="p" tone="subdued">Set default discounts for specific components.</Text>

                            {/* Metal Discount */}
                            <BlockStack gap="200">
                                <Text variant="headingSm" as="h4">Metal Discount</Text>
                                <BlockStack inlineAlign="start">
                                    <Select
                                        label="Type"
                                        options={[
                                            { label: 'None', value: 'none' },
                                            { label: 'Percentage (%)', value: 'percent' },
                                            { label: 'Flat Amount (₹)', value: 'flat' },
                                        ]}
                                        value={settings.defaultMetalDiscountType}
                                        onChange={(value) => setSettings({ ...settings, defaultMetalDiscountType: value })}
                                    />
                                    {settings.defaultMetalDiscountType !== 'none' && (
                                        <TextField
                                            label="Value"
                                            type="number"
                                            value={String(settings.defaultMetalDiscountValue)}
                                            onChange={(value) => setSettings({ ...settings, defaultMetalDiscountValue: parseFloat(value) || 0 })}
                                            prefix={settings.defaultMetalDiscountType === 'flat' ? '₹' : ''}
                                            suffix={settings.defaultMetalDiscountType === 'percent' ? '%' : ''}
                                            autoComplete="off"
                                        />
                                    )}
                                </BlockStack>
                            </BlockStack>

                            {/* Making Charge Discount */}
                            <BlockStack gap="200">
                                <Text variant="headingSm" as="h4">Making Charge Discount</Text>
                                <BlockStack inlineAlign="start">
                                    <Select
                                        label="Type"
                                        options={[
                                            { label: 'None', value: 'none' },
                                            { label: 'Percentage (%)', value: 'percent' },
                                            { label: 'Flat Amount (₹)', value: 'flat' },
                                        ]}
                                        value={settings.defaultMakingDiscountType}
                                        onChange={(value) => setSettings({ ...settings, defaultMakingDiscountType: value })}
                                    />
                                    {settings.defaultMakingDiscountType !== 'none' && (
                                        <TextField
                                            label="Value"
                                            type="number"
                                            value={String(settings.defaultMakingDiscountValue)}
                                            onChange={(value) => setSettings({ ...settings, defaultMakingDiscountValue: parseFloat(value) || 0 })}
                                            prefix={settings.defaultMakingDiscountType === 'flat' ? '₹' : ''}
                                            suffix={settings.defaultMakingDiscountType === 'percent' ? '%' : ''}
                                            autoComplete="off"
                                        />
                                    )}
                                </BlockStack>
                            </BlockStack>

                            {/* Gemstone Discount */}
                            <BlockStack gap="200">
                                <Text variant="headingSm" as="h4">Gemstone/Diamond Discount</Text>
                                <BlockStack inlineAlign="start">
                                    <Select
                                        label="Type"
                                        options={[
                                            { label: 'None', value: 'none' },
                                            { label: 'Percentage (%)', value: 'percent' },
                                            { label: 'Flat Amount (₹)', value: 'flat' },
                                        ]}
                                        value={settings.defaultGemstoneDiscountType}
                                        onChange={(value) => setSettings({ ...settings, defaultGemstoneDiscountType: value })}
                                    />
                                    {settings.defaultGemstoneDiscountType !== 'none' && (
                                        <TextField
                                            label="Value"
                                            type="number"
                                            value={String(settings.defaultGemstoneDiscountValue)}
                                            onChange={(value) => setSettings({ ...settings, defaultGemstoneDiscountValue: parseFloat(value) || 0 })}
                                            prefix={settings.defaultGemstoneDiscountType === 'flat' ? '₹' : ''}
                                            suffix={settings.defaultGemstoneDiscountType === 'percent' ? '%' : ''}
                                            autoComplete="off"
                                        />
                                    )}
                                </BlockStack>
                            </BlockStack>

                            {/* Enamel Discount */}
                            <BlockStack gap="200">
                                <Text variant="headingSm" as="h4">Enamel Discount</Text>
                                <BlockStack inlineAlign="start">
                                    <Select
                                        label="Type"
                                        options={[
                                            { label: 'None', value: 'none' },
                                            { label: 'Percentage (%)', value: 'percent' },
                                            { label: 'Flat Amount (₹)', value: 'flat' },
                                        ]}
                                        value={settings.defaultEnamelDiscountType}
                                        onChange={(value) => setSettings({ ...settings, defaultEnamelDiscountType: value })}
                                    />
                                    {settings.defaultEnamelDiscountType !== 'none' && (
                                        <TextField
                                            label="Value"
                                            type="number"
                                            value={String(settings.defaultEnamelDiscountValue)}
                                            onChange={(value) => setSettings({ ...settings, defaultEnamelDiscountValue: parseFloat(value) || 0 })}
                                            prefix={settings.defaultEnamelDiscountType === 'flat' ? '₹' : ''}
                                            suffix={settings.defaultEnamelDiscountType === 'percent' ? '%' : ''}
                                            autoComplete="off"
                                        />
                                    )}
                                </BlockStack>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h3">
                                Offer & Negotiation Settings
                            </Text>
                            <Text as="p" tone="subdued">
                                Configure the options and auto-validation rules for the customer "Make an Offer" system.
                            </Text>

                            <BlockStack gap="200">
                                <Select
                                    label="Offer Enabled"
                                    options={[
                                        { label: 'Yes', value: 'true' },
                                        { label: 'No', value: 'false' },
                                    ]}
                                    value={settings.offerEnabled ? 'true' : 'false'}
                                    onChange={(value) => setSettings({ ...settings, offerEnabled: value === 'true' })}
                                />

                                <TextField
                                    label="Stone Discount Options (Comma separated)"
                                    value={settings.stoneDiscountOptions || ''}
                                    onChange={(value) => setSettings({ ...settings, stoneDiscountOptions: value })}
                                    helpText="Example: 0%,2%,5%,7%,10%,Custom"
                                    autoComplete="off"
                                />

                                <TextField
                                    label="Making Charge Bargaining Bubbles"
                                    value={mappingText}
                                    onChange={(value) => setMappingText(value)}
                                    multiline={6}
                                    helpText="Format: BaseRate: Option1, Option2... (e.g. 1500: 1500, 1350, 1200, 1050). Enter each base rate mapping on a new line."
                                    placeholder={`1500: 1500, 1350, 1200, 1050\n1850: 1850, 1500, 1350, 1050`}
                                    autoComplete="off"
                                />

                                <TextField
                                    label="Auto Reject Price Threshold (%)"
                                    type="number"
                                    value={String(settings.minMarginAutoReject ?? 80)}
                                    onChange={(value) => setSettings({ ...settings, minMarginAutoReject: parseFloat(value) || 0 })}
                                    helpText="Auto reject offers below this % of original total price (e.g. 80% means auto-reject discount greater than 20%)"
                                    autoComplete="off"
                                />

                                <TextField
                                    label="Auto Approve Price Threshold (%)"
                                    type="number"
                                    value={String(settings.maxMarginAutoApprove ?? 97)}
                                    onChange={(value) => setSettings({ ...settings, maxMarginAutoApprove: parseFloat(value) || 0 })}
                                    helpText="Auto approve offers equal to or above this % of original total price (e.g. 97% means auto-approve discount less than 3%)"
                                    autoComplete="off"
                                />
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h3">
                                Notifications & Alerts
                            </Text>
                            <Text as="p" tone="subdued">
                                Configure where automated notifications and customer WhatsApp redirections are sent.
                            </Text>

                            <BlockStack gap="200">
                                <Checkbox
                                    label="Receive Email Notifications"
                                    checked={settings.emailNotifications}
                                    onChange={(newVal) => setSettings({ ...settings, emailNotifications: newVal })}
                                />
                                {settings.emailNotifications && (
                                    <TextField
                                        label="Notification Email Address"
                                        type="email"
                                        value={settings.notificationEmail || ''}
                                        onChange={(value) => setSettings({ ...settings, notificationEmail: value })}
                                        autoComplete="email"
                                        helpText="The email address that will receive customer offers and alerts."
                                    />
                                )}

                                <div style={{ marginTop: '10px' }}>
                                    <Checkbox
                                        label="Enable WhatsApp Redirection for Customers"
                                        checked={settings.whatsappNotifications}
                                        onChange={(newVal) => setSettings({ ...settings, whatsappNotifications: newVal })}
                                    />
                                </div>
                                {settings.whatsappNotifications && (
                                    <TextField
                                        label="Admin WhatsApp Number"
                                        value={settings.notificationWhatsapp || ''}
                                        onChange={(value) => setSettings({ ...settings, notificationWhatsapp: value })}
                                        placeholder="e.g. 919588977645 (include country code without + or spaces)"
                                        autoComplete="off"
                                        helpText="The WhatsApp number that the customer will redirect to upon submitting an offer."
                                    />
                                )}
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
