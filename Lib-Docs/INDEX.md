# TBL Libs — Documentation Index

Official library **source** lives in [`Libs/`](../Libs/). On the TBL platform they are used as **`Libs.<name>`** — there is no per-bot `Libs/` folder.

Version **1.0.0** (pre-release).

---

## Official libs vs custom libs

| | Official (`Libs.xx`) | Custom (your bot) |
| --- | --- | --- |
| Access | `Libs.random.randomInt(1, 6)` | `let x = require("mylib")` |
| Defined in | This repo → TBL platform | A command’s Logic field |
| Example | `await Libs.refLib.count()` | `let lib = require("testlib"); await lib.run()` |

To **test or develop** code from this repo (including `under_dev/`), create a command, paste the `.js` source, then `require("commandname")` from other commands. See [README](../README.md#custom-libs--requirecommandname).

---

## Library catalog

| File | Access | Type | Storage | Docs |
| --- | --- | --- | --- | --- |
| `random.js` | `Libs.random` | sync | — | [random.md](random.md) |
| `dateTimeFormat.js` | `Libs.dateTimeFormat` | sync | — | [dateTimeFormat.md](dateTimeFormat.md) |
| `tgutil.js` | `Libs.tgutil` | sync | — | [tgutil.md](tgutil.md) |
| `mcl.js` | `Libs.mcl` | async* | — | [mcl.md](mcl.md) |
| `ResourcesLibv2.js` | `Libs.ResourcesLibv2` | async | `db.bot` | [ResourcesLibv2.md](ResourcesLibv2.md) |
| `refLib.js` | `Libs.refLib` | async | `db.user` + `db.bot` | [refLib.md](refLib.md) |
| `translate.js` | `Libs.translate` | async | `db` + HTTP | [TranslateLib.md](TranslateLib.md) |
| `cooldown.js` | `Libs.cooldown` | async | `db.user` + `db.bot` | [cooldown.md](cooldown.md) |
| `ResourcesLib.js` | `Libs.ResourcesLib` | sync (deprecated) | `Bot` properties | [ResourcesLib.md](ResourcesLib.md) |

\* `mcl.getBtn()` is sync; all other `mcl` methods are async.

---

## Sync vs async

| Rule | Libraries |
| --- | --- |
| Call directly — no `await` | `random`, `dateTimeFormat`, `tgutil`, `mcl.getBtn()` |
| Always `await` | `mcl`, `ResourcesLibv2`, `refLib`, `translate`, `cooldown` |

TBL does not support `.then()` in command Logic — use `await` only.

**`Bot.sendMessage`:** first argument is **text**; options (e.g. `parse_mode`) go in the second argument. Sends to the **current chat** automatically — do not pass `chat.id`.

```js
Bot.sendMessage("Hello!")
await Bot.sendMessage("Bold text", { parse_mode: "HTML" })
```

For **inline keyboard** buttons, use `Api.sendMessage({ text, reply_markup })` instead.

---

## Quick examples

```js
// Sync
let roll = Libs.random.randomInt(1, 6)
let name = Libs.tgutil.getNameFor(user)
let today = Libs.dateTimeFormat.getCurrentDate("isoDate")

// Async — channel gate
let ok = await Libs.mcl.quick(user.id, ["@MyChannel"])

// Async — economy
let gold = Libs.ResourcesLibv2.userRes("gold")
await gold.add(50)
Bot.sendMessage("Gold: " + await gold.value())

// Async — referrals
await Libs.refLib.track({
  onJoin: async ({ referrer, count }) => {
    Bot.sendMessage(referrer.first_name + " invited you! They have " + count + " refs.")
  }
})
let link = await Libs.refLib.register()

// Async — cooldown
let run = await Libs.cooldown.tryRun("daily_bonus", 86400)
if (!run.ok) {
  return Bot.sendMessage("Come back in " + await Libs.cooldown.format("daily_bonus"))
}

// Async — translate
let text = await Libs.translate.translate("Welcome!", { to: "hi" })
```

---

## Choosing a library

| You need… | Use |
| --- | --- |
| Dice, loot, passwords, test data | `random` |
| Dates, countdowns, relative time | `dateTimeFormat` |
| User mentions, escaping, WebApp data | `tgutil` |
| "Join channel to continue" gates | `mcl` |
| Coins, XP, inventories, passive income | `ResourcesLibv2` |
| Invite links, referral counts, leaderboard | `refLib` |
| Multi-language bot text | `translate` |
| Daily bonus, attack cooldown, rate limits | `cooldown` |

---

## Deprecated

| Old | Replacement | Why |
| --- | --- | --- |
| `Libs.ResourcesLib` (Bot properties) | `Libs.ResourcesLibv2` (`db.bot`) | Async storage, atomic incr/decr |
| Old `refLib` (`REFLIB_*` keys) | `Libs.refLib` (`rfl:*` keys) | Atomic counts, bounded leaderboard |
| Old `translate` (`User.setProperty`) | `Libs.translate` (`db.user`) | Persistent lang + usage tracking |

Legacy and `db` data are **separate** — migration needs a one-time copy script.

---

## Public docs

Published mirror: [tbl-static-docs/docs/libs](https://github.com/telebothost/tbl-static-docs/tree/main/docs/libs)
