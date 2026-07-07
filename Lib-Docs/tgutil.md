# tgutil

Telegram-specific helpers for names, mentions, links, WebApp data, and text formatting.

**File:** `libsv2/tgutil.js` · **Access:** `Libs.tgutil.*` · **Sync** — no `await`

---

## User methods

| Method | Description |
| --- | --- |
| `getNameFor(member, options?)` | Best display name (`preferFullName`, `preferUsername`) |
| `getFullName(member)` | First + last name |
| `getLinkFor(member, parseMode?, customText?)` | Clickable `tg://user?id=` link |
| `formatUser(member, options?)` | Name/link/ID with options |
| `getUserMention(member, parseMode?)` | Alias for `getLinkFor` |
| `isBot(member)` | Detect bot accounts |
| `getProfilePhotoUrl(member)` | `t.me/i/userpic/320/{username}.jpg` or `null` |

## Chat and links

| Method | Description |
| --- | --- |
| `getChatLink(chat, parseMode?)` | Public or private chat link |
| `formatMessageLink(chatId, messageId, parseMode?, text?)` | Link to a message |
| `createDeepLink(botUsername, command?, params?)` | `t.me` deep link with query params |

## Text formatting

| Method | Description |
| --- | --- |
| `escapeText(text, parseMode?)` | Escape for `html`, `markdown`, `markdownv2` |
| `parseEntities(text, entities, parseMode?)` | Convert MessageEntity array to formatted text |

Supported entities: `bold`, `italic`, `underline`, `strikethrough`, `spoiler`, `code`, `pre`, `blockquote`, `expandable_blockquote`, `text_link`, `text_mention`, `custom_emoji`.

## WebApp

| Method | Description |
| --- | --- |
| `validateWebAppData(rawData, botToken?)` | Parse + HMAC verify init data (`bot.token` default) |
| `createWebAppData(data)` | URL-encode WebApp payload |

## Utilities

| Method | Description |
| --- | --- |
| `splitMessage(text, maxLength?)` | Split into ≤4096 char chunks |
| `formatNumber(num)` | Compact `1.5K` / `2.5M` / `1.2B` display |

---

## Examples

```js
// Mention in HTML
let mention = Libs.tgutil.getUserMention(user, "html")
Bot.sendMessage(chat.id, "Hi " + mention, { parse_mode: "HTML" })

// Validate WebApp data
let wa = Libs.tgutil.validateWebAppData(params.initData)
if (wa.valid) Bot.sendMessage(chat.id, "Hello " + wa.data.user.first_name)

// Long message
for (let chunk of Libs.tgutil.splitMessage(bigText)) {
  Bot.sendMessage(chat.id, chunk)
}
```

---

## Notes

- Access is **`Libs.tgutil`** — matches `libsv2/tgutil.js`
- Match `parseMode` to `Bot.sendMessage` `parse_mode`
- `validateWebAppData` uses `modules.crypto` for HMAC-SHA256
