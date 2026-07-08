# MCL (Membership Checker)

Verify that users joined required Telegram channels or groups before granting access.

**File:** `Libs/mcl.js` · **Access:** `Libs.mcl.*` · **Async** (except `getBtn`) · v1.0.0

---

## What problem does it solve?

Classic bot pattern: *"Join our channel to unlock this feature."*

`mcl` calls Telegram's `getChatMember` API live for each channel and tells you:

- Which channels the user joined
- Which they left or were kicked from
- Which channels the bot cannot access (invalid)

It also builds join buttons and ready-to-send status messages.

---

## Requirements

| Rule | Detail |
| --- | --- |
| Bot must be in channel | Add bot as member/admin first |
| `getChatMember` permission | Bot needs rights to check membership |
| Max channels | **10** per call |
| `getBtn` usernames | Only public `@username` — numeric IDs skipped |

---

## Quick start — simple gate

```js
let channels = ["@MyChannel", "@MyGroup"]

if (await Libs.mcl.quick(user.id, channels)) {
  Bot.run("/premiumMenu")
} else {
  Bot.sendMessage("Join our channels first, then try again.")
}
```

---

## Methods

| Method | Async | Description |
| --- | --- | --- |
| `check(userId, channels)` | Yes | Full breakdown |
| `quick(userId, channels)` | Yes | `true` if all joined |
| `getLeftChannels(userId, channels)` | Yes | Channels user left |
| `getInvalidChannels(userId, channels)` | Yes | `{ channel, reason }[]` |
| `summaryText(userId, channels, options?)` | Yes | User-facing message |
| `getStats(userId, channels)` | Yes | Numeric summary |
| `getBtn(channels, options?)` | **No** | Inline join buttons |

---

## `check(userId, channels)`

Main method — returns detailed result.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| `userId` | `number` | Telegram user ID |
| `channels` | `string[]` | `"@username"` or numeric chat ID |

### Returns

```js
{
  allJoined: true,
  joined: ["@Channel1", "@Channel2"],
  left: [],
  invalid: []
}
```

| Field | Description |
| --- | --- |
| `allJoined` | `true` only if user joined every valid channel |
| `joined` | Confirmed memberships |
| `left` | Status `left` or `kicked` |
| `invalid` | `{ channel, reason }` — bot can't access |

```js
let result = await Libs.mcl.check(user.id, ["@NewsChannel", "@CommunityGroup"])

if (!result.allJoined) {
  if (result.left.length) {
    Bot.sendMessage("Please join: " + result.left.join(", "))
  }
  if (result.invalid.length) {
    Bot.sendMessage("Some channels are misconfigured — contact admin.")
  }
}
```

---

## `quick(userId, channels)`

Returns `true` or `false` — shortcut for `check().allJoined`.

```js
if (await Libs.mcl.quick(user.id, ["@Chan1"])) {
  Bot.sendMessage("Thanks for joining!")
}
```

---

## `getLeftChannels` / `getInvalidChannels`

```js
let left = await Libs.mcl.getLeftChannels(user.id, channels)
// ["@Chan2"]

let bad = await Libs.mcl.getInvalidChannels(user.id, channels)
// [{ channel: "@Fake", reason: "Channel inaccessible" }]
```

---

## `summaryText(userId, channels, options?)`

Ready-to-send status text. Customize via options:

| Option | Default |
| --- | --- |
| `joinedMessage` | `"You have joined all required channels."` |
| `leftHeader` | `"Please join the following channels:"` |
| `invalidHeader` | `"Inaccessible channels:"` |
| `separator` | `"\n\n"` |

```js
let text = await Libs.mcl.summaryText(user.id, channels, {
  joinedMessage: "All good — here's your reward!",
  leftHeader: "Join these channels to continue:"
})
```

---

## `getStats(userId, channels)`

```js
let stats = await Libs.mcl.getStats(user.id, channels)
// {
//   total: 3,
//   joinedCount: 2,
//   leftCount: 1,
//   invalidCount: 0,
//   percentJoined: 66.666...,
//   allJoined: false,
//   hasIssues: true
// }
```

Useful for admin dashboards or analytics commands.

---

## `getBtn(channels, options?)`

**Sync** — no `await`. Builds inline keyboard join rows.

| Option | Default | Description |
| --- | --- | --- |
| `buttonPrefix` | `"Join"` | Text before `@channel` |

Only `@username` public channels get buttons. Private numeric IDs are skipped.

```js
let buttons = Libs.mcl.getBtn(["@Chan1", "@Chan2"], { buttonPrefix: "📢 Join" })
// [
//   [{ text: "📢 Join @Chan1", url: "https://t.me/Chan1" }],
//   [{ text: "📢 Join @Chan2", url: "https://t.me/Chan2" }]
// ]

Api.sendMessage({
  chat_id: chat.id,
  text: "Join to continue:",
  reply_markup: { inline_keyboard: buttons }
})
```

---

## Full gate example

```js
let channels = ["@MyChannel", "@MyGroup"]
let result = await Libs.mcl.check(user.id, channels)

if (result.allJoined) {
  Bot.run("/mainMenu")
  return
}

let left = result.left.length ? result.left : channels

await Api.sendMessage({
  chat_id: chat.id,
  text: await Libs.mcl.summaryText(user.id, channels),
  reply_markup: {
    inline_keyboard: Libs.mcl.getBtn(left, { buttonPrefix: "📢 Join" })
  }
})
```

---

## Full example — soft gate with retry button

```js
// /verify command — user taps after joining
let ok = await Libs.mcl.quick(user.id, ["@RequiredChannel"])

if (ok) {
  await Libs.ResourcesLibv2.userRes("gold").add(10)
  return Bot.sendMessage("Verified! +10 gold.")
}

Api.sendMessage({
  chat_id: chat.id,
  text: "Join @RequiredChannel then tap Verify.",
  reply_markup: {
    inline_keyboard: [
      [{ text: "Join Channel", url: "https://t.me/RequiredChannel" }],
      [{ text: "Verify", callback_data: "verify_join" }]
    ]
  }
})
```

---

## Common mistakes

```js
// Wrong — ok is a Promise, not boolean
if (Libs.mcl.quick(user.id, channels)) { ... }

// Correct
if (await Libs.mcl.quick(user.id, channels)) { ... }
```

```js
// Wrong — numeric ID won't appear in getBtn
Libs.mcl.getBtn([-1001234567890])

// Correct — use @username for join buttons
Libs.mcl.getBtn(["@MyChannel"])
```

```js
// Wrong — bot not in channel → silent invalid, gate never passes
// Fix: add bot to channel as member/admin BEFORE deploying gate
```

```js
// Wrong — more than 10 channels
await Libs.mcl.check(user.id, bigArray)  // throws LimitError

// Correct — split into batches of 10
```

---

## Notes

- Membership checked **live** — not cached.
- Throws `[LibsError]` if channels array empty or > 10 items.
- Channel strings accept `@Chan` or `Chan` — normalized internally.
- TBL does not support `.then()` — always `await` async methods.
