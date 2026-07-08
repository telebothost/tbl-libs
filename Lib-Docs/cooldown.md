# cooldown

Per-user and bot-wide cooldown timers backed by async `db` storage with TTL auto-cleanup.

**File:** `Libs/cooldown.js` · **Access:** `Libs.cooldown.*` · **Async** — always `await` · v1.0.0

---

## What problem does it solve?

Bots often need to answer: *"Has this user already claimed the daily bonus?"* or *"Is the global event still on cooldown?"*

`cooldown` stores an **expiry timestamp** (milliseconds) per cooldown name. When time passes, TTL removes the key from storage automatically.

| Type | Storage | Who shares it |
| --- | --- | --- |
| User cooldown | `db.user` | One user |
| Global cooldown | `db.bot` | Everyone |

**Storage key:** `cd:{name}` — e.g. `cd:daily_bonus` stores `1751895045000` (when cooldown ends).

---

## How it works internally

1. `set("daily", 3600)` writes `Date.now() + 3600000` to `db.user` with TTL ≥ duration.
2. `remaining("daily")` reads that value and returns seconds until expiry (or `0` if ready).
3. `tryRun("daily", 3600)` checks first — only sets cooldown if currently ready.
4. A per-command memory cache (`_session`) avoids repeated `db` reads in the same command.

**Platform rule:** minimum TTL is **60 seconds**. Shorter durations are clamped to 60s for storage TTL (logic still uses your requested seconds for the expiry timestamp).

---

## Quick start — daily bonus

```js
// /daily command
let run = await Libs.cooldown.tryRun("daily_bonus", 86400)  // 24 hours

if (!run.ok) {
  let wait = await Libs.cooldown.format("daily_bonus")
  return Bot.sendMessage("Daily bonus already claimed. Try again in " + wait + ".")
}

// Grant reward — cooldown was set automatically by tryRun
await Libs.ResourcesLibv2.userRes("gold").add(100)
Bot.sendMessage("You received 100 gold!")
```

---

## Methods

### Setting cooldowns

| Method | Description | Returns |
| --- | --- | --- |
| `set(name, seconds, userId?)` | Start user cooldown | Expiry timestamp (ms) |
| `setGlobal(name, seconds)` | Start bot-wide cooldown | Expiry timestamp (ms) |

```js
// Manual set (e.g. after admin action)
await Libs.cooldown.set("attack", 30)           // current user, 30s
await Libs.cooldown.set("attack", 30, 123456)   // specific user
await Libs.cooldown.setGlobal("maintenance", 300) // all users, 5 min
```

### Checking status

| Method | Description | Returns |
| --- | --- | --- |
| `active(name, userId?)` | Is cooldown running? | `boolean` |
| `activeGlobal(name)` | Is global cooldown running? | `boolean` |
| `remaining(name, userId?)` | Seconds left | `number` (0 = ready) |
| `remainingGlobal(name)` | Global seconds left | `number` |
| `until(name, userId?)` | Expiry timestamp (ms), 0 if ready | `number` |

```js
if (await Libs.cooldown.active("spin")) {
  let secs = await Libs.cooldown.remaining("spin")
  Bot.sendMessage("Spin again in " + secs + "s")
}
```

### Run-if-ready pattern

| Method | Description | Returns |
| --- | --- | --- |
| `tryRun(name, seconds, userId?)` | Set only if off cooldown | `{ ok, remaining }` |
| `tryRunGlobal(name, seconds)` | Global version | `{ ok, remaining }` |

```js
let result = await Libs.cooldown.tryRun("fishing", 120)
if (result.ok) {
  Bot.sendMessage("You caught a fish!")
} else {
  Bot.sendMessage("Wait " + result.remaining + " more seconds.")
}
```

### Display and batch

| Method | Description | Returns |
| --- | --- | --- |
| `format(name, userId?)` | Human time e.g. `"4m 30s"` or `"ready"` | `string` |
| `formatGlobal(name)` | Global human time | `string` |
| `formatSeconds(secs)` | Format raw seconds (sync) | `string` |
| `checkAll(names, userId?)` | Batch check via `mget` | `{ name: { active, remaining } }` |

```js
// Dashboard: show all ability cooldowns at once
let status = await Libs.cooldown.checkAll(["attack", "defend", "heal"])
let lines = []
for (let name in status) {
  lines.push(name + ": " + (status[name].active
    ? Libs.cooldown.formatSeconds(status[name].remaining)
    : "ready"))
}
Bot.sendMessage(lines.join("\n"))
```

### Clearing

| Method | Description |
| --- | --- |
| `clear(name, userId?)` | Remove user cooldown |
| `clearGlobal(name)` | Remove global cooldown |
| `clearCache()` | Reset in-command memory cache |

```js
// Admin reset
await Libs.cooldown.clear("daily_bonus", targetUserId)
```

---

## Full example — game with multiple cooldowns

```js
// /battle command
let skills = await Libs.cooldown.checkAll(["slash", "fireball", "shield"])

if (skills.slash.active) {
  return Bot.sendMessage(    "Slash on cooldown (" + Libs.cooldown.formatSeconds(skills.slash.remaining) + "). " +
    "Fireball: " + (skills.fireball.active ? "CD" : "ready") + ", " +
    "Shield: " + (skills.shield.active ? "CD" : "ready")
  )
}

await Libs.cooldown.set("slash", 5)
Bot.sendMessage("You slashed the enemy!")
```

---

## Full example — global maintenance mode

```js
// /maintenance_on (admin)
await Libs.cooldown.setGlobal("bot_pause", 1800)  // 30 min pause for everyone

// Any command — check first
if (await Libs.cooldown.activeGlobal("bot_pause")) {
  return Bot.sendMessage(    "Bot is in maintenance. Resumes in " + await Libs.cooldown.formatGlobal("bot_pause")
  )
}
```

---

## Common mistakes

```js
// Wrong — returns a Promise, not boolean
if (Libs.cooldown.active("daily")) { ... }

// Correct
if (await Libs.cooldown.active("daily")) { ... }
```

```js
// Wrong — sets cooldown even when user shouldn't get reward
await Libs.cooldown.set("daily", 86400)
if (!userIsPremium) return  // user blocked but cooldown already set!

// Correct — check conditions first, then tryRun
if (!userIsPremium) return Bot.sendMessage("Premium only.")
let run = await Libs.cooldown.tryRun("daily", 86400)
```

---

## Notes

- `duration` must be at least **1 second** or `set` throws.
- Use `tryRun` for claim/reward commands; use `set` when you need explicit control.
- `formatSeconds` is sync — safe to call without `await`.
- Pair with `Libs.dateTimeFormat.toRelativeTime()` if you want calendar-style display instead of countdown.
