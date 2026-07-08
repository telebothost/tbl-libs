# Under Development

Experimental libraries — source code only. **Not yet available as `Libs.oxapay` / `Libs.ton` on the TBL platform.**

| File | Future access | Topic |
| --- | --- | --- |
| `oxapay.js` | `Libs.oxapay` | OxaPay crypto payments |
| `ton.js` | `Libs.ton` | TON blockchain queries |

## How to test on TBL

You cannot add a `Libs/` folder to your bot. Use **`require("commandname")`** instead:

### Step 1 — Create lib command

Create a command named e.g. `oxapaylib` (any name). Paste the **entire** contents of `oxapay.js` into its Logic field. The command does not need to reply to users — it only holds the module.

Do the same for `ton.js` in a command named e.g. `tonlib`.

### Step 2 — Use from another command

```js
let oxapay = require("oxapaylib")
let ton = require("tonlib")

oxapay.configure({ merchantKey: process.env.OXAPAY_MERCHANT_KEY })
ton.configure({ apiKey: process.env.TONCENTER_API_KEY })

let invoice = await oxapay.createInvoice({ amount: 10, store: true, userId: user.id })
let bal = await ton.getBalanceTon(params)
```

`require("oxapaylib")` uses the **command name**, not a file path.

### Step 3 — ENV keys

Set in bot dashboard **ENV**:

```
OXAPAY_MERCHANT_KEY=...
TONCENTER_API_KEY=...
```

Never hard-code API keys in Logic.

## When promoted

After review and merge, these become official platform libs:

```js
Libs.oxapay.createInvoice({ ... })
Libs.ton.getBalanceTon(address)
```

Until then, keep using `require()` with your lib command.

## Documentation

- [oxapay.md](oxapay.md)
- [ton.md](ton.md)
