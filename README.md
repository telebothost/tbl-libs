# TBL Libs

Official helper libraries for [TBL (Tele Bot Language)](https://docs.telebothost.com) on TeleBotHost. Ready-to-use modules for economy systems, referrals, cooldowns, translations, channel gates, and common Telegram bot utilities.

Version **1.0.0** (pre-release).

---

## Overview

**Libs** are JavaScript modules loaded lazily by the TBL runtime. No imports or setup — access them directly in command Logic:

```js
Libs.<libraryName>.<method>()
```

Names are **case-sensitive** (`Libs.tgutil` works; `Libs.TgUtil` does not).

| Benefit | Detail |
| --- | --- |
| Zero configuration | Files in `Libs/` are auto-discovered |
| Sync and async | Both patterns supported |
| TBL globals available | `Bot`, `Api`, `user`, `chat`, `db`, `HTTP`, and more |
| Bot-focused systems | Economy, referrals, cooldowns — not generic npm utilities |

For general-purpose packages (crypto, JWT, parsing), use TBL **Modules** instead.

---

## Included libraries

| Library | Access | Type | Purpose |
| --- | --- | --- | --- |
| `random` | `Libs.random` | Sync | Numbers, strings, distributions, test data |
| `dateTimeFormat` | `Libs.dateTimeFormat` | Sync | Formatting, arithmetic, locales, relative time |
| `tgutil` | `Libs.tgutil` | Sync | Names, mentions, escaping, WebApp helpers |
| `mcl` | `Libs.mcl` | Async | Channel membership checks and join buttons |
| `ResourcesLibv2` | `Libs.ResourcesLibv2` | Async | Economy, inventories, growth, transfers |
| `refLib` | `Libs.refLib` | Async | Referral links, tracking, leaderboard |
| `translate` | `Libs.translate` | Async | Multi-language translation with provider fallback |
| `cooldown` | `Libs.cooldown` | Async | Per-user and global cooldown timers |
| `ResourcesLib` | `Libs.ResourcesLib` | Sync (deprecated) | Legacy economy on `Bot` properties |

Full documentation with examples: **[Lib-Docs/](Lib-Docs/INDEX.md)**

Published docs mirror: [docs.telebothost.com/libs](https://docs.telebothost.com/libs/)

---

## Quick start

### Sync library

```js
let roll = Libs.random.randomInt(1, 6)
let name = Libs.tgutil.getNameFor(user)
let today = Libs.dateTimeFormat.getCurrentDate("isoDate")

Bot.sendMessage(chat.id, name + " rolled " + roll + " on " + today)
```

### Async library

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
await gold.add(50)
Bot.sendMessage(chat.id, "Gold: " + await gold.value())
```

### Channel gate

```js
if (!(await Libs.mcl.quick(user.id, ["@MyChannel"]))) {
  return Api.sendMessage({
    chat_id: chat.id,
    text: "Join our channel to continue.",
    reply_markup: { inline_keyboard: Libs.mcl.getBtn(["@MyChannel"]) }
  })
}
```

---

## Sync vs async

| Pattern | When to use | Example |
| --- | --- | --- |
| **Sync** | Instant computation, no I/O | `Libs.random.randomInt(1, 6)` |
| **Async** | `db`, HTTP, Telegram API | `await Libs.refLib.count()` |

Rules:

- Always `await` async Lib methods.
- TBL does **not** support `.then()` / `.catch()` chains in command Logic.
- Each Lib method has a **2-second** execution timeout.
- `mcl.getBtn()` is sync; all other `mcl` methods are async.

---

## Storage (`db`)

Modern libraries persist data through async `db.user` and `db.bot` — not deprecated `Bot.set` / `User.set`.

| Library | Storage |
| --- | --- |
| `ResourcesLibv2` | `db.bot` — keys `ResourcesLib_*` |
| `refLib` | `db.user` + `db.bot` — keys `rfl:*` |
| `translate` | `db.user` (`user_lang`) + `db.bot` (usage) |
| `cooldown` | `db.user` / `db.bot` — keys `cd:{name}` |

Legacy `Libs.ResourcesLib` uses `Bot.getProperty` / `Bot.setProperty` and is deprecated. Migrate to `ResourcesLibv2`; storage keys are compatible but data does not auto-migrate between storage backends.

---

## Repository structure

```
tbl-libs/
├── Libs/                  # Library source files (.js)
│   ├── random.js
│   ├── dateTimeFormat.js
│   ├── tgutil.js
│   ├── mcl.js
│   ├── ResourcesLibv2.js
│   ├── refLib.js
│   ├── translate.js
│   ├── cooldown.js
│   └── ResourcesLib.js    # deprecated
└── Lib-Docs/              # In-repo documentation
    ├── INDEX.md
    └── ...
```

Each file maps to `Libs.<filenameWithoutExtension>` in TBL.

---

## Writing your own library

Place a `.js` file in `Libs/` and export an object or class:

```js
// Libs/mylib.js
module.exports = {
  add: function(a, b) {
    return a + b;
  },
  fetchChat: async function(chatId) {
    return await Api.getChat({ chat_id: chatId });
  }
};
```

Usage:

```js
let sum = Libs.mylib.add(2, 3)
let chatInfo = await Libs.mylib.fetchChat(chat.id)
```

### Export requirements

```js
// Correct
module.exports = {
  myMethod: function() {},
  myAsync: async function() {}
};

// Incorrect — will not load
exports = { myMethod: () => {} };
```

### Common mistakes

**Forgetting `await` on async calls**

```js
// Wrong — data is a Promise
let data = Libs.mcl.quick(user.id, ["@channel"])

// Correct
let ok = await Libs.mcl.quick(user.id, ["@channel"])
```

**Using `.then()` syntax**

```js
// Wrong — not supported in TBL
Api.sendMessage({ text: "Hi" }).then(...)

// Correct
await Api.sendMessage({ text: "Hi" })
```

**Exporting a bare function instead of an object**

```js
// Wrong
module.exports = function() {}

// Correct
module.exports = { run: function() {} }
```

---

## Best practices

1. **Validate inputs** — check types and ranges before operating on user data.
2. **Return from async methods** — always return the value callers need.
3. **Use `db.incr` / `decr`** for counters and balances instead of read-modify-write.
4. **Check `{ ok }`** on `db.set` / `db.del` responses; wrap `incr` / `push` in try/catch.
5. **Escape user text** before embedding in formatted messages (`Libs.tgutil.escapeText`).
6. **Keep methods focused** — one library per domain (economy, referrals, etc.).

---

## Contributing

Contributions are welcome. To add or improve a library:

1. Add or edit a `.js` file under `Libs/`.
2. Export via `module.exports = { ... }`.
3. Use only TBL globals and JavaScript — no external npm dependencies in Lib files.
4. Document the library in `Lib-Docs/` with method tables and usage examples.
5. Test that `Libs.<name>.<method>()` loads and runs correctly (async methods with `await`).
6. Open a pull request with a clear description of purpose and API changes.

---

## Links

- [Lib-Docs index](Lib-Docs/INDEX.md) — full in-repo documentation
- [TBL documentation](https://docs.telebothost.com)
- [Libs section (published)](https://docs.telebothost.com/libs/)
- [db instance docs](https://docs.telebothost.com/db-instance/)

---

## License

See repository license file. Libraries are provided for use with TeleBotHost TBL bots.
