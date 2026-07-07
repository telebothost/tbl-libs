# MCL (Membership Checker)

Check whether a user joined required Telegram channels/groups.

**File:** `libsv2/mcl.js` · **Access:** `Libs.mcl.*` · **Async** (except `getBtn`)

---

## Methods

| Method | Async | Description |
| --- | --- | --- |
| `check(userId, channels)` | Yes | Full breakdown |
| `quick(userId, channels)` | Yes | `true` if all joined |
| `getLeftChannels(userId, channels)` | Yes | Left/kicked channels |
| `getInvalidChannels(userId, channels)` | Yes | `{ channel, reason }[]` |
| `summaryText(userId, channels, options?)` | Yes | User-facing message |
| `getStats(userId, channels)` | Yes | Counts and percentages |
| `getBtn(channels, options?)` | No | Inline join buttons |

**Limits:** max **10** channels per call. Bot must be in each channel.

---

## `check()` return shape

```js
{
  allJoined: true,
  joined: ["@Chan1"],
  left: [],
  invalid: []  // { channel, reason } when inaccessible
}
```

## `getStats()` return shape

```js
{
  total, joinedCount, leftCount, invalidCount,
  percentJoined, allJoined, hasIssues
}
```

## `getBtn(channels, options?)`

| Option | Default |
| --- | --- |
| `buttonPrefix` | `"Join"` |

Only `@username` public channels get buttons. Numeric IDs and private channels are skipped.

## `summaryText()` options

`joinedMessage`, `leftHeader`, `invalidHeader`, `separator`

---

## Example gate

```js
let channels = ["@MyChannel", "@MyGroup"]
if (await Libs.mcl.quick(user.id, channels)) {
  Bot.run("/mainMenu")
  return
}

await Api.sendMessage({
  chat_id: chat.id,
  text: await Libs.mcl.summaryText(user.id, channels),
  reply_markup: { inline_keyboard: Libs.mcl.getBtn(channels) }
})
```

---

## Common mistakes

```js
// Wrong — returns Promise
let ok = Libs.mcl.quick(user.id, ["@Chan1"])

// Correct
let ok = await Libs.mcl.quick(user.id, ["@Chan1"])
```
