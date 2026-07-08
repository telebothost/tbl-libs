# random

Comprehensive random value generation — numbers, strings, collections, distributions, and test data.

**File:** `Libs/random.js` · **Access:** `Libs.random.*` · **Sync** — no `await` · v1.0.0

---

## What problem does it solve?

Bots use randomness everywhere:

- Dice rolls, loot drops, gacha pulls
- Giveaway winners
- OTP codes and session tokens
- Fake test data for demos

`random` wraps `Math.random()` with 30+ typed helpers. **Not cryptographically secure** — use `modules.crypto` for security-sensitive tokens.

---

## Quick start

```js
let roll = Libs.random.randomInt(1, 6)
Bot.sendMessage("You rolled: " + roll)

let prize = Libs.random.randomChoice(["gold", "silver", "bronze"])
let pin = Libs.random.randomString(6, { charset: "numeric" })
```

---

## Numbers

| Method | Parameters | Returns | Description |
| --- | --- | --- | --- |
| `randomInt(min, max, inclusive?)` | min, max, inclusive=true | `number` | Integer in range |
| `randomFloat(min, max, precision?)` | min, max, precision | `number` | Float in range |
| `randomBoolean(probability?)` | 0–1, default 0.5 | `boolean` | Weighted true/false |
| `randomRange(min, max, step?)` | min, max, step | `number` | Stepped range |
| `randomUniqueInts(min, max, count, sorted?)` | range, count | `number[]` | Unique integers |

```js
Libs.random.randomInt(1, 6)                    // dice: 1–6
Libs.random.randomFloat(0, 1, 2)               // 0.47
Libs.random.randomBoolean(0.3)                 // 30% chance true
Libs.random.randomUniqueInts(1, 50, 6, true)   // lottery picks, sorted
```

---

## Collections

| Method | Parameters | Returns |
| --- | --- | --- |
| `randomChoice(arr, count?, unique?)` | array, count=1, unique=false | element or array |
| `randomShuffle(arr, inPlace?)` | array, mutate? | shuffled array |
| `randomWeighted(items, weights, normalize?)` | items, weights | one item |
| `randomSample(arr, n, weights?)` | array, n, weights? | sample array |
| `randomFromObject(obj, deep?)` | object, deep=false | random value |
| `randomWeightedValue(weights)` | weight object | key by weight |

```js
let hand = Libs.random.randomChoice(["A","K","Q","J","10"], 5, true)
let winner = Libs.random.randomWeighted(["A","B","C"], [1, 3, 10])
let shuffled = Libs.random.randomShuffle([1,2,3,4,5])
```

---

## Strings and tokens

| Method | Parameters | Returns |
| --- | --- | --- |
| `randomString(length?, options?)` | length=10, charset opts | `string` |
| `randomPassword(length?, options?)` | length, char counts | `string` |
| `randomToken(length?)` | hex length=32 | `string` |
| `randomUuid(version?)` | 4 or 1 | `string` |

### `charset` for `randomString`

| Value | Characters |
| --- | --- |
| `alphanumeric` | A–Z, a–z, 0–9 (default) |
| `alpha` | Letters only |
| `numeric` | 0–9 |
| `hex` | 0–9, a–f |
| `symbols` | `!@#$%^&*()_+-=[]{}|;:,.<>?` |
| custom | `{ custom: "ABC123" }` |

```js
Libs.random.randomString(6, { charset: "numeric" })     // "482910"
Libs.random.randomToken(32)                              // hex token
Libs.random.randomUuid()                                 // v4 UUID
Libs.random.randomPassword(16, { upper: 3, lower: 3, numbers: 4, special: 2 })
```

---

## Colors

`randomColor(type?, alpha?)` — types: `hex` (default), `rgb`, `hsl`.

```js
Libs.random.randomColor()              // "#a3f5c2"
Libs.random.randomColor("rgb")         // "rgb(120, 45, 200)"
Libs.random.randomColor("rgb", true)   // "rgba(120, 45, 200, 0.73)"
```

---

## Dates

`randomDate(startDate, endDate, format?)` — returns `Date`, or locale string if `format` provided.

```js
let day = Libs.random.randomDate(new Date(2024, 0, 1), new Date())
```

---

## Network and geo

| Method | Returns |
| --- | --- |
| `randomIp(version?)` | IPv4 or IPv6 string |
| `randomGeoPoint(latRange?, lonRange?, precision?)` | `{ latitude, longitude }` |
| `randomEmail(domains?)` | email string |
| `randomPhone(format?)` | phone string |
| `randomName(gender?)` | `"male"`, `"female"`, or `"any"` |
| `randomAddress()` | `{ street, city, state, zipCode }` |

```js
Libs.random.randomIp(4)       // "192.168.1.42"
Libs.random.randomEmail(["company.com"])
Libs.random.randomName("female")
```

---

## Statistical distributions

| Method | Description |
| --- | --- |
| `randomNormal(mean?, stdDev?, truncate?)` | Gaussian |
| `randomExponential(lambda?)` | Exponential |
| `randomBinomial(n, p)` | Binomial count |
| `randomNoise(length, amplitude?, frequency?)` | Sine noise array |

```js
let sample = Libs.random.randomNormal(0, 1, [-3, 3])
let failures = Libs.random.randomBinomial(10, 0.3)
```

---

## Matrices and sequences

| Method | Returns |
| --- | --- |
| `randomMatrix(rows, cols, generator?, args?)` | 2D array |
| `randomSequence(length, generator?, args?)` | array |
| `randomPermutation(n)` | shuffled index array |
| `randomLorem(words?)` | lorem ipsum string |
| `randomCreditCard(prefix?)` | valid Luhn card number |
| `randomBytes(length)` | byte array |

```js
let grid = Libs.random.randomMatrix(3, 3, Libs.random.randomInt, [1, 9])
let digits = Libs.random.randomSequence(6, Libs.random.randomInt, [0, 9])
```

---

## Full example — dice game

```js
// /roll command
let d1 = Libs.random.randomInt(1, 6)
let d2 = Libs.random.randomInt(1, 6)
let total = d1 + d2

let msg = "You rolled " + d1 + " + " + d2 + " = " + total

if (d1 === d2) {
  msg += "\nDoubles! Bonus roll: " + Libs.random.randomInt(1, 6)
}

Bot.sendMessage(msg)
```

---

## Full example — weighted loot table

```js
let loot = Libs.random.randomWeighted(
  ["common", "rare", "epic", "legendary"],
  [70, 20, 8, 2]
)

let amounts = { common: 10, rare: 50, epic: 200, legendary: 1000 }
let gold = amounts[loot]

await Libs.ResourcesLibv2.userRes("gold").add(gold)
Bot.sendMessage("You found " + loot + " loot: +" + gold + " gold!")
```

---

## Full example — giveaway winner

```js
let entrants = [111, 222, 333, 444, 555]  // user IDs
let winner = Libs.random.randomChoice(entrants)

Bot.sendMessage("Winner: user " + winner + "!")
```

---

## Notes

- Uses `Math.random()` — fine for games; **not** for passwords/secrets at scale.
- Methods capped at Libs **2-second timeout** (only matters for heavy custom generators).
- `randomPassword` enforces minimum character class counts then shuffles.
