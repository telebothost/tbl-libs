# ResourcesLib v2

Async economy engine. Access: **`Libs.ResourcesLibv2`**. Storage: `db.bot`. Keys: `ResourcesLib_*` (same format as v1). v1.0.0

---

## Factories

```js
Libs.ResourcesLibv2.userRes("gold")
Libs.ResourcesLibv2.chatRes("points")
Libs.ResourcesLibv2.globalRes("pool")
Libs.ResourcesLibv2.anotherUserRes("gold", telegramId)
Libs.ResourcesLibv2.anotherChatRes("points", chatId)
Libs.ResourcesLibv2.growthFor(resource)
```

## Resource methods (all async)

`value`, `peek`, `preview`, `set`, `add`, `have`, `remove`, `removeAnyway`, `spend`, `tryRemove`, `reset`, `ensureAtLeast`, `fillTo`, `setClamped`, `format`, `stats`, `transferTo`, `exchangeTo`, and more.

## Module helpers

- `loadAll(resources, { withGrowth })` — batch mget
- `spendAll([{ res, amount }])` — multi-resource craft check
- `clearCache()` — reset per-command memory cache

## Growth types

- `add({ value, interval, max })` — simple
- `addPercent({ percent, interval })` — percent of base
- `addCompoundInterest({ percent, interval })` — compound

## Migration from v1

| v1 (sync, deprecated) | v2 (async) |
| --- | --- |
| `Libs.ResourcesLib` | `Libs.ResourcesLibv2` |
| `gold.add(10)` | `await gold.add(10)` |
| `Bot.getProperty` | `db.bot` |

See [ResourcesLib.md](ResourcesLib.md) for legacy sync docs.
