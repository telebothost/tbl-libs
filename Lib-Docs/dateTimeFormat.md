# dateTimeFormat

Date/time formatting, arithmetic, localization, and relative time.

**File:** `libsv2/dateTimeFormat.js` · **Access:** `Libs.dateTimeFormat.*` · **Sync** — no `await`

---

## Core methods

| Method | Description |
| --- | --- |
| `format(date, mask?, utc?, locale?)` | Format with mask or preset name |
| `getCurrentDate(mask?, utc?, locale?)` | Format `new Date()` |
| `addDays(date, days)` / `subtractDays(date, days)` | Day arithmetic |
| `addTime(date, units)` / `subtractTime(date, units)` | Multi-unit arithmetic |
| `getTimeDifference(date1, date2)` | `{ milliseconds, seconds, minutes, hours, days }` |
| `isValidDate(date)` | Validate parseable dates |
| `getTimeZoneOffset(date?)` | Offset in minutes |
| `toUnixTimestamp(date)` / `fromUnixTimestamp(ts)` | Unix seconds ↔ Date |

## Localization

| Method | Description |
| --- | --- |
| `registerLocale(code, { dayNames, monthNames })` | Add locale (7 days, 12 months) |
| `getLocale(code)` | Get locale data or `null` |
| `getAvailableLocales()` | List registered codes |

Built-in: **`en`**, **`hi`**.

```js
Libs.dateTimeFormat.registerLocale("es", {
  dayNames: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  monthNames: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
})
Libs.dateTimeFormat.format(new Date(), "fullDate", false, "es")
```

## Relative time

| Method | Description |
| --- | --- |
| `toRelativeTime(date, now?, locale?)` | `"1 hour ago"` / `"in 2 days"` via `Intl.RelativeTimeFormat` |

---

## Mask presets

`default`, `shortDate`, `mediumDate`, `longDate`, `fullDate`, `shortTime`, `mediumTime`, `longTime`, `isoDate`, `isoTime`, `isoDateTime`, `isoUtcDateTime`, `custom`

## Format tokens

`yyyy`, `yy`, `mmmm`, `mmm`, `mm`, `m`, `dddd`, `ddd`, `dd`, `d`, `HH`, `H`, `hh`, `h`, `MM`, `ss`, `TT`, `Z`

---

## Examples

```js
let today = Libs.dateTimeFormat.getCurrentDate("isoDate")
let nextWeek = Libs.dateTimeFormat.addDays(new Date(), 7)
let ago = Libs.dateTimeFormat.toRelativeTime(user.last_seen)
let diff = Libs.dateTimeFormat.getTimeDifference(new Date(), expiry)
```

---

## Notes

- `format()` throws `SyntaxError: invalid date` on bad input — use `isValidDate()` first
- Pass `utc: true` for UTC-sensitive logic
