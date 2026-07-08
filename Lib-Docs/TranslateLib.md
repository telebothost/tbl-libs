# translate

Multi-language translation with provider fallback, per-user language preferences, and daily usage limits.

**File:** `Libs/translate.js` · **Access:** `Libs.translate.*` · **Async** — always `await` · v1.0.0

---

## What problem does it solve?

Bots serving international users need:

- Translate bot messages to the user's language
- Let users pick their language
- Fall back when one API is down
- Respect free-tier limits (MyMemory daily quota)

`translate` chains providers automatically: **Google → MyMemory → Lingva → LibreTranslate**.

---

## Storage keys

| Key | Scope | Purpose |
| --- | --- | --- |
| `user_lang` | `db.user` | User's language code (e.g. `"hi"`) |
| `translate_daily_usage` | `db.bot` | `{ date, words }` for MyMemory quota |

---

## Supported languages

Built-in codes: `en`, `hi`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `ja`, `ko`, `zh`, `ar`, `bn`, `tr`, `vi`, `id`, `uk`, `pl`, `nl`, `th`

```js
Libs.translate.getSupportedLanguages()  // { en: "English", hi: "Hindi", ... }
Libs.translate.listLanguages()        // [{ code, name }, ...] sorted
Libs.translate.langName("hi")         // "Hindi"
Libs.translate.isSupported("xx")      // false
```

---

## Quick start

```js
// Save preference
await Libs.translate.setUserLang(user.id, "hi")

// Translate using saved lang (pass userId or rely on current user context)
let text = await Libs.translate.translate("Welcome to our bot!")
// or explicit target
let text2 = await Libs.translate.translate("Hello", { to: "es" })

// Shorthand
let text3 = await Libs.translate.t("Good morning", "fr")
```

---

## Main translation APIs

### `translate(text, options)` — throws on failure

```js
try {
  let msg = await Libs.translate.translate(params.text, {
    to: "de",
    from: "auto",
    fallback: "Translation unavailable"
  })
  Bot.sendMessage(msg)
} catch (e) {
  Bot.sendMessage("Could not translate.")
}
```

### `tryTranslate(text, options)` — never throws

Returns:

```js
{
  ok: true,
  text: "Hola",
  provider: "google",
  from: "auto",
  to: "es",
  words: 1
}

// or on failure
{
  ok: false,
  text: "Hello",
  error: "All providers failed",
  fallback: undefined,
  from: "auto",
  to: "es"
}
```

```js
let result = await Libs.translate.tryTranslate("Hello world", { to: "hi" })
if (result.ok) {
  Bot.sendMessage(result.text + " (via " + result.provider + ")")
} else {
  Bot.sendMessage("Error: " + result.error)
}
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `to` | user lang or `"en"` | Target language code |
| `from` | `"auto"` | Source language |
| `userId` | current user | Whose saved lang to use for `to` |
| `fallback` | — | Return this string if all providers fail |
| `silent` | `false` | On failure, return original text instead of throwing |

You can also pass a string as second arg: `translate("Hi", "es")` → `{ to: "es" }`.

---

## User language

```js
await Libs.translate.setUserLang(user.id, "hi")
let lang = await Libs.translate.getUserLang(user.id)  // "hi"

// Translate automatically to user's language
let welcome = await Libs.translate.translate("Welcome back!", { userId: user.id })
```

---

## Usage limits

MyMemory has a daily word limit (default **1000** words/day, bot-wide).

```js
let info = await Libs.translate.getUsageInfo()
// { wordsUsed, wordsRemaining, limit, resetDate, percentUsed }

let check = await Libs.translate.canTranslate("Long message here...")
// { ok: true/false, words: N, remaining: N }

await Libs.translate.resetUsage()  // admin — reset counter
```

When MyMemory quota is exceeded, the provider chain skips MyMemory and tries Lingva/Libre.

Configure limits:

```js
Libs.translate.configure({
  dailyLimit: 2000,
  maxLength: 500,
  timeout: 10000,
  providers: ["google", "lingva", "libre"],  // skip mymemory
  cfProxy: true  // if needed for HTTP
})
```

---

## Language picker UI

```js
// /language command
let rows = Libs.translate.langButtons({
  perRow: 2,
  prefix: "lang_",
  codes: ["en", "hi", "es", "fr", "de"]  // optional subset
})

await Api.sendMessage({
  text: "Choose your language:",
  reply_markup: { inline_keyboard: rows }
})
```

**Callback handler:**

```js
let code = Libs.translate.parseLangCallback(callback_data, "lang_")
if (code) {
  await Libs.translate.setUserLang(user.id, code)
  Bot.sendMessage("Language set to " + Libs.translate.langName(code))
}
```

Display all languages as text:

```js
Bot.sendMessage(Libs.translate.formatLangList("•"))
// • Arabic (ar)
// • Bengali (bn)
// ...
```

---

## Batch translation

Translates sequentially (respects rate limits):

```js
let lines = ["Hello", "Goodbye", "Thank you"]
let results = await Libs.translate.batch(lines, { to: "ja" })

for (let i = 0; i < results.length; i++) {
  if (results[i].ok) {
    Bot.sendMessage(lines[i] + " → " + results[i].text)
  }
}
```

---

## Stats bundle

```js
let profile = await Libs.translate.stats(user.id)
// {
//   lang: "hi",
//   langName: "Hindi",
//   usage: { wordsUsed, wordsRemaining, limit, resetDate, percentUsed }
// }
```

---

## Full example — localized bot messages

```js
// Helper in your command
async function say(text) {
  let translated = await Libs.translate.tryTranslate(text, {
    userId: user.id,
    silent: true
  })
  Bot.sendMessage(translated.text)
}

await say("Your balance has been updated.")
await say("Daily bonus is ready!")
```

---

## Full example — translate user input to English for moderation

```js
let mod = await Libs.translate.tryTranslate(params, {
  to: "en",
  from: "auto"
})

if (mod.ok) {
  await Api.sendMessage({
    chat_id: adminChatId,
    text: "User said: " + mod.text + " (from " + mod.from + ")"
  })
}
```

---

## Legacy

| Old | New |
| --- | --- |
| `autoTranslate(text, lang)` | `translate(text, { to: lang })` |

---

## Common mistakes

```js
// Wrong — translate throws and breaks command
Bot.sendMessage(await Libs.translate.translate(longText))

// Correct — pre-check length or use tryTranslate
let r = await Libs.translate.tryTranslate(longText, { to: "hi", silent: true })
Bot.sendMessage(r.text)
```

```js
// Wrong — forgot setUserLang before relying on user preference
await Libs.translate.translate("Hi")  // always uses default "en" for new users

// Correct — set on /start or language picker first
await Libs.translate.setUserLang(user.id, "hi")
```

---

## Notes

- Max text length default **500** characters — configure with `maxLength`.
- Skips translation when target equals source or text looks English going to `en`.
- Uses `HTTP` with `responseType: "json"` and checks `res.ok`.
- `clearCache()` resets in-command usage/lang session cache.
