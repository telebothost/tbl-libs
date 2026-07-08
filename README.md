# TBL Libs

Official source repository for [TBL (Tele Bot Language)](https://docs.telebothost.com) helper libraries on TeleBotHost.

This repo holds the **library code** and documentation. On the TBL platform, built-in libraries are exposed as **`Libs.<name>`** — you do not upload or manage a `Libs/` folder in your bot.

Version **1.0.0** (pre-release).

---

## How libraries work on TBL

There are two separate paths:

| | Official libs (`Libs.xx`) | Your own custom libs |
| --- | --- | --- |
| **Source** | This repo → deployed by TBL | Your bot commands |
| **Access** | `Libs.random`, `Libs.refLib`, … | `require("commandname")` |
| **Who can add** | TBL platform (from this repo) | You, in your bot |
| **Folder upload** | Not possible — no `Libs/` folder on bots | Not needed |

### Official libs — `Libs.<name>`

Built-in libraries load lazily on the platform. Use them directly in any command Logic:

```js
Libs.random.randomInt(1, 6)
await Libs.refLib.count()
Libs.tgutil.getNameFor(user)
```

Names are **case-sensitive** (`Libs.tgutil` works; `Libs.TgUtil` does not).

In examples, `Bot.sendMessage(text, options?)` sends to the **current chat** — text first, options second.

### Custom libs — `require("commandname")`

You **cannot** add files to a `Libs/` folder on TBL. To develop or test your own library:

1. **Create a command** (e.g. `/testlib` or a hidden command named `testlib`).
2. **Paste the library code** into that command’s Logic field — the full `.js` body ending with `module.exports = { ... }`.
3. **Load it from another command** with `require()`:

```js
let mylib = require("testlib")

let roll = mylib.randomInt(1, 6)
await mylib.doSomething(user.id)
```

The string passed to `require()` is the **command name**, not a file path.

#### Example — custom lib command (`testlib`)

Logic field of command `testlib` (library only — no bot replies needed):

```js
const mylib = {
  randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  greet: async function(name) {
    await Bot.sendMessage("Hello " + name)
  }
};

module.exports = mylib;
```

#### Example — command that uses it (`/play`)

```js
let game = require("testlib")

let roll = game.randomInt(1, 6)
Bot.sendMessage("You rolled: " + roll)
```

Use this pattern to prototype libs from this repo (`under_dev/`, or your own code) before contributing them as official `Libs.*` entries.

---

## Included official libraries

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

**In development** (source in `under_dev/`, not yet on platform as `Libs.*`): [oxapay](under_dev/oxapay.md), [ton](under_dev/ton.md). Test via `require()` until promoted.

Documentation: **[Lib-Docs/](Lib-Docs/INDEX.md)** · Published: [docs.telebothost.com/libs](https://docs.telebothost.com/libs/)

---

## Quick start (official `Libs`)

### Sync

```js
let roll = Libs.random.randomInt(1, 6)
let name = Libs.tgutil.getNameFor(user)
Bot.sendMessage(name + " rolled " + roll)
```

### Async

```js
let gold = Libs.ResourcesLibv2.userRes("gold")
await gold.add(50)
Bot.sendMessage("Gold: " + await gold.value())
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

- Always `await` async Lib methods.
- TBL does **not** support `.then()` / `.catch()` in command Logic.
- Each Lib method has a **2-second** execution timeout.
- Same rules apply to **custom** libs loaded via `require()` — `await` their async methods too.

---

## Storage (`db`)

Modern official libraries use async `db.user` and `db.bot` — not deprecated `Bot.set` / `User.set`.

| Library | Storage |
| --- | --- |
| `ResourcesLibv2` | `db.bot` — keys `ResourcesLib_*` |
| `refLib` | `db.user` + `db.bot` — keys `rfl:*` |
| `translate` | `db.user` + `db.bot` |
| `cooldown` | `db.user` / `db.bot` — keys `cd:{name}` |

---

## Repository structure

```
tbl-libs/
├── Libs/           # Official lib source (maps to Libs.* on TBL when deployed)
├── under_dev/      # Experimental source (test with require() first)
└── Lib-Docs/       # Documentation for bot developers
```

Files in `Libs/` correspond to platform access names: `Libs/tgutil.js` → `Libs.tgutil`.

---

## Developing a new official lib

### 1. Prototype with `require()`

Copy code from `Libs/` or `under_dev/` into a command (e.g. `mylib`), then in a test command:

```js
let lib = require("mylib")
await lib.configure({ ... })
```

### 2. Follow export rules

```js
module.exports = {
  myMethod: function() {},
  myAsync: async function() {}
};
```

Do **not** use `exports = { ... }` alone. Export an object or class.

### 3. Contribute to this repo

Open a PR with:

- `.js` file under `Libs/` (or `under_dev/` for experimental)
- Docs in `Lib-Docs/`
- Notes on how you tested via `require()` on TBL

Merged libs are deployed to the platform as **`Libs.<name>`** — not something you install per bot.

### Best practices

1. Validate inputs before operating on user data.
2. Use `db.incr` / `decr` for counters and balances.
3. Check `{ ok }` on `db.set` / `db.del`; try/catch on `incr` / `push`.
4. Escape user text with `Libs.tgutil.escapeText` when using official libs alongside custom code.
5. Store API keys in bot **ENV** — never hard-code secrets in Logic.

---

## Links

- [Lib-Docs index](Lib-Docs/INDEX.md)
- [TBL documentation](https://docs.telebothost.com)
- [Libs (published)](https://docs.telebothost.com/libs/)
- [db instance](https://docs.telebothost.com/db-instance/)

---

## License

See repository license file. Libraries are provided for use with TeleBotHost TBL bots.
