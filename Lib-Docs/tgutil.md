# tgutil

Telegram-specific helpers — names, mentions, links, escaping, WebApp validation, and message utilities.

**File:** `Libs/tgutil.js` · **Access:** `Libs.tgutil.*` · **Sync** — no `await` · v1.0.0

---

## What problem does it solve?

Telegram formatting is picky:

- Markdown and HTML need different escaping
- User mentions use `tg://user?id=` links
- Private chat links need special URL formats
- WebApp init data must be HMAC-verified
- Messages max out at 4096 characters

`tgutil` handles all of this so your bot messages look right and stay safe.

---

## User display

### `getNameFor(member, options?)`

Picks the best display name.

| Option | Effect |
| --- | --- |
| `preferUsername: true` | `@username` first |
| `preferFullName: true` | First + last name first |

Default order: username → first name → last name.

```js
Libs.tgutil.getNameFor(user)                           // "@johndoe" or "John"
Libs.tgutil.getNameFor(user, { preferFullName: true }) // "John Doe"
```

### `getFullName(member)`

```js
Libs.tgutil.getFullName(user)  // "John Doe"
```

### `getLinkFor(member, parseMode?, customText?)`

Clickable mention link.

| `parseMode` | Output |
| --- | --- |
| `"markdown"` | `[John](tg://user?id=123)` |
| `"html"` | `<a href="tg://user?id=123">John</a>` |
| `"markdownv2"` | Escaped MarkdownV2 link |

Uses `member.telegramid` or `member.id`.

### `formatUser(member, options?)`

| Option | Default | Description |
| --- | --- | --- |
| `showId` | `false` | Append `(123456)` |
| `useFullName` | `false` | Full name vs username |
| `link` | `true` | Wrap in clickable link |
| `parseMode` | `"markdown"` | Output format |
| `fallbackText` | `"Unknown User"` | When no name |
| `customName` | `null` | Override display name |

```js
Libs.tgutil.formatUser(user, { showId: true, parseMode: "html" })
// <a href="tg://user?id=123">John</a> (123)
```

### `getUserMention(member, parseMode?)`

Alias for `getLinkFor` — most common for greetings.

```js
let mention = Libs.tgutil.getUserMention(user, "html")
Bot.sendMessage("Hello " + mention + "!", { parse_mode: "HTML" })
```

**Rule:** match `parseMode` here to `parse_mode` on `Bot.sendMessage`.

### `isBot(member)`

```js
if (Libs.tgutil.isBot(user)) {
  return Bot.sendMessage("Bots cannot use this command.")
}
```

### `getProfilePhotoUrl(member)`

Returns `https://t.me/i/userpic/320/{username}.jpg` or `null` if no username.

---

## Chat and message links

### `getChatLink(chat, parseMode?)`

- Public chat: `https://t.me/{username}`
- Private: `chat.invite_link` or derived `t.me/c/...` URL

```js
Bot.sendMessage("Join us: " + Libs.tgutil.getChatLink(chat, "html"), { parse_mode: "HTML" })
```

### `formatMessageLink(chatId, messageId, parseMode?, text?)`

```js
let link = Libs.tgutil.formatMessageLink(msg.chat.id, msg.message_id, "html", "original post")
Bot.sendMessage("See " + link, { parse_mode: "HTML" })
```

### `createDeepLink(botUsername, command?, params?)`

```js
Libs.tgutil.createDeepLink("MyBot", "start", { ref: "abc" })
// https://t.me/MyBot/start?ref=abc
```

---

## Text escaping

### `escapeText(text, parseMode?)`

Always escape **user input** before embedding in formatted messages.

```js
let safe = Libs.tgutil.escapeText(params, "html")
Bot.sendMessage("<b>You said:</b> " + safe, { parse_mode: "HTML" })

let safe2 = Libs.tgutil.escapeText(params, "markdownv2")
Bot.sendMessage("You said: " + safe2, { parse_mode: "MarkdownV2" })
```

