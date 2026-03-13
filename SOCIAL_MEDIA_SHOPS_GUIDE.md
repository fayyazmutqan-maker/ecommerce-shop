# Social Media Shops — Complete Setup & Management Guide

> **Version**: 1.0 | **Last Updated**: March 2026  
> This guide walks you through connecting, configuring, and managing every social media shop integration available in your e-commerce platform — from onboarding to daily operations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Meta Commerce (Facebook & Instagram)](#3-meta-commerce-facebook--instagram)
4. [Google Merchant Center](#4-google-merchant-center)
5. [WhatsApp Business](#5-whatsapp-business)
6. [TikTok Shop](#6-tiktok-shop)
7. [Snapchat Shop](#7-snapchat-shop)
8. [Managing Orders Across Channels](#8-managing-orders-across-channels)
9. [Managing Payments](#9-managing-payments)
   - [Refunds, Partial Refunds & Exchanges](#97-refunds-partial-refunds--exchanges)
10. [Product Sync & Inventory](#10-product-sync--inventory)
11. [Troubleshooting](#11-troubleshooting)
12. [FAQ](#12-faq)

---

## 1. Overview

Your store supports selling on **six platforms** through a unified dashboard:

| Platform | Connection Method | Product Sync | Order Import | Webhooks |
|----------|------------------|--------------|--------------|----------|
| Facebook | OAuth 2.0 | ✅ Batch | ✅ Auto | ✅ HMAC |
| Instagram | OAuth 2.0 | ✅ Batch | ✅ Auto | ✅ HMAC |
| Google Merchant | OAuth 2.0 | ✅ Batch | ❌ Manual | ❌ Polling |
| WhatsApp Business | Manual Token | ✅ Batch | ✅ Auto | ✅ HMAC |
| TikTok Shop | OAuth 2.0 | ✅ Individual | ✅ Auto | ✅ HMAC |
| Snapchat | OAuth 2.0 | ✅ Batch | ❌ Manual | ✅ HMAC |

All channels are managed from **Admin → Sales Channels**.

---

## 2. Prerequisites

Before connecting any social media shop, make sure you have:

### 2.1 Store Setup

- [ ] Products created and set to **Active** status
- [ ] Product images uploaded (at least one per product)
- [ ] Prices and inventory configured
- [ ] Shipping zones configured (Admin → Shipping Zones)
- [ ] Payment provider connected (see [Section 9](#9-managing-payments))

### 2.2 Platform Developer Accounts

Each platform requires its own developer account and app credentials. These are entered as environment variables on your server:

| Platform | Required Credentials |
|----------|---------------------|
| Meta (Facebook/Instagram) | `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` |
| Google Merchant | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| WhatsApp Business | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| TikTok Shop | `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET` |
| Snapchat | `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET` |

> **Important**: All credentials are optional. You only need to configure the platforms you want to use.

### 2.3 Staff Permissions

The staff member connecting channels must have the **channels** permission enabled in Admin → Staff.

---

## 3. Meta Commerce (Facebook & Instagram)

Meta Commerce lets you sell products directly on Facebook Shops and Instagram Shopping. This is the most feature-rich integration, including order import, Conversions API tracking, and webhook-driven automation.

### 3.1 Creating a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in the app name and contact email
5. Once created, go to **App Settings** → **Basic**
6. Copy the **App ID** and **App Secret**
7. Add these to your server environment:
   ```
   META_APP_ID=your_app_id_here
   META_APP_SECRET=your_app_secret_here
   ```
8. Under **Products**, add:
   - **Facebook Login**
   - **Catalog** (Commerce)
   - **Webhooks**

### 3.2 Configuring the Webhook

1. In your Meta App dashboard, go to **Webhooks**
2. Click **Subscribe to this object** for **Page**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/channels/meta/webhook
   ```
4. Enter a verify token of your choice and save it as:
   ```
   META_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
   ```
5. Subscribe to these webhook fields:
   - `feed`
   - `orders` (Commerce Orders)

### 3.3 Connecting Meta from Admin Dashboard

1. Navigate to **Admin → Sales Channels**
2. Click the **Connect Meta** button in the top-right
3. You will be redirected to Facebook login
4. Log in and grant the requested permissions:
   - Manage your Pages
   - Manage product catalogs
   - Access Commerce features
5. After approving, you'll be redirected back to your admin dashboard
6. A success toast notification will confirm the connection
7. The new channel will appear in your channel list with **Active** status

> **What happens automatically**: The system exchanges your authorization code for a long-lived token (valid 60 days), discovers your Facebook Pages, Business accounts, Instagram accounts, and product catalogs, then activates the channel.

### 3.4 Configuring Channel Settings

1. Click the **Settings** (gear icon) button on your Meta channel card
2. Configure the following:

| Setting | Description |
|---------|-------------|
| **Channel Name** | A friendly name for this connection (e.g., "My Facebook Shop") |
| **Facebook Page** | Select which Facebook Page to associate with this shop |
| **Product Catalog** | Select or create a product catalog from your Meta Business account |
| **Meta Pixel ID** | Enter your Pixel ID for server-side conversion tracking via the Conversions API |
| **Auto Sync Products** | When ON, any product changes in your store automatically push to Meta |
| **Sync Inventory** | When ON, stock level changes sync in real-time |
| **Import Orders** | When ON, orders placed through Facebook/Instagram Shops are automatically imported into your store |

3. Click **Save Settings**

### 3.5 Syncing Products

**Automatic sync** (recommended):
- Enable **Auto Sync Products** in channel settings
- Every time you create, update, or delete a product in your store, it automatically syncs to your Meta catalog

**Manual sync**:
1. Open the channel's **Settings** dialog
2. Scroll down and click **Sync Products Now**
3. The sync progress will appear in the **Recent Sync Activity** table at the bottom

**What syncs**:
- Product name, description, SKU
- Price and compare-at price (sale price)
- All product images (up to 10)
- Stock availability
- Product variants (each variant becomes a separate catalog item)
- Brand / Vendor

### 3.6 Managing Facebook & Instagram Orders

When **Import Orders** is enabled:

1. A customer places an order through your Facebook Shop or Instagram Shopping
2. Meta sends a webhook notification to your store
3. The order is automatically created in **Admin → Orders** with:
   - All line items with correct pricing
   - Customer shipping address
   - A reference to the original Meta order ID
4. You fulfill the order from your admin (Admin → Orders → select order → Manage Fulfillment)
5. Fulfillment status is pushed back to Meta so the customer sees tracking on Facebook/Instagram

#### How Payment Works for Facebook & Instagram Orders

Payment for Facebook/Instagram Shop orders is **handled entirely by Meta** — your store does not process the payment. Here's the full flow:

```
Customer sees product on Facebook/Instagram
    ↓
Customer taps "Buy Now" → Enters payment details on Facebook/Instagram checkout
    ↓
Meta collects payment (card, PayPal, etc.) directly from the customer
    ↓
Meta sends order webhook to your store
    ↓
Your store imports the order with paymentStatus = "PAID" and paymentMethod = "META_COMMERCE"
    ↓
Your store automatically acknowledges the order on Meta (moves to IN_PROGRESS)
    ↓
You fulfill the order → Meta notifies the customer of shipping/tracking
```

**Key points**:
- **You never touch payment details** — Meta handles all payment processing, card charges, and PCI compliance on their side
- Orders arrive in your store **already marked as PAID** — no further payment action is needed from you
- The payment method is recorded as **META_COMMERCE** so you can distinguish these from Tap Payments or COD orders
- Meta extracts tax, shipping, and total amounts from the order and these are preserved in your local order record
- Order currency comes from Meta (defaults to SAR if not specified)

#### Order Acknowledgment

When an order is imported, your store **automatically acknowledges** it on Meta's side. This is required by Meta to move the order from "Created" to "In Progress" — if you skip this, Meta may cancel the order after a timeout.

#### Fulfillment, Cancellations & Refunds

All three actions are **fully automatic** — when you take action in your admin dashboard, the system pushes the status change to Meta in real-time:

| Action | What Happens on Meta |
|--------|---------------------|
| **Fulfill order** (add tracking) | Customer sees shipping info and tracking on Facebook/Instagram |
| **Cancel order** | Cancellation is pushed to Meta → Meta processes a full reversal and refunds the customer |
| **Refund order** (full or partial) | Refund is pushed to Meta → Meta refunds the specified amount to the customer's original payment method |

> **Important**: For Facebook/Instagram orders, always process cancellations and refunds through your admin dashboard — the system automatically syncs these to Meta, and Meta handles the actual money movement back to the customer. You do **not** need to take any manual action on Meta's Commerce Manager side.

#### ZATCA Tax Compliance (Saudi Arabia)

Meta Commerce orders are **automatically reported to ZATCA** just like regular store orders. Here's how it works:

| Step | What Happens |
|------|-------------|
| **1. Order arrives** | Meta webhook imports the order as `PAID` with `META_COMMERCE` payment method |
| **2. Invoice generated** | The system automatically generates a UBL 2.1 XML invoice with your VAT number, store details, line items, and tax amounts |
| **3. Reported to ZATCA** | The invoice is submitted to ZATCA's reporting API (simplified B2C invoice, type 388) |
| **4. Status updated** | Order's `zatcaStatus` changes from `PENDING` → `REPORTED` (or `FAILED` if there's an issue) |
| **5. Refund (if any)** | When you refund a Meta order, a **credit note** (type 381) is generated and reported to ZATCA referencing the original invoice |
| **6. Cancellation (if any)** | When you cancel an order that was already reported, a **full credit note** is automatically generated and reported to ZATCA |

**Key points:**
- Even though **Meta collects the payment**, the invoice is issued under **your store's VAT registration** because you are the seller of record
- Tax amounts from Meta's order data are preserved in the ZATCA invoice
- If ZATCA reporting fails (e.g. network issue), the order's `zatcaStatus` is set to `FAILED` — you can retry via **Admin → Orders → order details** or the retry API endpoint
- Invoice numbering follows the same sequential counter as regular orders, maintaining the unbroken chain required by ZATCA

### 3.7 Conversion Tracking (Conversions API)

Your store has **Meta Conversions API** fully built-in and pre-configured. It works automatically — no extra setup is needed beyond entering your **Meta Pixel ID** in the channel settings (Section 3.4).

Once a Pixel ID is saved, the following happens automatically:

#### Server-Side Events (automatic, no action required)

| Event | When It Fires | What Data Is Sent |
|-------|---------------|-------------------|
| **Purchase** | Customer completes an order | Order ID, total value, currency, product IDs, quantities, item prices |
| **ViewContent** | Customer views a product page | Product ID, product name, price, currency |
| **AddToCart** | Customer adds a product to cart | Product ID, price, currency, quantity |
| **InitiateCheckout** | Customer starts checkout | Cart value, currency, all product IDs and quantities |
| **Search** | Customer uses the search bar | Search query text |
| **PageView** | Customer loads any page | Page URL |

#### How It Works

1. **Server-side tracking**: Events are sent directly from your server to Meta's Conversions API — this bypasses ad blockers and browser privacy restrictions that would block the client-side Meta Pixel
2. **Client-side hook**: A built-in React hook (`useMetaTracking`) also fires the same events from the customer's browser, sending them through your server endpoint (`/api/channels/meta/events`) to Meta
3. **Deduplication**: Each event includes a unique `event_id` — Meta automatically deduplicates identical events received from both the server and the browser, so conversions are never double-counted
4. **Multi-channel support**: If you have multiple Meta channels with Pixel IDs configured (e.g., one for Facebook, one for Instagram), events are sent to **all** of them simultaneously

#### Privacy & Security (handled automatically)

- Customer **email** and **phone** are **SHA-256 hashed** before leaving your server — Meta never receives raw personal data
- Browser attribution cookies (`_fbc` for click ID, `_fbp` for browser ID) are extracted from the request and forwarded so Meta can match the conversion back to the ad that drove it
- Customer **IP address** and **user agent** are forwarded for geographic and device matching
- Internal user IDs are hashed before sending

#### What You Need to Do

1. Enter your **Meta Pixel ID** in the channel settings (Section 3.4) — that's it
2. Everything else is automatic. No code changes, no additional configuration, no tag manager setup required

> **Tip**: You can find your Pixel ID in Meta Events Manager → Data Sources → select your Pixel → the ID is displayed at the top. It's a numeric string like `123456789012345`.

---

## 4. Google Merchant Center

Google Merchant Center lets your products appear in Google Shopping search results, Google Images, and the Shopping tab.

### 4.1 Creating Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Set the application type to **Web application**
6. Add your authorized redirect URI:
   ```
   https://yourdomain.com/api/channels/google/callback
   ```
7. Copy the **Client ID** and **Client Secret**
8. Add to your environment:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```
9. Enable the **Content API for Shopping** in your Google Cloud project:
   - Go to **APIs & Services** → **Library**
   - Search for "Content API for Shopping"
   - Click **Enable**

### 4.2 Setting Up Google Merchant Center

1. Go to [Google Merchant Center](https://merchants.google.com/)
2. Sign up or sign in with your Google account
3. Complete the business information:
   - Business name
   - Country and time zone
   - Business address
4. Verify and claim your website URL
5. Accept the Terms of Service

### 4.3 Connecting Google from Admin Dashboard

1. Navigate to **Admin → Sales Channels**
2. Click **Connect Google**
3. You'll be redirected to Google's sign in page
4. Select the Google account that owns your Merchant Center
5. Grant the requested permissions for managing Shopping content
6. After approval, you'll be redirected back to your admin
7. The system auto-discovers your Merchant Center accounts

### 4.4 Configuring Channel Settings

1. Click **Settings** on the Google channel card
2. Configure:

| Setting | Description |
|---------|-------------|
| **Channel Name** | Friendly name (e.g., "Google Shopping — Saudi Arabia") |
| **Merchant Account** | Select from your discovered Merchant Center accounts |
| **Content Language** | **English** or **Arabic** — the language for product listings |
| **Target Country** | The country where products will appear (SA, AE, KW, BH, QA, OM, EG, JO, US, GB) |
| **Auto Sync Products** | Auto-push product changes to Google |
| **Sync Inventory** | Keep stock levels synchronized |

3. Click **Save Settings**

### 4.5 Syncing Products

**Automatic sync**:
- Enable Auto Sync and any product change pushes to Google automatically via the Content API

**Manual sync**:
1. Open Settings → click **Sync Products Now**
2. Products are synced in batches via the Google Content API

**What syncs**:
- Product title, description, link, image URL
- Price and sale price (formatted in local currency, e.g., "49.99 SAR")
- Availability (in stock / out of stock)
- GTIN / barcode
- Brand
- Product type and category
- Content language and target country

### 4.6 Monitoring Product Status

In the Settings dialog, the **Product Status** section shows a summary from Google:

| Status | Meaning |
|--------|---------|
| **Approved** ✅ | Products are live and showing in Google Shopping |
| **Pending** ⏳ | Products are under review by Google |
| **Disapproved** ❌ | Products have policy violations — check Google Merchant Center for details |

### 4.7 Managing Google Orders

Google Merchant Center does **not** push orders via webhook. Orders from Google Shopping land in your payment provider (e.g., customers click through to your store and checkout normally). These orders appear in **Admin → Orders** like any standard order.

If you use Google's Buy on Google program, orders are managed directly in the Google Merchant Center dashboard.

---

## 5. WhatsApp Business

WhatsApp Business lets you share your product catalog with customers via WhatsApp and receive orders directly through chat.

### 5.1 Setting Up WhatsApp Business API

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to **WhatsApp** → **API Setup**
3. Create a **System User** with admin permissions
4. Generate a **Permanent Access Token** with the following scopes:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `catalog_management`
5. Note down:
   - **Access Token** (permanent system user token)
   - **WhatsApp Business Account ID** (WABA ID)
   - **Phone Number ID**

6. Add to your environment:
   ```
   WHATSAPP_ACCESS_TOKEN=your_permanent_token
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```

### 5.2 Configuring Webhooks

1. In Meta Business Suite, go to **WhatsApp** → **Configuration**
2. Under **Webhooks**, set the callback URL:
   ```
   https://yourdomain.com/api/channels/whatsapp/webhook
   ```
3. Set the verify token and save it as:
   ```
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
   ```
4. Subscribe to these webhook fields:
   - `messages`
   - `message_status`

### 5.3 Connecting WhatsApp from Admin Dashboard

1. Navigate to **Admin → Sales Channels**
2. Click **Connect WhatsApp**
3. A dialog will appear asking for your credentials:
   - **Access Token**: Paste the permanent system user token
   - **WABA ID**: Your WhatsApp Business Account ID
   - **Phone Number ID**: The phone number to use for messaging
4. Click **Connect**
5. The system verifies your credentials by fetching phone numbers and business profile
6. On success, the channel appears as **Active**

> **Note**: WhatsApp uses manual token entry (not OAuth redirect) because it requires a permanent system user token from Meta Business Suite.

### 5.4 Configuring Channel Settings

1. Click **Settings** on the WhatsApp channel card
2. Configure:

| Setting | Description |
|---------|-------------|
| **Channel Name** | Friendly name (e.g., "WhatsApp Store") |
| **Product Catalog** | Select the Meta Commerce catalog linked to your WhatsApp number |
| **Auto Sync Products** | Auto-push product changes to WhatsApp catalog |
| **Sync Inventory** | Sync stock levels |

3. The settings also display **read-only** information:
   - **Connected Phone Numbers** with quality rating
   - **Business Profile** (about, description, address, category, websites)

4. Click **Save Settings**

### 5.5 Syncing Products to WhatsApp Catalog

Products sync to your WhatsApp catalog just like Meta Commerce (they share the same Meta Catalog system):

- **Auto Sync**: Enable and products push automatically
- **Manual Sync**: Click **Sync Products Now** in settings

Once synced, customers can browse your catalog directly in WhatsApp chat using the Catalog button.

### 5.6 Receiving Orders via WhatsApp

When a customer orders through WhatsApp:

1. Customer browses your catalog in WhatsApp and taps **Add to Cart**
2. Customer sends the cart as an order message
3. Your webhook receives the order and:
   - Creates a `channelOrder` record
   - Sends an automatic confirmation message to the customer:  
     *"Thank you for your order! 🛍️ We received your order with X items totaling XX.XX SAR. Our team will process it shortly."*
4. The order appears in **Admin → Orders**
5. You process and fulfill the order normally

### 5.7 Automated Customer Replies

The WhatsApp integration includes automatic responses:

| Customer Message | Auto Response |
|------------------|---------------|
| Contains "order" or "status" | Looks up their most recent order by phone number and replies with order status |
| General text message | Logged for manual follow-up |
| Interactive/button reply | Logged for future handling |

---

## 6. TikTok Shop

TikTok Shop lets you sell directly on TikTok through in-app shopping, live shopping, and product showcases.

### 6.1 Creating a TikTok Shop Seller Account

1. Go to [TikTok Shop Seller Center](https://seller.tiktok.com/)
2. Sign up as a seller
3. Complete business verification:
   - Business license / registration
   - ID verification
   - Banking / payment information
4. Wait for approval (typically 1–3 business days)

### 6.2 Registering a TikTok Developer App

1. Go to [TikTok Open Platform](https://partner.tiktokshop.com/)
2. Create a new app under **App Management**
3. Request the following API permissions:
   - Product management
   - Order management
   - Inventory management
   - Fulfillment management
4. Once approved, copy:
   - **App Key**
   - **App Secret**
5. Add to your environment:
   ```
   TIKTOK_APP_KEY=your_app_key
   TIKTOK_APP_SECRET=your_app_secret
   ```

### 6.3 Connecting TikTok from Admin Dashboard

1. Navigate to **Admin → Sales Channels**
2. Click **Connect TikTok**
3. You'll be redirected to TikTok's authorization page
4. Log in with your TikTok Shop seller account
5. Authorize the app to access your shop data
6. After approval, you'll be redirected back to your admin
7. The system discovers your authorized shops and activates the channel

### 6.4 Configuring Channel Settings

1. Click **Settings** on the TikTok channel card
2. Configure:

| Setting | Description |
|---------|-------------|
| **Channel Name** | Friendly name (e.g., "TikTok Shop — Saudi Arabia") |
| **TikTok Shop** | Select from discovered shops (shows region, e.g., "My Shop (SA)") |
| **Default Product Category** | **Required** — TikTok requires a category for every product. Choose a leaf category that best describes your products. |
| **Warehouse** | Select the warehouse for inventory and fulfillment tracking |
| **Auto Sync Products** | Auto-push changes to TikTok |
| **Sync Inventory** | Sync stock levels |
| **Import Orders** | Auto-import TikTok orders into your store |

3. Click **Save Settings**

> **Important**: The **Default Product Category** is mandatory. TikTok will reject products without a category. Choose the most specific (leaf) category that matches your products.

### 6.5 Syncing Products

TikTok Shop uses **individual product API calls** (not batch like Meta), so syncs may take longer for large catalogs:

**Auto sync**: Enable Auto Sync for real-time push
**Manual sync**: Click **Sync Products Now**

**What syncs**:
- Product title, description
- Price in minor units (TikTok format)
- Images (pre-uploaded via TikTok's image API — they issue their own image URIs)
- Product variants with SKUs
- Inventory / stock quantities
- Weight (converted to kilograms)
- Default category assignment

> **Note**: TikTok requires images to be uploaded to their servers first. The sync service handles this automatically by uploading via `uploadImageByUrl` before creating the product.

### 6.6 Managing TikTok Orders

When a customer purchases through TikTok (in-app checkout, live shopping, etc.):

1. TikTok sends a webhook notification with the order ID
2. Your store **automatically fetches the full order details** from TikTok's Order API (items, prices, quantities, shipping fees)
3. A real order is created in your **Admin → Orders** dashboard with:
   - Status: `CONFIRMED`
   - Payment status: `PAID` (TikTok handles payment)
   - Payment method: `TIKTOK_SHOP`
   - Source: `TIKTOK`
4. Products are resolved from your catalog by SKU / product ID
5. If the same order webhook fires again, it updates the status without duplicating

> **Important**: TikTok handles all payment collection. Like Meta, TikTok pays you the order amount (minus their commission) and you are responsible for VAT.

### 6.7 ZATCA Tax Compliance

TikTok Shop orders follow the **same ZATCA flow** as Meta Commerce orders:

| Step | What Happens |
|------|-------------|
| **1. Order arrives** | Webhook imports the order as `PAID` with `TIKTOK_SHOP` payment method |
| **2. Invoice generated** | System automatically generates a UBL 2.1 XML invoice |
| **3. Reported to ZATCA** | Invoice submitted to ZATCA's reporting API |
| **4. Status updated** | Order's `zatcaStatus` changes from `PENDING` → `REPORTED` |
| **5. Refund (if any)** | When refunded, a credit note is generated and reported to ZATCA |
| **6. Cancellation (if any)** | When cancelled after reporting, a full credit note is auto-generated and reported to ZATCA |

> If order details can't be fetched from TikTok's API (e.g., credentials expired), the order is stored as a tracking entry and can be retried later via **Admin → Orders** or the ZATCA retry endpoint.

### 6.8 Webhook Events

Your TikTok webhook (`/api/channels/tiktok/webhook`) processes:

| Event Type | What Happens |
|------------|--------------|
| Order status change | Imports order (first time) or updates status |
| Return/reverse order | Logs return request for manual handling |
| Product status change | Updates product sync status |

---

## 7. Snapchat Shop

Snapchat Shop lets you showcase products to Snapchat's audience through Dynamic Product Ads, Story Ads, and the Snapchat Catalog.

### 7.1 Creating a Snapchat Business Account

1. Go to [Snapchat Business Manager](https://business.snapchat.com/)
2. Create a business account (or sign in if you have one)
3. Set up your **Organization**:
   - Business name
   - Country
   - Business type
4. Create an **Ad Account** (required even for organic catalog use):
   - Set your currency (e.g., SAR)
   - Set your time zone

### 7.2 Registering a Snapchat App

1. Go to [Snap Kit Developer Portal](https://kit.snapchat.com/)
2. Create a new app
3. Enable **Snapchat Marketing API** under your app
4. Configure OAuth2:
   - Add your redirect URI:
     ```
     https://yourdomain.com/api/channels/snapchat/callback
     ```
5. Copy the **Client ID** and **Client Secret**
6. Add to your environment:
   ```
   SNAPCHAT_CLIENT_ID=your_client_id
   SNAPCHAT_CLIENT_SECRET=your_client_secret
   ```

### 7.3 Creating a Product Catalog

1. In Snapchat Business Manager, go to **Catalogs**
2. Click **Create Catalog**
3. Give it a name (e.g., "My Store Products")
4. Select the product type (e.g., E-commerce)
5. Save the catalog — it will be auto-discovered when you connect

> **Tip**: You can also create a catalog automatically during the connection process. The system will auto-discover existing catalogs.

### 7.4 Connecting Snapchat from Admin Dashboard

1. Navigate to **Admin → Sales Channels**
2. Click **Connect Snapchat**
3. You'll be redirected to Snapchat's login page
4. Sign in with the account that owns your organization
5. Authorize the app to access the Marketing API
6. After approval, you'll be redirected back to your admin
7. The system discovers:
   - Your **Organizations**
   - Available **Catalogs** under the primary organization
   - **Ad Accounts**
8. The channel activates with the primary org and catalog pre-selected

### 7.5 Configuring Channel Settings

1. Click **Settings** on the Snapchat channel card
2. Configure:

| Setting | Description |
|---------|-------------|
| **Channel Name** | Friendly name (e.g., "Snapchat Catalog") |
| **Organization** | Select which Snapchat organization to use (shows country) |
| **Product Catalog** | Select which catalog to sync products to |
| **Auto Sync Products** | Auto-push product changes to Snapchat catalog |
| **Sync Inventory** | Sync stock levels |

3. The **Ad Accounts** section displays connected accounts with their name, currency, and status (read-only)
4. Click **Save Settings**

### 7.6 Syncing Products

Snapchat uses a **batch catalog API** (similar to Meta), identified by `retailer_id` (your product SKU):

**Auto sync**: Enable for real-time changes
**Manual sync**: Click **Sync Products Now**

**What syncs**:
- Product title, description, link
- Price formatted as `"49.99 SAR"` (string with currency code)
- Sale price (from compare-at price)
- All product images (up to 10)
- Availability (in stock / out of stock)
- Brand / vendor
- GTIN / barcode
- Product variants (each variant gets a unique `retailer_id`)

**Batch limits**: Up to 5,000 products per batch request.

### 7.7 Webhook Events

Your Snapchat webhook (`/api/channels/snapchat/webhook`) processes:

| Event Type | What Happens |
|------------|--------------|
| `CATALOG_PRODUCT_UPDATE` | Logs product changes from Snapchat's side |
| `CATALOG_PRODUCT_STATUS` | Logs product approval/rejection status |
| `CATALOG_FEED_PROCESSED` | Logs when a feed upload is processed |

### 7.8 Managing Snapchat Orders

Snapchat does **not** have a native checkout. Instead, customers tap **Shop Now** and are redirected to your store's product page where they complete checkout normally. These orders appear in **Admin → Orders** like standard web orders.

To track Snapchat as a traffic source, use:
- Snap Pixel for client-side tracking
- UTM parameters on your product links

---

## 8. Managing Orders Across Channels

### 8.1 Unified Order Dashboard

All orders — whether from your website, Facebook, Instagram, WhatsApp, or TikTok — appear in **Admin → Orders**. Each order shows:

- **Order number** and date
- **Customer information**
- **Line items** with quantities and prices
- **Payment status** (paid, pending, refunded)
- **Fulfillment status** (unfulfilled, partially fulfilled, fulfilled)
- **Source channel** — badge showing where the order originated

### 8.2 Order Lifecycle

```
Order Placed → Payment Confirmed → Processing → Shipped → Delivered
                                                    ↓
                                              Return Requested → Refunded
```

### 8.3 Fulfilling Orders

1. Go to **Admin → Orders**
2. Click on an order to view details
3. Click **Create Fulfillment**
4. Enter tracking number and carrier
5. Click **Fulfill**
6. For Meta and TikTok channels, fulfillment status is automatically pushed back to the platform

### 8.4 Editing Orders

1. Open an order in **Admin → Orders**
2. Click **Edit Order**
3. You can modify:
   - Line item quantities
   - Add/remove items
   - Adjust shipping
   - Apply discounts
4. Save changes — the order total recalculates automatically

### 8.5 Channel Order Tracking

Each channel integration maintains its own order record:

| Field | Description |
|-------|-------------|
| **External Order ID** | The order ID on the source platform (e.g., Meta order ID, TikTok order ID) |
| **Channel** | Which platform the order came from |
| **Sync Status** | Whether the order was successfully imported |
| **Last Sync** | When the order was last updated |

### 8.6 Handling Returns

1. Go to **Admin → Returns**
2. Click **Create Return**
3. Select the order and items being returned
4. Choose reason and restocking preference
5. Process the return
6. For TikTok orders, return webhooks notify you of return requests automatically

---

## 9. Managing Payments

### 9.1 Payment Provider — Tap Payments

Your store uses **Tap Payments** as the primary payment gateway.

### 9.2 Setting Up Tap Payments

1. Go to [Tap Payments](https://www.tap.company/) and create a merchant account
2. Complete business verification
3. Get your API keys from the Tap dashboard:
   - **Secret Key** (starts with `sk_`)
   - **Publishable Key** (starts with `pk_`)
4. Add to your environment:
   ```
   TAP_SECRET_KEY=sk_your_secret_key
   TAP_PUBLISHABLE_KEY=pk_your_publishable_key
   ```

### 9.3 Testing the Connection

1. Go to **Admin → Settings → Payments**
2. Click **Test Connection**
3. The system will verify your API key with Tap's servers
4. A success or error message will confirm the status

### 9.4 Supported Payment Methods

| Method | How It Works |
|--------|--------------|
| **Online Payment (Tap)** | Customer is redirected to Tap's hosted payment page, completes payment, and returns to your order confirmation |
| **Cash on Delivery (COD)** | Order is placed without payment; collected upon delivery |

### 9.5 Payment Flow

```
Customer Checkout
    ↓
POST /api/payments/create-charge → Tap creates payment session
    ↓
Customer redirected to Tap hosted page → Enters card details
    ↓
Tap processes payment → Sends webhook
    ↓
GET /api/payments/callback → Verifies charge → Updates order status
    ↓
Order marked as PAID → Confirmation email sent
```

### 9.6 Payment Webhooks

Tap sends server-to-server webhooks to:
```
https://yourdomain.com/api/payments/webhook
```

These webhooks are HMAC-verified and automatically update order payment status for:
- Successful charges
- Failed charges
- Refunds
- Chargebacks

### 9.7 Refunds, Partial Refunds & Exchanges

Your store has a **unified refund system** that works identically for POS orders, online orders, and social media channel orders (Meta, TikTok, etc.). Refunds can be processed through **Admin → Orders** or directly from the **POS terminal**.

#### POS Refund (At the Register)

Cashiers can process full or partial refunds without leaving the POS screen:

1. **Open the Refund Dialog**:
   - Click the **Refund** button in the cart header (top-right of the right panel)
   - Or press **Ctrl+R** on the keyboard
2. **Search for the Order**: Type the order number or customer email to find the order
3. **Select Items to Refund**:
   - Check items individually, or click **Select All** for a full refund
   - Adjust quantities using the +/- buttons for partial refunds (e.g., refund 1 of 3 units)
4. **Choose Options**:
   - Enter a reason for the refund (optional)
   - Toggle **Restock Items** to return quantities to inventory (on by default)
5. **Process Refund**: Click "Process Refund" — the system:
   - Refunds the payment via Tap Payments (if card) or flags for manual cash refund
   - Opens the cash drawer automatically (for POS orders)
   - Prints a refund receipt (if auto-print is enabled) or shows a receipt to print manually
   - Reports a **ZATCA credit note** (type 381) if the original invoice was already reported
6. **Refund Receipt**: A special receipt is shown/printed with negative amounts and "REFUND" label

> **POS Keyboard Shortcut**: `Ctrl+R` opens the refund dialog from anywhere in the POS. The shortcut is also shown in the shortcuts bar at the top.

#### Full Refund (Admin)

1. Go to **Admin → Orders** → select the order
2. Click **Create Refund**
3. Select **Full Refund**
4. Optionally check **Restock Items** to return quantities to inventory
5. The system:
   - Refunds the full amount via Tap Payments (if the order was paid through Tap)
   - Updates order status to `REFUNDED`
   - Creates a timeline entry
   - Reports a **ZATCA credit note** (type 381) if the invoice was already reported
   - Syncs the refund to Meta (for Facebook/Instagram orders)

#### Partial Refund (Single Item or Multiple Items)

Partial refunds let you refund **specific items and quantities** without touching the rest of the order:

1. Go to **Admin → Orders** → select the order
2. Click **Create Refund**
3. Select **Partial Refund**
4. Choose the item(s) to refund:
   - Select which order item(s)
   - Specify the quantity (e.g., 1 out of 3 units)
   - Enter the refund amount per item
5. Optionally check **Restock Items**
6. The system:
   - Refunds only the specified amount via Tap Payments
   - Updates order status to `PARTIALLY_REFUNDED`
   - Creates a **partial ZATCA credit note** covering only the refunded items (not the entire invoice)
   - Syncs to Meta if applicable

> **Multiple partial refunds**: You can issue multiple partial refunds on the same order. The system tracks total refunded amount and prevents over-refunding.

#### How Refunds Differ by Order Source

| Order Source | Payment Refund | ZATCA Credit Note | Platform Sync |
|-------------|---------------|-------------------|---------------|
| **Online (Tap)** | Tap processes refund to customer's card | ✅ Auto-generated | N/A |
| **Online (COD)** | Manual — mark as refunded | ✅ Auto-generated | N/A |
| **POS** | Tap refund (card) or cash drawer opens (cash). Refund dialog built into POS terminal (Ctrl+R) | ✅ Auto-generated | N/A |
| **Meta (FB/IG)** | Refund synced to Meta → Meta refunds customer | ✅ Auto-generated | ✅ Auto-synced |
| **TikTok Shop** | TikTok handles refund on their side | ✅ Auto-generated | Manual on TikTok Seller Center |
| **Google / Snapchat** | Same as Online (customer paid on your store) | ✅ Auto-generated | N/A |

#### Item Exchange Flow

ZATCA does not have an "exchange" document type. An exchange is always handled as **two separate documents**:

```
Customer bought 3 items (Invoice 388 reported to ZATCA)
    ↓
Customer wants to exchange Item B for Item D
    ↓
Step 1: Admin creates PARTIAL REFUND for Item B
        → Credit Note (381) reported to ZATCA for Item B only
        → Inventory restocked for Item B
    ↓
Step 2: Admin creates NEW ORDER for Item D
        → New Invoice (388) reported to ZATCA for Item D
        → Inventory decremented for Item D
```

**POS exchange example:**
1. Customer at the register wants to swap a Medium shirt for a Large
2. Cashier opens the original order in Admin → creates a **partial refund** for the Medium (1 item)
3. Cashier rings up a **new POS order** for the Large
4. Both ZATCA documents (credit note for Medium, invoice for Large) are submitted automatically
5. Receipt can be reprinted for both transactions

**Online / social media exchange example:**
1. Customer contacts support requesting an exchange
2. Admin processes a **partial refund** for the returned item(s)
3. Customer places a new order (or admin creates a draft order) for the replacement
4. Same ZATCA document flow applies automatically

#### Cancellation vs Refund

| Action | When to Use | ZATCA Effect |
|--------|-------------|-------------|
| **Cancel order** | Before fulfillment — customer changed their mind | Full credit note auto-generated if invoice was already reported |
| **Full refund** | After delivery — customer wants money back for everything | Full credit note reported to ZATCA |
| **Partial refund** | Customer returns some items or gets a price adjustment | Partial credit note for only the affected items |

> **Important**: If you cancel an order that was **already reported to ZATCA**, the system automatically creates a full refund record and submits a credit note. You don't need to create a separate refund — the cancellation handles it.

### 9.8 Guest Checkout

- Both authenticated users and guest users can complete checkout
- Guest orders are linked by email address
- If a guest later creates an account with the same email, historical orders can be associated

---

## 10. Product Sync & Inventory

### 10.1 How Cross-Platform Sync Works

When you create, update, or delete a product in your store, the system automatically fans out the change to **all active channels** simultaneously:

```
Product Changed in Store
    ↓
syncProductToAllChannels(productId)
    ↓
┌─────────────────────────────────────────┐
│  Meta Catalog Sync (Facebook/Instagram) │
│  Google Merchant Sync                    │
│  WhatsApp Catalog Sync                   │
│  TikTok Shop Sync                        │
│  Snapchat Catalog Sync                   │
└─────────────────────────────────────────┘
```

Similarly, deleting or deactivating a product removes it from all connected channels.

### 10.2 Sync Types

| Sync Type | Trigger | Scope |
|-----------|---------|-------|
| **Auto Sync (Incremental)** | Product create / update / delete | Single product across all channels |
| **Manual Full Sync** | Click "Sync Products Now" | All active products to one specific channel |
| **Inventory Sync** | Stock level change | Updates availability on all channels |

### 10.3 What Gets Synced

| Field | Meta | Google | WhatsApp | TikTok | Snapchat |
|-------|------|--------|----------|--------|----------|
| Title | ✅ | ✅ | ✅ | ✅ | ✅ |
| Description | ✅ | ✅ | ✅ | ✅ | ✅ |
| Price | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sale Price | ✅ | ✅ | ✅ | ✅ | ✅ |
| Images | ✅ (up to 10) | ✅ | ✅ | ✅ (uploaded) | ✅ (up to 10) |
| SKU | ✅ | ✅ | ✅ | ✅ | ✅ |
| Barcode/GTIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| Brand/Vendor | ✅ | ✅ | ✅ | ✅ | ✅ |
| Variants | ✅ | ✅ | ✅ | ✅ | ✅ |
| Availability | ✅ | ✅ | ✅ | ✅ | ✅ |
| Weight | — | ✅ | — | ✅ (kg) | — |
| Category | — | ✅ | — | ✅ (required) | — |

### 10.4 Monitoring Sync Status

1. Open a channel's **Settings** dialog
2. View the dashboard at the top:
   - **Products Synced** — number of products successfully sent to the platform
   - **Orders Imported** — number of orders received from the platform
3. Scroll to **Recent Sync Activity** to see detailed logs:

| Column | Description |
|--------|-------------|
| Type | `CATALOG_FULL`, `CATALOG_INCREMENTAL`, `ORDER_IMPORT`, `INVENTORY_UPDATE` |
| Status | `RUNNING`, `COMPLETED`, `FAILED` |
| Items | Success count / Total count (with failure count) |
| Date | When the sync ran |

### 10.5 Handling Sync Errors

If a sync fails:

1. Check the **Recent Sync Activity** in the channel settings for error details
2. Common issues:
   - **Invalid credentials** — Token expired; reconnect the channel
   - **Rate limit exceeded** — Wait and retry; the system respects platform limits
   - **Product rejected** — Missing required fields (e.g., images, category for TikTok)
   - **Catalog not configured** — Select a catalog in channel settings
3. Fix the issue and click **Sync Products Now** to retry

### 10.6 Pausing and Resuming Channels

- Use the **toggle switch** on each channel card to pause/resume
- **Paused** channels stop syncing but retain their configuration
- **Active** channels resume normal sync operations
- Pausing does NOT remove products from the platform — it only stops new syncs

---

## 11. Troubleshooting

### 11.1 Connection Issues

| Problem | Solution |
|---------|----------|
| "Failed to start connection" | Check that environment variables are set for the platform |
| OAuth redirect fails | Verify your redirect URI matches exactly in the platform's app settings |
| "Invalid credentials" on WhatsApp | Ensure the access token is a permanent system user token, not a temporary one |
| Channel shows ERROR status | Open settings, check error details, and reconnect if needed |

### 11.2 Sync Issues

| Problem | Solution |
|---------|----------|
| Products not appearing on platform | Check: product is ACTIVE, channel has Auto Sync ON, catalog is configured |
| Sync shows 0 products | Verify you have active products with prices and at least one image |
| TikTok rejects products | Ensure a Default Product Category is set — TikTok requires it |
| Google shows "Disapproved" | Check Google Merchant Center for specific policy violations |
| Images not syncing to TikTok | TikTok requires image upload to their servers — ensure images are publicly accessible URLs |

### 11.3 Order Issues

| Problem | Solution |
|---------|----------|
| Orders not importing | Verify: Import Orders is ON, webhooks are configured, channel is ACTIVE |
| WhatsApp orders missing | Check webhook subscription for `messages` field in Meta Business Suite |
| Duplicate orders | Orders are deduplicated by external order ID — check for webhook redelivery |

### 11.4 Payment Issues

| Problem | Solution |
|---------|----------|
| "Test Connection" fails | Verify `TAP_SECRET_KEY` is correct and active |
| Payment page not loading | Check that `TAP_PUBLISHABLE_KEY` is set |
| Webhooks not updating order | Verify webhook URL is accessible and HMAC signature matches |

---

## 12. FAQ

### General

**Q: Can I connect multiple accounts for the same platform?**  
A: Yes. You can connect multiple Meta pages, Google Merchant accounts, or TikTok shops. Each connection is a separate channel with its own settings.

**Q: Do I need to reconnect channels after updating my store?**  
A: No. Channels maintain their connection. You only need to reconnect if credentials expire (Meta tokens last 60 days) or if you revoke access on the platform's side.

**Q: What happens if I disconnect a channel?**  
A: All sync data is removed from your store. Products already on the platform remain until removed there. You'll see a confirmation prompt before disconnecting.

**Q: Are my credentials secure?**  
A: Yes. All credentials are stored as encrypted JSON and are never exposed in API responses.

### Products

**Q: Do I need to create products separately for each platform?**  
A: No. You create products once in your store and they sync to all active channels automatically.

**Q: What if a product has variants (e.g., sizes/colors)?**  
A: Each variant is synced as a separate item on platforms that support it. Variants are tracked by their individual SKUs.

**Q: Can I choose which products sync to which channel?**  
A: Currently, all ACTIVE products sync to all active channels with Auto Sync enabled. To exclude a product from syncing, set its status to Draft.

### Orders

**Q: Where do I see which channel an order came from?**  
A: In Admin → Orders, each order shows its source. Channel orders also have an external order ID reference.

**Q: Do refunds sync back to the platform?**  
A: For Meta (Facebook/Instagram), refund actions can be pushed back. For other platforms, process refunds in both your admin and the platform's seller center.

### Payments

**Q: Can I use a payment provider other than Tap?**  
A: The system is built around Tap Payments. Using another provider would require custom development.

**Q: Does Cash on Delivery work with social media orders?**  
A: COD is available for orders placed through your website. Social media platform orders use the platform's native checkout (for Meta, TikTok) or redirect to your store (for Google, Snapchat).

---

## Quick Reference — What to Set Up per Platform

### Meta (Facebook / Instagram)
```
Environment Variables:
  META_APP_ID=...
  META_APP_SECRET=...
  META_WEBHOOK_VERIFY_TOKEN=...

Webhook URL:        https://yourdomain.com/api/channels/meta/webhook
Callback URL:       https://yourdomain.com/api/channels/meta/callback
Connection:         OAuth (click "Connect Meta")
Supports Orders:    ✅ Yes (auto-import via webhook)
```

### Google Merchant Center
```
Environment Variables:
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...

Callback URL:       https://yourdomain.com/api/channels/google/callback
Connection:         OAuth (click "Connect Google")
Supports Orders:    ❌ No (customers checkout on your site)
```

### WhatsApp Business
```
Environment Variables:
  WHATSAPP_ACCESS_TOKEN=...
  WHATSAPP_BUSINESS_ACCOUNT_ID=...
  WHATSAPP_PHONE_NUMBER_ID=...
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=...

Webhook URL:        https://yourdomain.com/api/channels/whatsapp/webhook
Connection:         Manual token entry (click "Connect WhatsApp")
Supports Orders:    ✅ Yes (via chat cart messages)
```

### TikTok Shop
```
Environment Variables:
  TIKTOK_APP_KEY=...
  TIKTOK_APP_SECRET=...

Webhook URL:        https://yourdomain.com/api/channels/tiktok/webhook
Callback URL:       https://yourdomain.com/api/channels/tiktok/callback
Connection:         OAuth (click "Connect TikTok")
Supports Orders:    ✅ Yes (auto-import via webhook)
```

### Snapchat
```
Environment Variables:
  SNAPCHAT_CLIENT_ID=...
  SNAPCHAT_CLIENT_SECRET=...

Webhook URL:        https://yourdomain.com/api/channels/snapchat/webhook
Callback URL:       https://yourdomain.com/api/channels/snapchat/callback
Connection:         OAuth (click "Connect Snapchat")
Supports Orders:    ❌ No (customers checkout on your site)
```

---

> **Need Help?** Contact your development team or refer to each platform's official documentation:
> - [Meta Commerce Docs](https://developers.facebook.com/docs/commerce-platform/)
> - [Google Content API Docs](https://developers.google.com/shopping-content/)
> - [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
> - [TikTok Shop API Docs](https://partner.tiktokshop.com/docv2/)
> - [Snapchat Marketing API Docs](https://marketingapi.snapchat.com/docs/)
