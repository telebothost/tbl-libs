# refLib

Referral engine — build invite links, track who brought whom, maintain a leaderboard. Uses async `db.user` and `db.bot`. **All methods need `await`.** v1.0.0

---

## What is it?

`Libs.refLib` handles the full referral lifecycle:

1. User shares `https://t.me/YourBot?start=ref123456`
2. New user opens link → `/start ref123456`
3. `track()` parses `params`, attributes the referral, updates counts
4. Leaderboard cache updates automatically

| Feature | Implementation |
| --- | --- |
| Referral count | `db.user.incr` (atomic) |
| Referral list | `db.user.push` (append-only) |
| Leaderboard | Bounded top-50 cache on `db.bot` |
| Profile cache | `db.bot` on `register()` |

**Storage keys changed:** v1 used `REFLIB_*` (deprecated Bot/User properties). v1.0.0 uses `rfl:*` on async `db`. Data does not auto-migrate.

---

## Quick start

```js
let result = await Libs.refLib.track({
  prefixes: ["ref"],
  onJoin: async ({ referrer, count }) => {
    Bot.sendMessage(chat.id, "Referred by " + referrer.first_name)
  }
})
let url = await Libs.refLib.register()
```

---

## Core methods

| Method | Returns | Description |
| --- | --- | --- |
| `track(handlers)` | `{ type, ... }` | Process update + fire events |
| `configure({ prefixes })` | void | Default link prefixes |
| `link({ bot, prefix })` | string | Build URL (no db) |
| `register({ prefix, bot })` | string | Cache profile + return URL |
| `count(userId?)` | number | Referral count |
| `referrer()` | object\|null | Who referred current user |
| `isReferred()` | boolean | Has a referrer |
| `list(userId?, { limit })` | array | Referral list |
| `leaderboard(top?)` | array | Top N with ranks |
| `rank(userId?)` | number | Rank (0 = unranked) |
| `stats(userId?)` | object | Dashboard bundle |
| `addCount(userId, amount?)` | number | Manual increment |

### Legacy aliases

`getLink` → `register`, `getRefCount` → `count`, `getAttractedBy` → `referrer`, `getRefList` → `list`, `getTopList` → `leaderboardMap`, `onAttracted` → `onJoin`, `onTouchOwnLink` → `onSelf`, `onAlreadyAttracted` → `onRepeat`

---

## Storage keys

| Key | Scope | Purpose |
| --- | --- | --- |
| `rfl:ct` | db.user | Count (incr) |
| `rfl:by` | db.user | Referrer |
| `rfl:ls` | db.user | List (push) |
| `rfl:og` | db.user | Organic flag |
| `rfl:top` | db.bot | Top 50 board |
| `rfl:px` | db.bot | Link prefixes |
| `rfl:lk:{id}` | db.bot | Profile cache |
