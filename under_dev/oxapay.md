# oxapay (under development)

OxaPay crypto payment gateway — invoices, static addresses, webhooks, order tracking.

**File:** `under_dev/oxapay.js` · **Test via:** `require("oxapaylib")` · **Future:** `Libs.oxapay` · v0.1.0

[OxaPay API docs](https://docs.oxapay.com)

---

## Setup

Create command `oxapaylib`, paste `oxapay.js` into Logic, then:

```js
let oxapay = require("oxapaylib")
oxapay.configure({ merchantKey: process.env.OXAPAY_MERCHANT_KEY })
```

Add to bot ENV:

```
OXAPAY_MERCHANT_KEY=your-merchant-api-key
OXAPAY_PAYOUT_KEY=your-payout-api-key   # optional, for payout webhooks
```

```js
let oxapay = require("oxapaylib")
oxapay.configure({
  merchantKey: process.env.OXAPAY_MERCHANT_KEY,
  payoutKey: process.env.OXAPAY_PAYOUT_KEY
})
```

---

## Create invoice

```js
let invoice = await oxapay.createInvoice({
  amount: 9.99,
  currency: 'USD',
  description: 'Premium 30 days',
  callback_url: 'https://your-bot-webhook.example/oxapay',
  return_url: 'https://t.me/YourBot',
  store: true,
  userId: user.id
})

await Api.sendMessage({
  text: 'Pay here: ' + invoice.payment_url,
  reply_markup: { inline_keyboard: oxapay.payButton(invoice.payment_url, 'Pay with crypto') }
})
```

Returns: `{ track_id, payment_url, expired_at, date }`

---

## Static deposit address

For fixed wallet deposits (e.g. TON network):

```js
let dep = await oxapay.createStaticAddress({
  network: 'TON Network',
  callback_url: 'https://your-webhook.example/oxapay',
  order_id: 'dep_' + user.id,
  store: true
})

Bot.sendMessage(
  'Send payment to:\n' + dep.address +
  (dep.memo ? '\nMemo: ' + dep.memo : '')
)
```

---

## Check payment status

```js
let payment = await oxapay.getPayment(track_id)
// payment.status — "Paying", "Paid", etc.

if (oxapay.isPaid(payment.status)) {
  await Libs.ResourcesLibv2.userRes('premium').add(30)
  Bot.sendMessage('Payment confirmed — premium activated!')
}
```

### List payments

```js
let history = await oxapay.listPayments({
  status: 'Paid',
  page: 1,
  size: 20
})
// history.list, history.meta
```

---

## Webhook handler

OxaPay POSTs JSON to your `callback_url`. Validate HMAC before trusting data.

In your webhook command Logic:

```js
// rawBody = exact request body string (from webhook globals)
// hmacHeader = HMAC header from request

let check = oxapay.validateWebhook(rawBody, hmacHeader)

if (!check.valid) {
  // return 400 to caller
  return
}

let data = check.data

if (oxapay.isPaid(data.status)) {
  await oxapay.updateStoredOrder(data.track_id, 'Paid', {
    amount: data.amount,
    currency: data.currency,
    txs: data.txs
  })

  // Grant product to user — lookup order_id / userId from stored record
  let order = await oxapay.getStoredOrder(data.track_id)
  if (order && order.userId) {
    // deliver goods...
  }
}

// Must respond HTTP 200 with body "ok"
// oxapay.webhookResponse() === "ok"
```

**Important:** HMAC is computed over the **raw** POST body string, not re-serialized JSON.

### Status helpers

| Method | True when |
| --- | --- |
| `isPaid(status)` | `Paid` |
| `isPaying(status)` | `Paying` (await confirmation) |
| `isExpired(status)` | `Expired` |
| `isFailed(status)` | `Failed` |
| `isPayout(type)` | `payout` webhook |

---

## Order storage (optional)

When `store: true` on `createInvoice` / `createStaticAddress`:

| Key | Scope | Content |
| --- | --- | --- |
| `oxp:ord:{orderId}` | `db.bot` | Order record |
| `oxp:trk:{trackId}` | `db.bot` | Same record by track_id |

```js
let order = await oxapay.getStoredOrder('ORD-123')
await oxapay.updateStoredOrder(track_id, 'Paid')
```

---

## Full shop flow example

```js
// /buy command
oxapay.configure({ merchantKey: process.env.OXAPAY_MERCHANT_KEY })

let invoice = await oxapay.createInvoice({
  amount: 5,
  currency: 'USD',
  description: '100 gold pack',
  order_id: 'gold_' + user.id + '_' + Date.now(),
  callback_url: process.env.OXAPAY_CALLBACK_URL,
  store: true,
  userId: user.id
})

await Api.sendMessage({
  chat_id: chat.id,
  text: 'Complete payment to receive 100 gold:',
  reply_markup: { inline_keyboard: oxapay.payButton(invoice.payment_url) }
})
```

Webhook delivers gold when `isPaid`.

---

## Methods

| Method | Description |
| --- | --- |
| `configure(options)` | API keys, timeout, cfProxy |
| `createInvoice(options)` | Payment link invoice |
| `createStaticAddress(options)` | Fixed deposit address |
| `getPayment(trackId)` | Payment details |
| `listPayments(query)` | Filtered history |
| `waitForPaid(trackId, options)` | Simple poll helper |
| `validateWebhook(rawBody, hmacHeader, options)` | HMAC-SHA512 verify |
| `parseWebhook(rawBody)` | Parse JSON body |
| `webhookResponse()` | Returns `"ok"` for HTTP 200 body |
| `payButton(url, text)` | Inline keyboard row |
| `getStoredOrder(id)` | Load from db.bot |
| `updateStoredOrder(trackId, status, extra)` | Update stored order |

---

## Notes

- Merchant header: `merchant_api_key` on all API calls.
- Webhook must return **200** with body **`ok`** (lowercase).
- Use `sandbox: true` in invoice body for test mode.
- Payout webhooks validate with `OXAPAY_PAYOUT_KEY`.
