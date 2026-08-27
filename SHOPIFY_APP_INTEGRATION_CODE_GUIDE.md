# Dagina Cloud — Shopify Storefront Integration & Code Guide

This document contains **only the custom features and code developed for Dagina Cloud**:
1. **Transparent Price Breakdown Block** (Wastage-free, live gold calculation, toggleable per product).
2. **Interactive "Make An Offer" Negotiation Modal** (Dynamic real-time making charge bubbles, stone discount options, GST recalculation, draft order creation & WhatsApp checkout).
3. **Per-Product Metafield Toggles** (`enable_breakdown` & `enable_offer`) controlled directly from Dagina Cloud single & bulk edit tools.

---

## 📁 File Structure in Shopify Theme

To integrate our app features into your Shopify store, only **1 snippet file** and **1 one-line render tag** are needed:

| Action | Theme Location | Purpose |
| :--- | :--- | :--- |
| **Create/Update Snippet** | `snippets/gemini-price-breakdown-enhanced.liquid` | Contains the complete UI & logic for Price Breakdown and Make An Offer Modal. |
| **Include in Product Page** | `sections/main-product.liquid` | Displays the widget right on the product page below the Buy Buttons / Price. |

---

## 🛠️ Step 1: Create the Snippet in Shopify Theme

1. In **Shopify Admin**, go to **Online Store** → **Themes**.
2. Click **`...`** (Actions) next to your live theme → **Edit code**.
3. In the left sidebar, under **Snippets**, click **Add a new snippet**.
4. Name it: `gemini-price-breakdown-enhanced.liquid`.
5. Paste the complete code below and click **Save**.

### 💻 Code for `snippets/gemini-price-breakdown-enhanced.liquid`:

