# 📦 Telegram Channel Membership Checker Library (`Libs.mcl`)

A utility to check if a user has joined specific Telegram channels—returns full status details, works with inline buttons, and handles up to 10 channels with ease.

---

## 🚀 Features

- ✅ Validates up to 10 channels per call
- 📊 Classifies channels into: `valid`, `left`, and `invalid`
- 💬 Returns user-readable summary
- 🎯 Supports inline keyboard button generation
- 🛡️ Handles Telegram API errors internally

---

## 📥 How to Access

If loaded via your Libs loader system:

```js
await Libs.mcl.check(user.id, ["@Chan1", "@Chan2"]);
```

> **Note:** This is an **async library**. You must use `await` when calling any method!

---

## 📘 Method Summary

| Method | Description |
|--------|-------------|
| `check(userId, channels)` | Main method – returns breakdown of membership status. |
| `quick(userId, channels)` | Returns `true` if all channels are joined. |
| `getLeftChannels(userId, channels)` | Returns only the channels the user left. |
| `getInvalidChannels(userId, channels)` | Returns only the invalid/inaccessible channels. |
| `summaryText(userId, channels)` | Returns a readable text message based on check. |
| `getBtn(channels)` | Generates inline keyboard buttons for join links. |

---

## 📤 check(userId, channels)

Returns full analysis of the user's status in each channel.

### Parameters:
- `userId`: Telegram user ID
- `channels`: Array of channel usernames (e.g., `["@MyChannel"]`) or numeric IDs

### Returns:
```js
{
  all_joined: true,
  valid: [ '@Channel1', '@Channel2' ],
  left: [],
  invalid: [],
  details: [
    {
      channel: '@Channel1',
      member: { /* full getChatMember response */ }
    }
  ]
}
```

---

## ⚡ quick(userId, channels)

Returns `true` only if all valid channels are joined.

```js
const ok = await Libs.mcl.quick(user.id, ["@Chan1", "@Chan2"]);
```

---

## 🔍 getLeftChannels(userId, channels)

Returns channels the user has **left**:

```js
const left = await Libs.mcl.getLeftChannels(user.id, ["@Chan1", "@Chan2"]);
```

---

## 🛑 getInvalidChannels(userId, channels)

Returns channels that are **inaccessible or invalid**:

```js
const bad = await Libs.mcl.getInvalidChannels(user.id, ["@Chan1", "@Chan2"]);
```

---

## 📝 summaryText(userId, channels)

Returns readable status text to send to users.

```js
const msg = await Libs.mcl.summaryText(user.id, ["@Chan1", "@Chan2"]);
await Api.sendMessage({ chat_id: user.id, text: msg });
```

---

## 🔘 getBtn(channels)

Generates inline keyboard for users to join channels.

```js
const btn = Libs.mcl.getBtn(["@Chan1", "@Chan2"]);
await Api.sendInlineKeyboard({
  chat_id: user.id,
  text: "👉 Join the channels:",
  reply_markup: { inline_keyboard: btn }
});
```

**Output:**
```js
[
  [{ text: "📢 Join @Chan1", url: "https://t.me/Chan1" }],
  [{ text: "📢 Join @Chan2", url: "https://t.me/Chan2" }]
]
```

---

## ⚠️ Common Mistakes

### ❌ Not using `await`

All methods are `async`, so you must use `await`:

```js
// Correct ✅
const res = await Libs.mcl.check(user.id, ["@Chan1"]);

// Wrong ❌
const res = Libs.mcl.check(user.id, ["@Chan1"]); // Will return a Promise!
```

---

### ❌ Invalid or Too Many Channels

```js
await Libs.mcl.check(user.id, ["@Too", "@Many", "@Channels", ...]); // ❌ throws error if >10
```

Limit: **max 10 channels**

---

### ❌ Channel ID without `@` → no link in `getBtn()`

```js
Libs.mcl.getBtn([-10012345678]); // Ignored in output ❌
```

Use usernames like `@MyChannel` for inline button generation.

---

## 🧪 Example Full Flow

```js
const checkResult = await Libs.mcl.check(user.id, ["@Chan1", "@Chan2"]);

if (!checkResult.all_joined) {
  await Api.sendInlineKeyboard({
    chat_id: user.id,
    text: await Libs.mcl.summaryText(user.id, ["@Chan1", "@Chan2"]),
    reply_markup: {
      inline_keyboard: Libs.mcl.getBtn(checkResult.left)
    }
  });
}
```

---
