# translate

Multi-language translation. Access: **`Libs.translate`**. Async. v1.0.0

Providers: **Google → MyMemory → Lingva → LibreTranslate**

---

## Quick start

```js
await Libs.translate.setUserLang(user.id, "hi")
let text = await Libs.translate.translate("Welcome to our bot!")
let safe = await Libs.translate.tryTranslate("Hello", { to: "es" })
if (safe.ok) Bot.sendMessage(chat.id, safe.text)
```

---

## Methods

| Method | Description |
| --- | --- |
| `translate(text, options)` | Main API (throws on fail) |
| `tryTranslate(text, options)` | Returns `{ ok, text, provider, error }` |
| `t(text, to)` | Shorthand |
| `setUserLang(userId, code)` | Save preference |
| `getUserLang(userId?)` | Get preference |
| `getUsageInfo()` | Daily quota stats |
| `canTranslate(text)` | Pre-check quota |
| `batch(texts, options)` | Multiple strings |
| `stats(userId?)` | Lang + usage bundle |
| `configure(options)` | Limits, providers, timeout, cfProxy |
| `langButtons({ perRow, prefix })` | Inline keyboard |
| `parseLangCallback(data, prefix?)` | Parse callback |
| `listLanguages()` | `[{ code, name }]` |
| `formatLangList()` | Display string |
| `resetUsage()` | Reset daily counter |

### Options for translate / tryTranslate

| Option | Description |
| --- | --- |
| `to` | Target language |
| `from` | Source (`"auto"` default) |
| `userId` | Use saved user lang |
| `fallback` | Value if all providers fail |
| `silent` | Return original text, no throw |

---

## Language picker example

```js
let rows = Libs.translate.langButtons({ perRow: 2, prefix: "lang_" })
Bot.sendMessage(chat.id, "Pick language:", { reply_markup: { inline_keyboard: rows } })

let code = Libs.translate.parseLangCallback(callback_data, "lang_")
if (code) await Libs.translate.setUserLang(user.id, code)
```

---

## Storage

| Key | Scope |
| --- | --- |
| `user_lang` | `db.user` |
| `translate_daily_usage` | `db.bot` |

Legacy: `autoTranslate()` → `translate()`

Uses `HTTP` with `res.ok` checks and `responseType: "json"`.
