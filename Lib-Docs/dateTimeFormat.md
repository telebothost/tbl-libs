# 📅 dateTimeFormat Library Documentation

A powerful date/time manipulation and formatting library with localization support. Time has never been so easy to handle! ⏰

## 🌟 Core Features
- Date formatting with custom masks
- Timezone-aware operations
- Date arithmetic (add/subtract time)
- Time difference calculations
- Unix timestamp conversion
- Localization support

## 📋 Method Reference

### 1. `format(date, mask, utc, locale)`
Formats a date according to specified mask.

```javascript
const formatted = Libs.dateTimeFormat.format(new Date(), "yyyy-mm-dd HH:MM:ss");
// Returns: "2023-05-15 14:30:45"
```

**Parameters:**
- `date`: Date object or parsable date string
- `mask`: Format pattern (default: "ddd mmm dd yyyy HH:MM:ss")
- `utc`: Boolean to use UTC (default: false)
- `locale`: Locale code (default: 'en')

**Common Masks:**
- `"shortDate"`: "5/15/23"
- `"mediumDate"`: "May 15, 2023"
- `"longDate"`: "May 15, 2023"
- `"isoDate"`: "2023-05-15"
- `"isoDateTime"`: "2023-05-15T14:30:45"

### 2. `getCurrentDate(mask, utc, locale)`
Gets current date in specified format.

```javascript
const now = Libs.dateTimeFormat.getCurrentDate("fullDate");
// Returns: "Monday, May 15, 2023"
```

### 3. Date Arithmetic

#### `addDays(date, days)`
```javascript
const tomorrow = Libs.dateTimeFormat.addDays(new Date(), 1);
```

#### `subtractDays(date, days)`
```javascript
const yesterday = Libs.dateTimeFormat.subtractDays(new Date(), 1);
```

#### `addTime(date, {years, months, days, hours, minutes, seconds})`
```javascript
const futureDate = Libs.dateTimeFormat.addTime(new Date(), {
  days: 5,
  hours: 3
});
```

#### `subtractTime(date, {years, months, days, hours, minutes, seconds})`
```javascript
const pastDate = Libs.dateTimeFormat.subtractTime(new Date(), {
  months: 2,
  days: 10
});
```

### 4. Date Comparison & Utilities

#### `getTimeDifference(date1, date2)`
```javascript
const diff = Libs.dateTimeFormat.getTimeDifference(
  "2023-01-01", 
  "2023-02-01"
);
// Returns: {days: 31, hours: 744, ...}
```

#### `isValidDate(date)`
```javascript
const valid = Libs.dateTimeFormat.isValidDate("invalid");
// Returns: false
```

#### `getTimeZoneOffset(date)`
```javascript
const offset = Libs.dateTimeFormat.getTimeZoneOffset();
// Returns: -300 (for EST)
```

### 5. Unix Timestamp Conversion

#### `toUnixTimestamp(date)`
```javascript
const timestamp = Libs.dateTimeFormat.toUnixTimestamp(new Date());
```

#### `fromUnixTimestamp(timestamp)`
```javascript
const date = Libs.dateTimeFormat.fromUnixTimestamp(1684179045);
```

## 🎨 Formatting Tokens

| Token | Output | Example |
|-------|--------|---------|
| `yyyy` | Full year | 2023 |
| `yy` | Short year | 23 |
| `mmmm` | Full month | May |
| `mmm` | Short month | May |
| `mm` | Padded month | 05 |
| `m` | Numeric month | 5 |
| `dddd` | Full weekday | Monday |
| `ddd` | Short weekday | Mon |
| `dd` | Padded day | 05 |
| `d` | Numeric day | 5 |
| `HH` | 24-hour (padded) | 14 |
| `H` | 24-hour | 14 |
| `hh` | 12-hour (padded) | 02 |
| `h` | 12-hour | 2 |
| `MM` | Minutes (padded) | 05 |
| `M` | Minutes | 5 |
| `ss` | Seconds (padded) | 09 |
| `s` | Seconds | 9 |
| `TT` | AM/PM | PM |
| `Z` | Timezone | EST |

## 🌍 Localization Support

Currently supports English ('en') by default. Extend by adding more locales:

```javascript
// Example for Spanish (would need to be added to the library)
locales.es = {
  dayNames: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  monthNames: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
};
```

## 🚀 Practical Examples

### 1. Countdown Timer
```javascript
const eventDate = Libs.dateTimeFormat.addDays(new Date(), 7);
const now = new Date();
const diff = Libs.dateTimeFormat.getTimeDifference(now, eventDate);

Bot.sendMessage(
  `⏳ Event starts in ${diff.days} days, ${diff.hours % 24} hours!`
);
```

### 2. User-Friendly Date Display
```javascript
const userJoinDate = "2023-05-10T14:30:00Z";
const formatted = Libs.dateTimeFormat.format(
  userJoinDate, 
  "dddd, mmmm d 'at' h:MM TT", 
  true
);

Bot.sendMessage(`You joined on ${formatted}`);
// "You joined on Wednesday, May 10 at 2:30 PM"
```

### 3. Subscription Expiry Check
```javascript
const signupDate = new Date();
const expiryDate = Libs.dateTimeFormat.addTime(signupDate, {months: 1});

if (new Date() > expiryDate) {
  Bot.sendMessage("❌ Your subscription has expired!");
} else {
  const diff = Libs.dateTimeFormat.getTimeDifference(new Date(), expiryDate);
  Bot.sendMessage(`✅ Active (expires in ${diff.days} days)`);
}
```

## 💡 Pro Tips
1. Always validate dates with `isValidDate()` before operations
2. For timezone-sensitive applications, use UTC (`utc: true`)
3. Store dates in ISO format for consistency
4. Use Unix timestamps for API communications

This library makes date/time handling in your bot as easy as pie! 🥧
