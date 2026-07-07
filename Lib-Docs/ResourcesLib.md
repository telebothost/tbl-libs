# ResourcesLib (Legacy)

**Deprecated.** Sync library using `Bot.getProperty`. Use **`Libs.ResourcesLibv2`** with `db.bot` instead.

```js
// Deprecated
let gold = Libs.ResourcesLib.userRes("gold")
gold.add(10)

// Use instead
let gold = Libs.ResourcesLibv2.userRes("gold")
await gold.add(10)
```

See [ResourcesLibv2.md](ResourcesLibv2.md) for the current API.
