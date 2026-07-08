# dateTimeFormat

Date/time formatting, arithmetic, localization, relative time, and Unix timestamps.

**File:** `Libs/dateTimeFormat.js` · **Access:** `Libs.dateTimeFormat.*` · **Sync** — no `await` · v1.0.0

---

## What problem does it solve?

Bots constantly deal with dates:

- "Your subscription expires on July 7, 2025"
- "Event starts in 3 days"
- "Last seen 2 hours ago"
- Countdown timers and expiry checks

JavaScript `Date` is powerful but awkward. `dateTimeFormat` gives you masks, presets, locales, and helpers without reaching for external libraries.

---

## Quick start

```js
let today = Libs.dateTimeFormat.getCurrentDate("isoDate")
// "2025-07-07"

let nextWeek = Libs.dateTimeFormat.addDays(new Date(), 7)
Bot.sendMessage("Event: " + Libs.dateTimeFormat.format(nextWeek, "fullDate"))

let ago = Libs.dateTimeFormat.toRelativeTime(user.last_seen)
// "2 hours ago"
```

---

## Formatting

### `format(date, mask?, utc?, locale?)`

| Param | Default | Description |
| --- | --- | --- |
| `date` | — | `Date` or parseable string |
| `mask` | `"default"` | Pattern or preset name |
| `utc` | `false` | Use UTC |
| `locale` | `"en"` | Locale code |

```js
Libs.dateTimeFormat.format(new Date(), "yyyy-mm-dd HH:MM:ss")
// "2025-07-07 14:30:45"

Libs.dateTimeFormat.format(new Date(), "fullDate", false, "hi")
// Hindi weekday/month names
```

### `getCurrentDate(mask?, utc?, locale?)`

Shorthand for `format(new Date(), ...)`.

```js
Libs.dateTimeFormat.getCurrentDate("isoDate")      // "2025-07-07"
Libs.dateTimeFormat.getCurrentDate("mediumTime") // "2:30:45 PM"
```

### Named mask presets

| Preset | Example output |
| --- | --- |
| `default` | `Mon Jul 07 2025 14:30:45` |
| `shortDate` | `7/7/25` |
| `mediumDate` | `Jul 7, 2025` |
| `longDate` | `July 7, 2025` |
| `fullDate` | `Monday, July 7, 2025` |
| `shortTime` | `2:30 PM` |
| `mediumTime` | `2:30:45 PM` |
| `longTime` | `2:30:45 PM EST` |
| `isoDate` | `2025-07-07` |
| `isoTime` | `14:30:45` |
| `isoDateTime` | `2025-07-07T14:30:45` |
| `isoUtcDateTime` | UTC with `Z` |
| `custom` | `2025-07-07 14:30:45 EST` |

### Format tokens

| Token | Output | Example |
| --- | --- | --- |
| `yyyy` | 4-digit year | `2025` |
| `yy` | 2-digit year | `25` |
| `mmmm` | Full month | `July` |
| `mmm` | Short month | `Jul` |
| `mm` | Padded month | `07` |
| `m` | Month number | `7` |
| `dddd` | Full weekday | `Monday` |
| `ddd` | Short weekday | `Mon` |
| `dd` | Padded day | `07` |
| `d` | Day number | `7` |
| `HH` | 24-hour padded | `14` |
| `H` | 24-hour | `14` |
| `hh` | 12-hour padded | `02` |
| `h` | 12-hour | `2` |
| `MM` | Minutes padded | `30` |
| `ss` | Seconds padded | `45` |
| `TT` | AM/PM | `PM` |
| `Z` | Timezone | `EST` |

---

## Date arithmetic

| Method | Description |
| --- | --- |
| `addDays(date, days)` | Add days → new `Date` |
| `subtractDays(date, days)` | Subtract days |
| `addTime(date, { years, months, days, hours, minutes, seconds })` | Add multiple units |
| `subtractTime(date, units)` | Subtract multiple units |

