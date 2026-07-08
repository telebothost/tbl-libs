# ResourcesLib (deprecated)

**Legacy sync economy library.** Uses deprecated `Bot.getProperty` / `Bot.setProperty`.

**File:** `Libs/ResourcesLib.js` · **Access:** `Libs.ResourcesLib.*` · **Sync** · **DEPRECATED**

**Use instead:** [`ResourcesLibv2`](ResourcesLibv2.md) (`Libs.ResourcesLibv2`) with async `db.bot`.

---

## Why deprecated?

| Issue | Legacy `ResourcesLib` | Modern `ResourcesLibv2` |
| --- | --- | --- |
| Storage | `Bot.getProperty` / `Bot.setProperty` | `db.bot` async API |
| Atomic updates | Read-modify-write (race risk) | `incr` / `decr` atomic |
| Async | Sync only | Proper `await` |
| New features | — | `peek`, `preview`, `stats`, `spendAll`, `tryRemove`, etc. |

`ResourcesLibv2` uses the **same storage keys** (`ResourcesLib_user_{id}_{name}`) — balances can carry over when you migrate call sites to `await`.

---

## Migration checklist

1. Replace `Libs.ResourcesLib` → `Libs.ResourcesLibv2`
2. Add `await` to every resource method call
3. Test balances still read correctly (keys unchanged)
4. Remove `ResourcesLib.js` from your bot once fully migrated

```js
// Before (deprecated)
let gold = Libs.ResourcesLib.userRes("gold")
gold.add(10)
Bot.sendMessage("Gold: " + gold.value())

// After (v2)
let gold = Libs.ResourcesLibv2.userRes("gold")
await gold.add(10)
Bot.sendMessage("Gold: " + await gold.value())
```

---

## Legacy API (sync)

If you must maintain old code temporarily, the sync API mirrors v2 conceptually:

### Factories

```js
Libs.ResourcesLib.userRes("gold")
Libs.ResourcesLib.chatRes("points")
Libs.ResourcesLib.globalRes("pool")
Libs.ResourcesLib.anotherUserRes("gold", telegramId)
Libs.ResourcesLib.anotherChatRes("points", chatId)
Libs.ResourcesLib.growthFor(resource)
```

### Resource methods (all sync — no await)

| Method | Description |
| --- | --- |
| `value()` | Current balance (applies growth) |
| `add(amount)` | Add |
| `set(amount)` | Set |
| `have(amount)` | Balance ≥ amount? |
| `remove(amount)` | Subtract — throws if insufficient |
| `removeAnyway(amount)` | Subtract regardless |
| `transferTo(other, amount)` | Transfer same resource type |
| `exchangeTo(other, options)` | Trade different amounts |

### Growth (passive income)

```js
let gold = Libs.ResourcesLib.userRes("gold")
let g = Libs.ResourcesLib.growthFor(gold)

g.add({ value: 1, interval: 60 })           // +1 per minute
g.addPercent({ percent: 5, interval: 3600 }) // +5% per hour
g.stop() / g.resume()
```

---

## Storage keys

Same as v2:

```
ResourcesLib_user_{telegramId}_{resourceName}
ResourcesLib_user_{telegramId}_{resourceName}_growth
ResourcesLib_chat_{chatId}_{resourceName}
ResourcesLib_global_global_{resourceName}
```

Legacy data in `Bot` properties and new data in `db.bot` are **separate stores** — you need a one-time migration script to copy values if switching storage backends.

---

## Full legacy example

```js
// Old style — still works but deprecated
let gold = Libs.ResourcesLib.userRes("gold")
gold.add(100)

if (gold.have(50)) {
  gold.remove(50)
  Bot.sendMessage("Purchased! Balance: " + gold.value())
}
```

---

## Notes

- Do not start new bots on `ResourcesLib` — use `ResourcesLibv2`.
- See [ResourcesLibv2.md](ResourcesLibv2.md) for complete modern documentation with examples.
