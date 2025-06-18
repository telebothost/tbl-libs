# 📚 TBL Libs Documentation

A comprehensive guide to building, using, and debugging custom JavaScript libraries in the **TBL (Tele Bot Language)** system. TBL supports both synchronous and asynchronous libraries and is designed to make Telegram bot scripting powerful, modular, and safe.

---

## 🚀 What is TBL?

**TBL** is a flexible scripting framework used for creating Telegram bots. It allows defining **custom libraries** (`Libs`) which are isolated modules that can include variables, methods, and logic using standard JavaScript as well as TBL's custom scripting support.

---

## ⚙️ Key Features

- ✅ **Supports both sync & async libraries**
- ✅ Full access to Telegram Bot API via `Api`
- ✅ Errors and timeouts handled safely
- ✅ Up to 10-second execution timeout for safety
- ✅ Built-in support for TBL Language: `User`, `Bot`, `chat`, etc.

---

## 📁 File Structure

Each library must be placed in the `/Libs` directory as a `.js` file:

```
/Libs
 ├── channelChecker.js
 ├── mathUtils.js
 └── welcomeLib.js
```

---

## ✅ Correct Export Format

```js
// ✅ Correct
module.exports = {
  method1: function() {},
  method2: async function() {}
};

// ❌ Incorrect - won't be loaded
exports = { method1: () => {} };
```

---

## 🧠 TBL Language Support

TBL supports its own runtime language and built-in globals:

| Keyword      | Meaning                                 |
|--------------|------------------------------------------|
| `user`       | Current user object                      |
| `chat`       | Current chat object                      |
| `Bot`        | Bot methods like `Bot.sendMessage(...)`  |
| `Api`        | Raw Telegram Bot API methods             |
| `User`, `Global`, `bot` | Shortcuts to runtime contexts |
> And more supported!
> You can use TBL variables, methods, and native functions within your libs.

---

## 🔁 Synchronous vs Asynchronous

You can define both sync and async methods in your library:

```js
// Libs/mylib.js
module.exports = {
  syncMethod: function(a, b) {
    return a + b;
  },
  asyncMethod: async function(userId) {
    return await Api.getChat({ chat_id: userId });
  }
};
```

Usage:

```js
const sum = Libs.mylib.syncMethod(1, 2);
const chatInfo = await Libs.mylib.asyncMethod(user.id);
```

---

## ❌ Common Mistakes & Pitfalls

### 1. ❌ Forgetting `await`
```js
// ❌ WRONG
let data = Api.getChat({ chat_id: user.id });

// ✅ RIGHT
let data = await Api.getChat({ chat_id: user.id });
```

### 2. ❌ Using `.then` syntax
```js
// ❌ WRONG
Api.sendMessage({ text: "Hi" }).then(...);

// ✅ RIGHT
await Api.sendMessage({ text: "Hi" });
```

### 3. ❌ Wrong export type
```js
// ❌ WRONG
function myFunc() {}
module.exports = myFunc;

// ✅ RIGHT
module.exports = {
  myFunc: function() {}
};
```

### 4. ❌ Accessing undefined context
```js
// ❌ WRONG
return user.first_name; // might not exist

// ✅ RIGHT
module.exports = {
  getName: function(user) {
    return user?.first_name || "Guest";
  }
};
```

### 5. ❌ Not returning from async functions
```js
// ❌ WRONG
async function send() {
  let msg = await Api.sendMessage({ chat_id: 123, text: "hi" });
  // forgot to return
}

// ✅ RIGHT
async function send() {
  return await Api.sendMessage({ chat_id: 123, text: "hi" });
}
```

---

## 📌 Best Practices

### 1. Input Validation
```js
module.exports = {
  greet: function(name) {
    if (typeof name !== 'string') return "Invalid name";
    return "Hello, " + name;
  }
};
```

### 2. Error Handling
```js
module.exports = {
  safeSend: async function(chatId, text) {
    try {
      await Api.sendMessage({ chat_id: chatId, text });
    } catch (e) {
      Bot.sendMessage("Failed to send");
    }
  }
};
```

### 3. Logging & Debugging
```js
module.exports = {
  debugLog: function(data) {
    Bot.inspect(data);
  }
};
```

---

## 🧪 Example Libraries

### Sync Example

```js
// Libs/math.js
module.exports = {
  add: (a, b) => a + b,
  isEven: (n) => n % 2 === 0
};
```

Usage:
```js
let val = Libs.math.add(5, 10);  // 15
```

### Async Example

```js
// Libs/greet.js
module.exports = {
  welcome: async function(userId) {
    return await Api.sendMessage({
      chat_id: userId,
      text: "👋 Welcome!"
    });
  }
};
```

Usage:
```js
await Libs.greet.welcome(user.id);
```

---

## 🧷 Quick Access Reference

| Type        | Supported? | Notes                          |
|-------------|------------|---------------------------------|
| Async libs  | ✅         | Use `await Libs.name.method()` |
| Sync libs   | ✅         | Direct call: `Libs.name.fn()`  |
| Return Data | ✅         | Always return from async       |
| Promise     | ✅        | only on `async` function           |
| `then`/`catch` | ❌     | Not supported in TBL           |

---

## 🧩 Example Lib: Channel Membership Checker

```js
module.exports = {
  check: async function(userId, channels) {
    // ...check logic
  },
  quick: async function(userId, channels) {
    const res = await this.check(userId, channels);
    return res.all_joined;
  },
  getBtn: function(channels) {
    return channels.map(c => [{ text: `Join ${c}`, url: `https://t.me/${c.replace("@", "")}` }]);
  }
};
```

Use like:

```js
await Libs.channel.check(user.id, ['@ch1', '@ch2']);
```

---

## 🏁 Conclusion

TBL Libs are powerful, modular, and safe. Whether you're building a sync math helper or an async membership checker, follow the rules and format strictly.

If you hit errors:
- ✅ Check your `module.exports`
- ✅ Use `await` properly
- ✅ Avoid chaining with `.then`

Happy bot building! 🤖

---

### 🤝 Contribute to TBL Libs

We welcome contributions to the **TBL Libs** collection!

If you’ve built a useful utility or helper library for Telegram bot development using TBL (Telegram Bot Language), you can share it with the community.

#### 📌 How to Contribute

1. **Create Your Library**
   - Write your lib in a new `.js` file under `/Libs/`
   - Export your functions properly via `module.exports = { ... }`

2. **Follow the Rules**
   - One file per library
   - No external dependencies—use only TBL APIs and JavaScript
   - Name the file and methods clearly
   - Add brief inline comments if needed

3. **Test Before Push**
   - Ensure your lib loads and works using `Libs.myLib.method()`
   - Async methods must be used with `await`

4. **Submit a Pull Request**
   - Fork the repository
   - Add your `.js` file under `/Libs`
   - Submit a **Pull Request** with:
     - A clear description
     - Library purpose
     - Optional usage notes

---

✨ Let’s grow the TBL ecosystem together!  
Submit your PRs and help other developers build faster.
