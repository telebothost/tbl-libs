# refLib

Full referral system — invite links, attribution on `/start`, referral lists, and a bounded top-50 leaderboard.

**File:** `Libs/refLib.js` · **Access:** `Libs.refLib.*` · **Async** — always `await` · v1.0.0

---

## What problem does it solve?

You want users to invite friends and get credit when someone joins via their link:

```
https://t.me/YourBot?start=ref123456789
```

When a new user opens that link, Telegram sends `/start ref123456789`. `refLib.track()` parses `params`, attributes the referral atomically, and fires your callbacks.

| Feature | How |
| --- | --- |
| Referral count | `db.user.incr` — atomic, no race conditions |
| Who referred whom | `db.user.set` on referrer profile |
| Referral history | `db.user.push` — append-only list |
| Leaderboard | Bounded top-50 cache on `db.bot` — no full-bot scan |
| Link prefixes | Configurable (`ref`, `vip`, etc.) |

---

## Storage keys (`rfl:*`)

| Key | Scope | Purpose |
| --- | --- | --- |
| `rfl:ct` | `db.user` | Referral count (use `incr`) |
| `rfl:by` | `db.user` | Who referred this user |
| `rfl:ls` | `db.user` | Referral list (use `push`) |
| `rfl:og` | `db.user` | Organic arrival flag (no ref code) |
| `rfl:top` | `db.bot` | Top 50 leaderboard `[{ i, n }]` |
| `rfl:px` | `db.bot` | Registered link prefixes |
| `rfl:lk:{userId}` | `db.bot` | Cached referrer profile snapshot |
| `rfl:g:{userId}` | `db.bot` | Global count mirror for leaderboard |

**Migration note:** Old `REFLIB_*` keys on deprecated `Bot`/`User` properties do **not** auto-migrate to `rfl:*`.

---

## Referral flow

```
User A runs /mylink  →  register() caches profile + returns link
User B opens link  →  /start ref{A's id}
User B's /start    →  track() attributes B to A
                   →  A's count incr, B added to A's list
                   →  leaderboard updated if A qualifies
```

### `track()` return types

| `type` | Meaning |
| --- | --- |
| `join` | New referral attributed |
| `self` | User opened their own link |
| `repeat` | User already had a referrer or is organic |
| `organic` | No ref code or not a `/start` payload |

---

## Quick start

**`/start` command** — always call `track()` first:

```js
let result = await Libs.refLib.track({
  prefixes: ["ref", "vip"],
  onJoin: async ({ referrer, count }) => {
    Bot.sendMessage(      "Welcome! You were invited by " + referrer.first_name + "."
    )
    // Optional: notify referrer via another command or admin channel
  },
  onSelf: async () => {
    Bot.sendMessage("That's your own invite link — share it with friends!")
  },
  onRepeat: async ({ existingReferrer }) => {
    // User already attributed — usually silent
  },
  onOrganic: async () => {
    Bot.sendMessage("Welcome to the bot!")
  }
})

// Continue normal /start logic based on result.type
if (result.type === "join") {
  await Libs.ResourcesLibv2.userRes("gold").add(10)  // welcome bonus
}
```

**`/mylink` command** — generate and cache link:

```js
let url = await Libs.refLib.register({ prefix: "ref" })
let count = await Libs.refLib.count()
let rank = await Libs.refLib.rank()

Bot.sendMessage(  "Your invite link:\n" + url +
  "\n\nReferrals: " + count +
  (rank ? "\nRank: #" + rank : "")
)
```

---

## Core methods

### Configuration and links

| Method | Async | Description |
| --- | --- | --- |
| `configure({ prefixes })` | No | Set default prefixes in memory |
| `link({ bot, prefix })` | No | Build URL — no db I/O |
| `register({ prefix, bot })` | Yes | Cache profile + save prefix + return URL |

```js
// link() is instant — good for UI that already called register()
let quick = Libs.refLib.link({ prefix: "vip" })
// https://t.me/MyBot?start=vip123456789

// register() should run once per user (e.g. /mylink), not every message
let url = await Libs.refLib.register()
```

### Reading data

