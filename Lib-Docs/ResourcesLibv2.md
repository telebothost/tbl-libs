# ResourcesLib v2

Async economy engine — balances, inventories, transfers, passive growth, and multi-resource crafting.

**File:** `Libs/ResourcesLibv2.js` · **Access:** `Libs.ResourcesLibv2.*` · **Async** — always `await` · v1.0.0

---

## What problem does it solve?

Telegram bots commonly track:

- User gold, gems, energy
- Chat-wide points or pool balances
- Global bot treasury
- Passive income (mining, interest, regeneration)

`ResourcesLibv2` wraps all of this with atomic `db.bot.incr` / `decr`, batch `mget`, and optional **growth** timers that accrue value over time.

**Storage:** `db.bot` with keys `ResourcesLib_{scope}_{id}_{name}` — **same format as v1**, so existing balances can stay if you migrate from `Bot.getProperty`.

---

## Resource scopes

| Factory | Scope | Example key |
| --- | --- | --- |
| `userRes(name)` | Current user | `ResourcesLib_user_12345_gold` |
| `chatRes(name)` | Current chat | `ResourcesLib_chat_67890_points` |
| `globalRes(name)` | Whole bot | `ResourcesLib_global_global_pool` |
| `anotherUserRes(name, telegramId)` | Specific user | `ResourcesLib_user_99999_gold` |
| `anotherChatRes(name, chatId)` | Specific chat | `ResourcesLib_chat_11111_points` |

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
let energy = Libs.ResourcesLibv2.userRes("energy")
let pool = Libs.ResourcesLibv2.globalRes("jackpot")
```

User ID comes from `user.telegramid`; chat ID from `chat.chatid`.

---

## Reading values

| Method | Writes db? | Description |
| --- | --- | --- |
| `value()` | Yes* | Current amount including applied growth |
| `peek()` | No | Raw stored number — fast |
| `preview()` | No | What value would be after growth — no write |
| `stats()` | No | Dashboard bundle (base, current, pending, growth info) |

\* `value()` applies pending growth ticks and may write updated balance + growth state.

```js
let gold = Libs.ResourcesLibv2.userRes("gold")

await gold.add(100)
Bot.sendMessage("Balance: " + await gold.value())

// Shop UI — show pending mining income without committing
let pending = (await gold.stats()).pending
if (pending > 0) {
  Bot.sendMessage("+" + pending + " gold ready to collect (open /wallet)")
}
```

---

## Changing values

| Method | Throws? | Description |
| --- | --- | --- |
| `add(amount)` | On bad type | Add to balance |
| `set(amount)` | On bad type | Set balance (updates growth base if enabled) |
| `remove(amount)` | If insufficient | Subtract — throws `'ResLib: not enough resources'` |
| `removeAnyway(amount)` | No | Subtract even below zero |
| `have(amount)` | No | `true` if balance ≥ amount |
| `tryRemove(amount)` | No | `{ ok, removed, balance }` |
| `spend(amount)` | No | Shorthand — returns `true` if deducted |
| `reset()` | No | Set to 0 |
| `ensureAtLeast(min)` | No | Raise to min if below |
| `fillTo(target)` | No | Add only until target reached |
| `setClamped(amount, min, max)` | No | Set with bounds |

```js
let gold = Libs.ResourcesLibv2.userRes("gold")

// Safe shop purchase
let buy = await gold.tryRemove(50)
if (!buy.ok) {
  return Bot.sendMessage("Need 50 gold, you have " + buy.balance)
}
Bot.sendMessage("Purchased! " + buy.balance + " gold left.")

// Or one-liner
if (!(await gold.spend(50))) {
  return Bot.sendMessage("Not enough gold.")
}
```

---

## Transfers and exchanges

| Method | Description |
| --- | --- |
| `transferTo(other, amount)` | Move same resource type — checks balance |
| `transferToAnyway(other, amount)` | Move without balance check |
| `takeFromAnother(other, amount)` | Pull from another into this |
| `exchangeTo(other, { remove_amount, add_amount })` | Trade rates (e.g. 10 gold → 1 gem) |

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
let gems = Libs.ResourcesLibv2.userRes("gems")

// 100 gold → 1 gem
await gold.exchangeTo(gems, { remove_amount: 100, add_amount: 1 })
```

Transfers between resources require **same resource name** on different scopes, or use `exchangeTo` for different names.

---

## Display

```js
await gold.format()                    // "1250.5"
await gold.format({ suffix: " gold" }) // "1250.5 gold"
await gold.format({ compact: true })   // "1.3K"
```

---

## Growth (passive income)

Access via `Libs.ResourcesLibv2.growthFor(resource)` or `resource.growth`.

### Growth types