```liquid
{% comment %}
  Dagina Cloud - Enhanced Price Breakdown & Make an Offer Widget
  - 100% Dynamic Pricing from Dagina Cloud Engine
  - Wastage row completely removed
  - Controlled by product.metafields.custom.enable_breakdown & enable_offer
{% endcomment %}

{% assign current_variant = variant | default: product.selected_or_first_available_variant %}
{% assign breakdown = current_variant.metafields.gemini.price_breakdown.value | default: current_variant.metafields.gemini.price_breakdown %}

{% comment %} WhatsApp Consultant Number (with country code, no +) {% endcomment %}
{% assign admin_whatsapp_number = "919588977645" %}

{% if breakdown %}
  {% assign gemstone_price_raw = breakdown.gemstone_price | default: 0 %}
  {% assign making_charges_raw = breakdown.making_charges | default: 0 %}
  {% assign metal_value_raw = breakdown.metal_value | default: 0 %}
  {% assign gst_pct_raw = breakdown.gst_pct | default: 3 %}
  {% assign total_original_raw = breakdown.total | default: 0 %}
  
  {% assign has_stones = false %}
  {% if gemstone_price_raw > 0 or breakdown.gemstone_details.gemstones.size > 0 %}
    {% assign has_stones = true %}
  {% endif %}

  <div class="gemini-widget-container" style="margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

    <!-- ==================== 1. MAKE AN OFFER BUTTON & MODAL ==================== -->
    {% if product.metafields.custom.enable_offer.value == true or product.metafields.custom.enable_offer.value == 'true' %}
      <div class="gemini-offer-wrapper" style="margin-bottom: 20px;">
          
          <button type="button" id="offerTriggerBtn" onclick="window.showOfferForm()" style="width: 100%; padding: 14px; background-color: #111827; color: #ffffff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 14px; letter-spacing: 0.1em; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background-color 0.2s;">
            🤝 Make an Offer
          </button>

        <!-- Modal Backdrop Overlay -->
        <div id="makeOfferModalOverlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 100000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
          <div style="background: #ffffff; border-radius: 12px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; padding: 25px; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.15); box-sizing: border-box; text-align: left;">
            
            <!-- Close Button (×) -->
            <button type="button" onclick="window.hideOfferForm()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; font-weight: 300; cursor: pointer; color: #9ca3af; line-height: 1;">
              &times;
            </button>

            <!-- Offer Negotiation Form Content -->
            <div id="offerFormState" style="display: block;">
              
              <!-- Real-Time Price Comparison Header -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #64748b; font-size: 14px;">
                  <span>Website Price (incl. GST):</span>
                  <span style="text-decoration: line-through; font-weight: 500;">{{ breakdown.total | money }}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1e293b; font-size: 16px; align-items: center;">
                  <span>Your Offered Price (incl. GST):</span>
                  <span id="offeredTotalDisplay" style="color: #10b981;">{{ breakdown.total | money }}</span>
                </div>
                <div id="savingsDisplay" style="text-align: right; font-size: 12px; color: #10b981; font-weight: 600; margin-top: 6px; margin-bottom: 12px;">
                  You save: Rs. 0.00
                </div>

                <!-- Dynamic Itemized Calculation Card inside Modal -->
                <div id="modalOfferDetailBreakdown" style="border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>🪙 Gold Price (Fixed):</span>
                    <span id="modalGoldVal">{{ breakdown.metal_value | money }}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>🛠️ Making Charges:</span>
                    <span id="modalMakingVal">{{ breakdown.making_charges | money }}</span>
                  </div>
                  {% if has_stones %}
                  <div style="display: flex; justify-content: space-between;">
                    <span>💎 Gemstones:</span>
                    <span id="modalGemstoneVal">{{ breakdown.gemstone_price | money }}</span>
                  </div>
                  {% endif %}
                  <div style="display: flex; justify-content: space-between;">
                    <span>🧾 GST ({{ breakdown.gst_pct }}%):</span>
                    <span id="modalGstVal">{% assign gst_val = breakdown.gst_amount | default: breakdown.gst | default: 0 %}{{ gst_val | money }}</span>
                  </div>
                </div>
              </div>

              <form id="offerNegotiationForm" novalidate>
                <!-- Negotiation Inputs -->
                <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                  
                  <!-- Making Charges Bubbles -->
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 8px;">
                      Making Charges Offer <span style="font-weight: normal; color: #6b7280;">(Current: ₹{{ breakdown.making_charge_rate }}/g)</span>
                    </label>
                    <div class="making-bubbles-container" style="display: flex; gap: 8px; flex-wrap: wrap;">
                      {% for bubble in breakdown.making_charge_bubbles %}
                        <button type="button" class="making-bubble-btn {% if forloop.first %}active{% endif %}" data-rate="{{ bubble }}" onclick="window.selectMakingBubble(this)" style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 20px; background: {% if forloop.first %}#111827{% else %}#ffffff{% endif %}; color: {% if forloop.first %}#ffffff{% else %}#333333{% endif %}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                          ₹{{ bubble }}/g
                        </button>
                      {% endfor %}
                    </div>
                    <input type="hidden" id="offerMakingInput" value="{{ breakdown.making_charge_bubbles[0] }}">
                  </div>
                  
                  <!-- Stone Discount Dropdown (if stones exist) -->
                  {% if has_stones %}
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 8px;">
                      Stone Value Discount
                    </label>
                    <select id="stoneDiscountSelect" onchange="window.handleStoneDiscountChange(this)" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background-color: white; font-weight: 500;">
                      {% for opt in breakdown.stone_discount_options %}
                        <option value="{{ opt }}">{{ opt }}</option>
                      {% endfor %}
                    </select>
                    
                    <div id="customStoneDiscountWrapper" style="display: none; margin-top: 10px;">
                      <label style="display: block; font-size: 11px; color: #4b5563; margin-bottom: 4px;">Enter custom stone discount (%)</label>
                      <input type="number" id="customStoneDiscountInput" min="0" max="100" placeholder="e.g. 15" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                    </div>
                  </div>
                  {% endif %}
                </div>

                <!-- Customer Details -->
                <div style="border-top: 1px solid #f3f4f6; padding-top: 15px; margin-bottom: 20px;">
                  <h4 style="margin: 0 0 15px 0; font-size: 13px; font-weight: bold; color: #374151; text-transform: uppercase;">
                    Customer Details
                  </h4>
                  
                  <div style="margin-bottom: 12px;">
                    <label for="negName" style="display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; font-weight: 500;">Your Full Name *</label>
                    <input type="text" id="negName" required placeholder="e.g. Rahul Sharma" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                  </div>

                  <div style="margin-bottom: 12px;">
                    <label for="negPhone" style="display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; font-weight: 500;">WhatsApp / Mobile Number *</label>
                    <input type="tel" id="negPhone" required placeholder="10-digit mobile number" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                  </div>

                  <div style="margin-bottom: 12px;">
                    <label for="negEmail" style="display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; font-weight: 500;">Email Address (Optional)</label>
                    <input type="email" id="negEmail" placeholder="e.g. rahul@example.com" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                  </div>

                  <div style="display: flex; gap: 15px;">
                    <div style="flex: 1;">
                      <label for="negPincode" style="display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; font-weight: 500;">Pincode *</label>
                      <input type="text" id="negPincode" required placeholder="6 digits" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="flex: 1;">
                      <label for="negCity" style="display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; font-weight: 500;">City *</label>
                      <input type="text" id="negCity" required placeholder="Your City" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                    </div>
                  </div>
                </div>

                <div id="negErrorMsg" style="display: none; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 6px; font-weight: 600; margin-bottom: 15px; text-align: center; font-size: 13px;"></div>

                <div style="display: flex; gap: 10px;">
                  <button type="submit" id="negSubmitBtn" style="flex: 2; padding: 14px; background-color: #10b981; color: #ffffff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 14px;">
                    Submit Offer
                  </button>
                  <button type="button" onclick="window.hideOfferForm()" style="flex: 1; padding: 14px; background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 14px;">
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            <!-- Success State with Direct WhatsApp Quote Link -->
            <div id="negSuccessState" style="display: none; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 18px; font-weight: bold;">Offer Submitted Successfully!</h3>
              <p style="margin: 0 0 8px 0; color: #047857; font-size: 14px;">
                Your Offer ID: <span id="successOfferId" style="font-weight: 700; color: #065f46;"></span>
              </p>
              <button type="button" id="whatsAppRedirectBtn" style="width: 100%; padding: 14px; background-color: #25d366; color: #ffffff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-top: 15px;">
                💬 Continue on WhatsApp
              </button>
            </div>

          </div>
        </div>
      </div>
    {% endif %}


    <!-- ==================== 2. TRANSPARENT PRICE BREAKDOWN TABLE ==================== -->
    {% assign show_breakdown = true %}
    {% if product.metafields.custom.enable_breakdown.value == false or product.metafields.custom.enable_breakdown.value == 'false' %}
      {% assign show_breakdown = false %}
    {% endif %}
    {% if total_original_raw <= 0 %}
      {% assign show_breakdown = false %}
    {% endif %}

    {% if show_breakdown %}
      <div class="gemini-price-breakdown" style="border: 1px solid #e1e3e5; border-radius: 8px; overflow: hidden; background: #ffffff; margin-top: 15px;">
        <div style="background-color: #f9fafb; padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #e1e3e5; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
          <span>Transparent Price Breakdown</span>
          <span style="font-size: 12px; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; font-weight: 600;">100% Certified</span>
        </div>
        
        <div id="breakdownTableContent" style="display: block;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              
              <!-- 1. Gold Rate & Metal Value -->
              <tr style="border-bottom: 1px solid #f1f2f3;">
                <td style="padding: 10px 16px; color: #374151;">
                  🪙 {{ breakdown.metal_name | default: 'Gold' }} ({{ breakdown.weight | default: product.variants.first.weight | divided_by: 1000.0 }}g)
                </td>
                <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #111827;">
                  {{ breakdown.metal_value | money }}
                </td>
              </tr>

              <!-- 2. Making Charges -->
              <tr style="border-bottom: 1px solid #f1f2f3;">
                <td style="padding: 10px 16px; color: #374151;">
                  🛠️ Making Charges
                </td>
                <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #111827;">
                  {{ breakdown.making_charges | money }}
                </td>
              </tr>

              <!-- 3. Gemstones / Moissanite (if any) -->
              {% if gemstone_price_raw > 0 %}
              <tr style="border-bottom: 1px solid #f1f2f3;">
                <td style="padding: 10px 16px; color: #374151;">
                  💎 Gemstone / Stone Cost
                </td>
                <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #111827;">
                  {{ breakdown.gemstone_price | money }}
                </td>
              </tr>
              {% endif %}

              <!-- 4. GST (3%) -->
              <tr style="border-bottom: 1px solid #e1e3e5;">
                <td style="padding: 10px 16px; color: #374151;">
                  🏛️ Applicable GST ({{ breakdown.gst_pct | default: 3 }}%)
                </td>
                <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #111827;">
                  {% assign gst_amount_calc = breakdown.gst_amount | default: breakdown.gst | default: 0 %}
                  {{ gst_amount_calc | money }}
                </td>
              </tr>

              <!-- 5. Final Total Price -->
              <tr style="background-color: #f9fafb; font-weight: bold; font-size: 15px;">
                <td style="padding: 12px 16px; color: #111827;">Total Price</td>
                <td style="padding: 12px 16px; text-align: right; color: #b8860b; font-size: 16px;">
                  {{ breakdown.total | money }}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    {% endif %}

  </div>

  <!-- ==================== 3. EMBEDDED REAL-TIME JS ENGINE ==================== -->
  <script>
    (function() {
      var breakdownData = {{ breakdown | json }};
      var currentMakingRate = breakdownData.making_charge_rate || 1500;
      var currentStoneDiscountPct = 0;

      window.showOfferForm = function() {
        var modal = document.getElementById('makeOfferModalOverlay');
        if (modal) {
          modal.style.display = 'flex';
          recalcOffer();
        }
      };

      window.hideOfferForm = function() {
        var modal = document.getElementById('makeOfferModalOverlay');
        if (modal) modal.style.display = 'none';
      };

      window.selectMakingBubble = function(btn) {
        document.querySelectorAll('.making-bubble-btn').forEach(function(b) {
          b.style.background = '#ffffff';
          b.style.color = '#333333';
        });
        btn.style.background = '#111827';
        btn.style.color = '#ffffff';
        currentMakingRate = parseFloat(btn.getAttribute('data-rate'));
        document.getElementById('offerMakingInput').value = currentMakingRate;
        recalcOffer();
      };

      window.handleStoneDiscountChange = function(sel) {
        var val = sel.value;
        if (val === 'Custom') {
          document.getElementById('customStoneDiscountWrapper').style.display = 'block';
          currentStoneDiscountPct = parseFloat(document.getElementById('customStoneDiscountInput').value) || 0;
        } else {
          document.getElementById('customStoneDiscountWrapper').style.display = 'none';
          currentStoneDiscountPct = parseFloat(val.replace('%', '')) || 0;
        }
        recalcOffer();
      };

      function recalcOffer() {
        var weight = breakdownData.weight || ({{ product.variants.first.weight }} / 1000.0) || 0;
        var metalVal = breakdownData.metal_value || 0;
        var originalMaking = breakdownData.making_charges || 0;
        var originalGem = breakdownData.gemstone_price || 0;
        var gstPct = breakdownData.gst_pct || 3;

        // New Making = weight * selected bubble rate
        var newMaking = Math.round(weight * currentMakingRate * 100);
        var newGem = Math.round(originalGem * (1 - (currentStoneDiscountPct / 100.0)));
        var subtotal = metalVal + newMaking + newGem;
        var gst = Math.round(subtotal * (gstPct / 100.0));
        var total = subtotal + gst;

        var fmt = function(paise) { return 'Rs. ' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); };

        if (document.getElementById('offeredTotalDisplay')) document.getElementById('offeredTotalDisplay').innerText = fmt(total);
        if (document.getElementById('modalMakingVal')) document.getElementById('modalMakingVal').innerText = fmt(newMaking);
        if (document.getElementById('modalGemstoneVal')) document.getElementById('modalGemstoneVal').innerText = fmt(newGem);
        if (document.getElementById('modalGstVal')) document.getElementById('modalGstVal').innerText = fmt(gst);

        var originalTotal = breakdownData.total || 0;
        var savings = Math.max(0, originalTotal - total);
        if (document.getElementById('savingsDisplay')) document.getElementById('savingsDisplay').innerText = 'You save: ' + fmt(savings);
      }

      // Handle Form Submit
      var form = document.getElementById('offerNegotiationForm');
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          var btn = document.getElementById('negSubmitBtn');
          btn.disabled = true;
          btn.innerText = 'Processing...';

          var payload = {
            shopDomain: '{{ shop.permanent_domain }}',
            productId: '{{ product.id }}',
            variantId: '{{ current_variant.id }}',
            productTitle: {{ product.title | json }},
            sku: '{{ current_variant.sku }}',
            customerName: document.getElementById('negName').value,
            customerPhone: document.getElementById('negPhone').value,
            customerEmail: document.getElementById('negEmail').value,
            pincode: document.getElementById('negPincode').value,
            city: document.getElementById('negCity').value,
            offeredMakingRate: currentMakingRate,
            stoneDiscountPct: currentStoneDiscountPct
          };

          fetch('https://dagina.cloud/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            document.getElementById('offerFormState').style.display = 'none';
            document.getElementById('negSuccessState').style.display = 'block';
            document.getElementById('successOfferId').innerText = data.offerId || 'OFFER-' + Date.now();
            
            var waBtn = document.getElementById('whatsAppRedirectBtn');
            if (waBtn && data.whatsappUrl) {
              waBtn.onclick = function() { window.open(data.whatsappUrl, '_blank'); };
            }
          })
          .catch(function(err) {
            alert('Failed to submit offer. Please try again.');
            btn.disabled = false;
            btn.innerText = 'Submit Offer';
          });
        });
      }
    })();
  </script>
{% endif %}
```

