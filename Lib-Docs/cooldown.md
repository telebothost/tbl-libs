# cooldown

Per-user and bot-wide cooldowns. Access: **`Libs.cooldown`**. Async + `db` TTL. v1.0.0

## Quick start

```js
let run = await Libs.cooldown.tryRun("daily_bonus", 86400)
if (!run.ok) return Bot.sendMessage(chat.id, "Wait " + await Libs.cooldown.format("daily_bonus"))
```

## Methods

| Method | Description |
| --- | --- |
| `set(name, seconds, userId?)` | User cooldown |
| `setGlobal(name, seconds)` | Bot-wide cooldown |
| `active(name, userId?)` | Is active? |
| `remaining(name, userId?)` | Seconds left |
| `tryRun(name, seconds, userId?)` | Run if ready |
| `format(name, userId?)` | `"4m 30s"` style |
| `checkAll(names, userId?)` | Batch mget check |
| `clear(name, userId?)` | Remove cooldown |

Storage: `cd:{name}` on `db.user` or `db.bot`. TTL min 60s (platform rule).