```js
let tomorrow = Libs.dateTimeFormat.addDays(new Date(), 1)

let expiry = Libs.dateTimeFormat.addTime(new Date(), {
  months: 1,
  days: 0
})

let cooldownEnd = Libs.dateTimeFormat.addTime(new Date(), {
  hours: 0,
  minutes: 30,
  seconds: 0
})
```

---

## Comparison and validation

### `getTimeDifference(date1, date2)`

Returns `{ milliseconds, seconds, minutes, hours, days }` from `date1` to `date2`.

```js
let diff = Libs.dateTimeFormat.getTimeDifference("2025-01-01", "2025-02-01")
// days: 31
```

### `isValidDate(date)`

```js
if (!Libs.dateTimeFormat.isValidDate(userInput)) {
  return Bot.sendMessage("Invalid date format.")
}
```

Invalid dates in `format()` throw `SyntaxError: invalid date`.

### `getTimeZoneOffset(date?)`

Returns offset in minutes (e.g. `-300` for EST).

---

## Unix timestamps

```js
let ts = Libs.dateTimeFormat.toUnixTimestamp(new Date())  // 1751895045
let date = Libs.dateTimeFormat.fromUnixTimestamp(ts)
```

---

## Localization

Built-in locales: **`en`** (English), **`hi`** (Hindi).

### `registerLocale(localeCode, { dayNames, monthNames })`

| Field | Requirement |
| --- | --- |
| `dayNames` | Exactly 7 short names (Sun–Sat) |
| `monthNames` | Exactly 12 short names (Jan–Dec) |

Full names (`dddd`, `mmmm`) auto-generated from short names.

```js
Libs.dateTimeFormat.registerLocale("es", {
  dayNames: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  monthNames: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
})

Libs.dateTimeFormat.format(new Date(), "fullDate", false, "es")
```

### `getLocale(code)` / `getAvailableLocales()`

```js
Libs.dateTimeFormat.getAvailableLocales()  // ["en", "hi", "es"]
```

---

## Relative time

### `toRelativeTime(date, now?, locale?)`

Human-readable relative strings via `Intl.RelativeTimeFormat`. Falls back to English if locale unsupported.

```js
Libs.dateTimeFormat.toRelativeTime(new Date(Date.now() - 3600000))
// "1 hour ago"

Libs.dateTimeFormat.toRelativeTime(new Date(Date.now() + 86400000))
// "tomorrow" (with numeric: 'auto')
```

---

## Full example — subscription expiry

```js
let signup = new Date()
let expiry = Libs.dateTimeFormat.addTime(signup, { months: 1 })

if (new Date() > expiry) {
  Bot.sendMessage("Subscription expired.")
} else {
  let diff = Libs.dateTimeFormat.getTimeDifference(new Date(), expiry)
  Bot.sendMessage(    "Active — expires in " + diff.days + " days (" +
    Libs.dateTimeFormat.format(expiry, "mediumDate") + ")"
  )
}
```

---

## Full example — event countdown

```js
let eventDate = Libs.dateTimeFormat.addDays(new Date(), 7)
let diff = Libs.dateTimeFormat.getTimeDifference(new Date(), eventDate)

Bot.sendMessage(  "Event in " + diff.days + " days, " + (diff.hours % 24) + " hours!\n" +
  "Date: " + Libs.dateTimeFormat.format(eventDate, "fullDate")
)
```

---

## Full example — pair with cooldown

```js
let until = await Libs.cooldown.until("daily_bonus")
if (until) {
  Bot.sendMessage(    "Next bonus: " + Libs.dateTimeFormat.toRelativeTime(until)
  )
}
```

---

## Notes

- All methods are **sync**.
- Validate user input with `isValidDate()` before `format()`.
- Use `utc: true` for timezone-sensitive server logic.
- Use `toRelativeTime()` for "X ago" UI; use `format()` for fixed calendar dates.