---

## 🛠️ Step 2: Render Widget in Product Template

1. In the Shopify Theme Code Editor, open **`sections/main-product.liquid`** (or if your theme uses blocks, locate where price/buttons are rendered).
2. Locate the buy buttons block:
   ```liquid
   {%- render 'buy-buttons', block: block, product: product -%}
   ```
3. Immediately below it, paste this line:
   ```liquid
   {% render 'gemini-price-breakdown-enhanced', product: product %}
   ```
4. Click **Save**.

---

## ⚙️ How It Connects to Dagina Cloud Dashboard

| Feature | Controlled By Metafield | Dagina Cloud UI Control |
| :--- | :--- | :--- |
| **Price Breakdown** | `custom.enable_breakdown` (boolean) | Click **Breakdown ON / OFF** badge in Dagina Cloud table or use **Bulk Edit**. |
| **Make An Offer** | `custom.enable_offer` (boolean) | Click **Offer ON / OFF** badge in Dagina Cloud table or use **Bulk Edit**. |
| **Live Rates & Calculations** | `gemini.price_breakdown` (JSON) | Automatically synced when gold rates change or you click **Push to Shopify**. |
| **Wastage Display** | *Removed* | Completely omitted from the customer-facing storefront. |
| **Invoice / Checkout** | Draft Orders API | Generates real-time Shopify draft orders with `taxes_included: true` to prevent double GST calculation. |
