# TBL Libs — Documentation Index

All current libraries live in [`libsv2/`](../libsv2/). Version **1.0.0** (pre-release).

## `libsv2/` files (9)

| File | Access | Type |
| --- | --- | --- |
| `random.js` | `Libs.random` | sync |
| `dateTimeFormat.js` | `Libs.dateTimeFormat` | sync |
| `tgutil.js` | `Libs.tgutil` | sync |
| `mcl.js` | `Libs.mcl` | async (+ sync `getBtn`) |
| `ResourcesLibv2.js` | `Libs.ResourcesLibv2` | async + `db.bot` |
| `refLib.js` | `Libs.refLib` | async + `db` |
| `translate.js` | `Libs.translate` | async + `db` + HTTP |
| `cooldown.js` | `Libs.cooldown` | async + `db` |
| `ResourcesLib.js` | `Libs.ResourcesLib` | **deprecated** sync copy |

## Sync libraries (no `await`)

| Lib | Docs |
| --- | --- |
| `random` | [random.md](random.md) |
| `dateTimeFormat` | [dateTimeFormat.md](dateTimeFormat.md) |
| `tgutil` | [tgutil.md](tgutil.md) |
| `mcl.getBtn()` | [mcl.md](mcl.md) |

## Async libraries (always `await`)

| Lib | Docs |
| --- | --- |
| `mcl` | [mcl.md](mcl.md) |
| `ResourcesLibv2` | [ResourcesLibv2.md](ResourcesLibv2.md) |
| `refLib` | [refLib.md](refLib.md) |
| `translate` | [TranslateLib.md](TranslateLib.md) |
| `cooldown` | [cooldown.md](cooldown.md) |

## Deprecated

| Lib | Location | Replacement |
| --- | --- | --- |
| `ResourcesLib` | `Libs/ResourcesLib.js`, `libsv2/ResourcesLib.js` | `ResourcesLibv2` |
| `refLib` (old `REFLIB_*` keys) | `Libs/refLib.js` | `libsv2/refLib.js` |
| `translate` (User properties) | `Libs/translate.js` | `libsv2/translate.js` |

## Quick access

```js
Libs.random.randomInt(1, 6)                           // sync
Libs.tgutil.getNameFor(user)                          // sync
await Libs.mcl.quick(user.id, ["@channel"])           // async
await Libs.ResourcesLibv2.userRes("gold").add(10)   // async + db
await Libs.refLib.track({ onJoin: (ctx) => {} })      // async + db
await Libs.translate.translate("Hello", { to: "es" }) // async
await Libs.cooldown.tryRun("daily", 86400)            // async + db
```

Public docs mirror: [tbl-static-docs/docs/libs](https://github.com/telebothost/tbl-static-docs/tree/main/docs/libs)