| Method | Returns | Description |
| --- | --- | --- |
| `count(userId?)` | `number` | How many users this person referred |
| `referrer()` | `object\|null` | Who referred the current user |
| `isReferred()` | `boolean` | Has `rfl:by` set |
| `list(userId?, { limit })` | `array` | Referred users with names and dates |
| `leaderboard(top?)` | `array` | `[{ userId, count, rank }]` |
| `leaderboardMap()` | `object` | `{ userId: count }` legacy shape |
| `rank(userId?)` | `number` | Rank 1–50, or `0` if unranked |
| `stats(userId?)` | `object` | Dashboard bundle (one `mget`) |
| `addCount(userId, amount?)` | `number` | Manual increment (admin/rewards) |

```js
// Dashboard command
let s = await Libs.refLib.stats()
Bot.sendMessage([
  "Referrals: " + s.count,
  "Rank: " + (s.rank || "unranked"),
  "Your link: " + s.link,
  "Referred by: " + (s.referrer ? s.referrer.first_name : "nobody")
].join("\n"))

// Top 10 leaderboard
let top = await Libs.refLib.leaderboard(10)
let text = top.map(r => "#" + r.rank + " — ID " + r.userId + ": " + r.count + " refs").join("\n")
Bot.sendMessage("Top referrers:\n" + text)
```

### Event handlers in `track()`

| Handler | Legacy alias | When fired |
| --- | --- | --- |
| `onJoin` | `onAttracted` | New referral attributed |
| `onSelf` | `onTouchOwnLink` | User opened own link |
| `onRepeat` | `onAlreadyAttracted` | Already referred / organic |
| `onOrganic` | — | Normal `/start` without code |

Handlers receive context objects:

```js
// onJoin
{ user, referrer, referrerId, count }

// onSelf
{ user, prefix }

// onRepeat
{ user, referrerId, existingReferrer }

// onOrganic
{ user }
```

---

## Full example — referral rewards

```js
// /start
await Libs.refLib.track({
  onJoin: async ({ referrer, count }) => {
    // Reward new user
    await Libs.ResourcesLibv2.userRes("gold").add(25)
    Bot.sendMessage("Welcome bonus: 25 gold!")

    // Reward referrer (use anotherUserRes for their balance)
    let refGold = Libs.ResourcesLibv2.anotherUserRes("gold", referrer.id)
    await refGold.add(50)

    // Milestone rewards
    if (count === 5) {
      await refGold.add(200)
      Bot.sendMessage("Your referrer just hit 5 referrals and earned a bonus!")
    }
  }
})
```

---

## Full example — VIP prefix

```js
Libs.refLib.configure({ prefixes: ["ref", "vip"] })

// VIP users get special links
let prefix = user.is_premium ? "vip" : "ref"
let url = await Libs.refLib.register({ prefix })
```

When someone opens `?start=vip123`, `track()` matches the `vip` prefix and attributes normally.

---

## Legacy aliases

| Old | New |
| --- | --- |
| `getLink()` | `register()` |
| `getRefCount()` | `count()` |
| `getAttractedBy()` | `referrer()` |
| `getRefList()` | `list()` |
| `getTopList()` | `leaderboardMap()` |

---

## Common mistakes

```js
// Wrong — register() on every message (wastes db writes)
Bot.sendMessage(await Libs.refLib.register())

// Correct — register once; use link() for repeat display
await Libs.refLib.register()  // first time only
Bot.sendMessage(Libs.refLib.link())
```

```js
// Wrong — forgot track() in /start (referrals never attributed)
Bot.sendMessage("Welcome!")

// Correct — track() must run when params may contain ref code
await Libs.refLib.track({ onJoin: ... })
```

```js
// Wrong — expecting old REFLIB keys to work
// Data from Bot.getProperty era is separate from db rfl:* keys
```

---

## Notes

- `track()` only processes referral codes when `message` starts with `/start` and `params` is a string.
- Leaderboard holds max **50** users — updates skip users below the cutoff when full.
- `link()` uses `user.id` and `bot.name` from globals.
- Rate limit: attribution does sequential `db` writes — avoid calling `track()` in tight loops.