| Mode | Escapes |
| --- | --- |
| `html` | `& < >` |
| `markdown` / `markdownv2` | `_ * [ ] ( ) ~ \` > # + - = \| { } . !` |

### `parseEntities(text, entities, parseMode?)`

Converts Telegram `MessageEntity` arrays to formatted text. Processes from end to start to preserve offsets.

Supported: `bold`, `italic`, `underline`, `strikethrough`, `spoiler`, `code`, `pre`, `blockquote`, `expandable_blockquote`, `text_link`, `text_mention`, `custom_emoji`.

```js
// Echo formatted message
let out = Libs.tgutil.parseEntities(msg.text, msg.entities, "html")
Bot.sendMessage(out, { parse_mode: "HTML" })
```

---

## WebApp helpers

### `validateWebAppData(rawData, botToken?)`

Parses and verifies Telegram WebApp init data using HMAC-SHA256. Defaults to `bot.token`.

```js
let result = Libs.tgutil.validateWebAppData(params.webapp_data)

if (!result.valid) {
  return Bot.sendMessage("Invalid WebApp: " + result.error)
}

let webUser = result.data.user
let authDate = result.data.auth_date
Bot.sendMessage("Hello " + webUser.first_name + "!")
```

Success shape:

```js
{
  valid: true,
  data: {
    user: { id, first_name, ... },
    chat: { ... } | null,
    auth_date: Date,
    query_id: "...",
    hash: "..."
  }
}
```

### `createWebAppData(data)`

URL-encodes payload for WebApp buttons (objects JSON-stringified).

---

## Utilities

### `splitMessage(text, maxLength?)`

Splits long text for Telegram's 4096 limit. Prefers newline breaks, then spaces, then hard cut.

```js
let parts = Libs.tgutil.splitMessage(longReport, 4096)
for (let part of parts) {
  Bot.sendMessage(part)
}
```

### `formatNumber(num)`

```js
Libs.tgutil.formatNumber(1500)     // "1.5K"
Libs.tgutil.formatNumber(2500000)  // "2.5M"
```

---

## Full example — welcome card

```js
let mention = Libs.tgutil.getUserMention(user, "html")
let photo = Libs.tgutil.getProfilePhotoUrl(user)

let card = [
  "<b>Welcome " + mention + "!</b>",
  "",
  "Name: " + Libs.tgutil.getFullName(user),
  "ID: " + user.id,
  "Account: " + (Libs.tgutil.isBot(user) ? "Bot" : "Human")
]

if (photo) card.push("Photo: " + photo)

Bot.sendMessage(card.join("\n"), { parse_mode: "HTML" })
```

---

## Full example — safe reply to user message

```js
let quoted = Libs.tgutil.escapeText(params, "html")
let who = Libs.tgutil.getUserMention(user, "html")

Bot.sendMessage(
  who + " said:\n<i>" + quoted + "</i>",
  { parse_mode: "HTML" }
)
```

---

## Method reference

| Method | Returns |
| --- | --- |
| `getNameFor(member, options?)` | `string` |
| `getFullName(member)` | `string` |
| `getLinkFor(member, parseMode?, customText?)` | `string` |
| `formatUser(member, options?)` | `string` |
| `getUserMention(member, parseMode?)` | `string` |
| `isBot(member)` | `boolean` |
| `getProfilePhotoUrl(member)` | `string \| null` |
| `getChatLink(chat, parseMode?)` | `string` |
| `formatMessageLink(chatId, messageId, parseMode?, text?)` | `string` |
| `createDeepLink(botUsername, command?, params?)` | `string` |
| `escapeText(text, parseMode?)` | `string` |
| `parseEntities(text, entities, parseMode?)` | `string` |
| `validateWebAppData(rawData, botToken?)` | `{ valid, data?, error? }` |
| `createWebAppData(data)` | `string` |
| `splitMessage(text, maxLength?)` | `string[]` |
| `formatNumber(num)` | `string` |

---

## Notes

- All methods are **sync** — no `await`.
- `validateWebAppData` uses `modules.crypto` for HMAC.
- Profile photo URL requires public username — not guaranteed for all users.
