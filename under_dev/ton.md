# ton (under development)

TON blockchain queries, amount utilities, Jetton history, wallet deep links, and user wallet storage.

**File:** `under_dev/ton.js` · **Test via:** `require("tonlib")` · **Future:** `Libs.ton` · v0.1.0

Uses [TON Center API](https://toncenter.com/api/v2/) v2 and v3. **Read-only** — sending transactions requires a wallet private key (not included).

---

## Setup

Create command `tonlib`, paste `ton.js` into Logic, then:

```js
let ton = require("tonlib")
ton.configure({
  apiKey: process.env.TONCENTER_API_KEY,
  testnet: false
})
```

---

## Amount helpers

```js
ton.toNano(1.5)           // "1500000000"
ton.fromNano("1500000000") // 1.5
ton.format(2.5)            // "2.5 TON"
ton.format("1000000000", { fromNano: true }) // "1 TON"
ton.isAddress("EQ...")     // true/false
```

---

## Balance and account

```js
let nano = await ton.getBalance("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs")
let tonBalance = await ton.getBalanceTon(address)

let info = await ton.getAddressInfo(address)
// balance, state, code, data, last_transaction_id

let wallet = await ton.getWalletInfo(address)
// wallet_type, seqno, etc.
```

---

## Transactions

```js
let txs = await ton.getTransactions(address, { limit: 10 })

// Watch for incoming payment
let check = await ton.findIncomingPayment(address, 1.5)  // 1.5 TON expected
if (check.found) {
  Bot.sendMessage(chat.id, 'Payment received!')
}
```

---

## Jettons (tokens)

```js
// Transfer history
let transfers = await ton.getJettonTransfers({
  owner_address: userWallet,
  direction: 'in',
  limit: 20
})
// transfers.jetton_transfers, metadata, address_book

// Wallets holding jettons for user
let wallets = await ton.getJettonWallets(userWallet)
```

---

## Smart contract get-methods

```js
let result = await ton.runGetMethod(contractAddress, 'get_jetton_data', [])
```

---

## Deep links and pay buttons

```js
// Tonkeeper link
let link = ton.tonkeeperLink(receiverAddress, 2.5, 'Order #42')

// ton:// protocol
let tonLink = ton.transferLink(receiverAddress, 1, 'tip')

// Inline button
let btn = ton.payButton(receiverAddress, 5, 'Send 5 TON', 'premium')
Api.sendMessage({
  chat_id: chat.id,
  text: 'Send payment:',
  reply_markup: { inline_keyboard: btn }
})
```

---

## User wallet binding

```js
// /setwallet command — user sends their TON address in params
if (!ton.isAddress(params)) {
  return Bot.sendMessage(chat.id, 'Send a valid TON address.')
}
await ton.saveWallet(params.trim())
Bot.sendMessage(chat.id, 'Wallet saved.')

// Later
let wallet = await ton.getWallet()
let bal = await ton.getBalanceTon(wallet)
Bot.sendMessage(chat.id, 'Your balance: ' + ton.format(bal))
```

Storage key: `ton:wallet` on `db.user`.

---

## Full deposit verification example

```js
ton.configure({ apiKey: process.env.TONCENTER_API_KEY })

let merchantWallet = process.env.MERCHANT_TON_WALLET
let expected = 2  // TON

let result = await ton.findIncomingPayment(merchantWallet, expected)

if (result.found) {
  await Libs.ResourcesLibv2.userRes('gold').add(100)
  Bot.sendMessage(chat.id, '2 TON received — 100 gold added!')
} else {
  Bot.sendMessage(chat.id, 'Payment not found yet. Wait for confirmation and try /verify again.')
}
```

---

## Address detection

```js
let forms = await ton.detectAddress("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs")
// bounceable, non_bounceable, raw forms
```

---

## Methods

| Method | Description |
| --- | --- |
| `configure(options)` | API key, testnet, timeout |
| `toNano` / `fromNano` / `format` | Amount conversion |
| `isAddress(address)` | Basic format check |
| `getBalance(address)` | Nanotons string |
| `getBalanceTon(address)` | TON number |
| `getAddressInfo(address)` | Account state v2 |
| `getWalletInfo(address)` | Wallet seqno/type |
| `getTransactions(address, options)` | Recent txs |
| `detectAddress(address)` | Address forms |
| `runGetMethod(address, method, stack)` | Contract read |
| `getJettonTransfers(options)` | Jetton history v3 |
| `getJettonWallets(owner, options)` | User jetton wallets |
| `getAccountState(address)` | Indexed state v3 |
| `getMasterchainInfo()` | Chain head |
| `tonkeeperLink` / `transferLink` | Payment URLs |
| `payButton(address, amount, text, comment)` | Inline keyboard |
| `saveWallet` / `getWallet` | Per-user address on db.user |
| `findIncomingPayment(address, expectedTon)` | Simple tx matcher |

---

## Notes

- TON Center rate limits apply — use an API key for production.
- `findIncomingPayment` is a simple heuristic over recent txs — for production use webhooks/indexers or OxaPay for payment tracking.
- This lib does **not** sign or broadcast transactions.
- Set `testnet: true` for development on testnet.