| Method | Type | Formula |
| --- | --- | --- |
| `growth.add({ value, interval, min, max })` | `simple` | +value every interval seconds |
| `growth.addPercent({ percent, interval })` | `percent` | +percent% of base per interval |
| `growth.addCompoundInterest({ percent, interval })` | `compound_interest` | Compound % per interval |

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
let g = Libs.ResourcesLibv2.growthFor(gold)

// Mine 1 gold every 60 seconds
await g.add({ value: 1, interval: 60 })

// Or 5% of base every hour
await g.addPercent({ percent: 5, interval: 3600 })
```

### Growth control

| Method | Description |
| --- | --- |
| `growth.stop()` | Pause accrual |
| `growth.resume()` | Re-enable |
| `growth.restart()` | Reset timer, keep config |
| `growth.progress()` | % to next tick |
| `growth.nextTickIn()` | Seconds until next tick |
| `growth.previewGain()` | How much would accrue now (no write) |

```js
let stats = await gold.stats()
if (stats.growth) {
  Bot.sendMessage(    "Mining: " + Math.round(stats.growth.progress) + "% — next tick in " +
    Math.round(stats.growth.nextTickIn) + "s"
  )
}
```

---

## Module helpers

### `loadAll(resources, { withGrowth })`

Batch-read multiple resources in one `mget`:

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
let gems = Libs.ResourcesLibv2.userRes("gems")
let energy = Libs.ResourcesLibv2.userRes("energy")

let balances = await Libs.ResourcesLibv2.loadAll([gold, gems, energy], { withGrowth: true })
// { gold: 150, gems: 3, energy: 80 }
```

### `spendAll(requirements)`

Atomic multi-resource check — verifies all first, then deducts in parallel:

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
let wood = Libs.ResourcesLibv2.userRes("wood")
let iron = Libs.ResourcesLibv2.userRes("iron")

let craft = await Libs.ResourcesLibv2.spendAll([
  { res: gold, amount: 50 },
  { res: wood, amount: 10 },
  { res: iron, amount: 5 }
])

if (!craft.ok) {
  return Bot.sendMessage(    "Need more " + craft.missing + " (have " + craft.have + ", need " + craft.need + ")"
  )
}
Bot.sendMessage("Item crafted!")
```

### `clearCache()`

Clears per-command memory cache — call if you need fresh reads after external changes in the same command.

---

## Full example — RPG wallet

```js
// /wallet
let gold = Libs.ResourcesLibv2.userRes("gold")
let energy = Libs.ResourcesLibv2.userRes("energy")

let data = await Libs.ResourcesLibv2.loadAll([gold, energy], { withGrowth: true })
let goldStats = await gold.stats()

let msg = [
  "Gold: " + await gold.format({ suffix: " G", compact: true }),
  "Energy: " + data.energy + " / 100"
]

if (goldStats.pending > 0) {
  msg.push("(+" + goldStats.pending + " gold from mining)")
}

Bot.sendMessage(msg.join("\n"))
```

---

## Full example — setup passive mining once

```js
// /enable_mining (one-time setup per user)
let gold = Libs.ResourcesLibv2.userRes("gold")
let g = Libs.ResourcesLibv2.growthFor(gold)

if (await g.have()) {
  return Bot.sendMessage("Mining already enabled.")
}

await g.add({ value: 1, interval: 120, max: 10000 })
Bot.sendMessage("Mining enabled! +1 gold every 2 minutes (cap 10,000).")
```

---

## Migration from v1 (`Libs.ResourcesLib`)

| v1 (sync, deprecated) | v2 (async) |
| --- | --- |
| `Libs.ResourcesLib.userRes("gold")` | `Libs.ResourcesLibv2.userRes("gold")` |
| `gold.add(10)` | `await gold.add(10)` |
| `gold.value()` | `await gold.value()` |
| `Bot.getProperty` / `Bot.setProperty` | `db.bot` |

Keys stay `ResourcesLib_*` — balances may already exist in `db.bot` if migrated.

See [ResourcesLib.md](ResourcesLib.md) for legacy sync API.

---

## Common mistakes

```js
// Wrong — forget await (gets Promise, not number)
Bot.sendMessage("Gold: " + gold.value())

// Correct
Bot.sendMessage("Gold: " + await gold.value())
```

```js
// Wrong — remove() without try/catch (throws on insufficient)
await gold.remove(999)

// Correct — use tryRemove or spend
let r = await gold.tryRemove(999)
if (!r.ok) Bot.sendMessage("Not enough.")
```

---

## Notes

- All amounts must be numbers — non-numbers throw with a clear `ResLib:` message.
- Growth state stored at `{propName}_growth` as object on `db.bot`.
- Uses in-memory cache per command — `clearCache()` if needed.
- `incr`/`decr` throw on storage errors; `set` checks `{ ok }`.
