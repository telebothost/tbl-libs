# TranslateLib - Multi-Language Translation for TBL

A powerful translation library that makes your Telegram bot speak every language! Automatically translates messages using free, reliable translation APIs.

## 🌟 Features

- **12 Supported Languages** - Covering major global languages
- **Dual API Fallback** - MyMemory + LibreTranslate for maximum reliability  
- **User Preferences** - Remember each user's language choice
- **Auto-Detection** - Detect text language automatically
- **Free & No API Keys** - Uses free translation services
- **Error Resilient** - Graceful fallback if APIs fail

## 📊 API Limits & Pricing

### MyMemory Translation
- **Free Limit**: 1,000 words/day per IP address
- **No registration required**
- **Reliable for small to medium bots**

### LibreTranslate
- **Free Limit**: No hard limits (community-funded)
- **Rate limiting**: ~10 requests/minute
- **Best for fallback usage**

### Recommended Usage
- Perfect for bots with 100-500 daily users
- Suitable for message translation, not bulk content
- Automatic failover ensures service continuity

## 🚀 Quick Start

```javascript
// Translate text to user's preferred language
const translated = await Libs.TranslateLib.autoTranslate("Hello World!");

// Set user language to Spanish
Libs.TranslateLib.setUserLang(user.id, 'es');

// Get user's current language
const userLang = Libs.TranslateLib.getUserLang(user.id);
```

## 📋 Core Methods

### `autoTranslate(text, targetLang)`
Automatically translates text to target language or user's preferred language.

```javascript
// Translate to user's language
const message = await Libs.TranslateLib.autoTranslate("Welcome to our bot!");

// Translate to specific language  
const spanishText = await Libs.TranslateLib.autoTranslate("Hello", 'es');

// If translation fails, returns original text
const safeText = await Libs.TranslateLib.autoTranslate("Some text");
```

### `setUserLang(userId, langCode)`
Sets user's preferred language.

```javascript
// Set to French
Libs.TranslateLib.setUserLang(user.id, 'fr');

// Set to Hindi
Libs.TranslateLib.setUserLang(user.id, 'hi');

// Returns false if invalid language code
const success = Libs.TranslateLib.setUserLang(user.id, 'invalid');
```

### `getUserLang(userId)`
Gets user's current language preference.

```javascript
const lang = Libs.TranslateLib.getUserLang(user.id);
// Returns: 'en', 'es', 'fr', etc. (defaults to 'en')
```

### `getSupportedLanguages()`
Returns all available languages.

```javascript
const languages = Libs.TranslateLib.getSupportedLanguages();
// Returns: {en: 'English', es: 'Spanish', fr: 'French', ...}
```

### `detectLanguage(text)`
Detects the language of given text.

```javascript
const detectedLang = await Libs.TranslateLib.detectLanguage("Hola mundo");
// Returns: 'es'

const englishLang = await Libs.TranslateLib.detectLanguage("Hello world");
// Returns: 'en'
```

## 🌍 Supported Languages

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| hi | Hindi | हिन्दी |
| es | Spanish | Español |
| fr | French | Français |
| de | German | Deutsch |
| it | Italian | Italiano |
| pt | Portuguese | Português |
| ru | Russian | Русский |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| zh | Chinese | 中文 |
| ar | Arabic | العربية |

## 💡 Complete Example

### Multi-language Welcome Bot

**Command: /start**
```javascript
const userLang = Libs.TranslateLib.getUserLang(user.id);

const welcomeMsg = `Welcome to our bot! 🌍

✨ Features:
• Multi-language support
• Easy to use interface  
• Free forever

Use /setlang to change your language.`;

const translatedMsg = await Libs.TranslateLib.autoTranslate(welcomeMsg);

Bot.sendMessage(translatedMsg, {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🌐 Change Language", callback_data: "change_lang" }]
    ]
  }
});
```

**Command: /setlang**
```javascript
const languages = Libs.TranslateLib.getSupportedLanguages();
const currentLang = Libs.TranslateLib.getUserLang(user.id);

let keyboard = [];
Object.keys(languages).forEach(langCode => {
  const isCurrent = langCode === currentLang;
  keyboard.push([{
    text: `${languages[langCode]} ${isCurrent ? '✅' : ''}`,
    callback_data: `set_lang_${langCode}`
  }]);
});

Bot.sendMessage("Select your preferred language:", {
  reply_markup: { inline_keyboard: keyboard }
});
```

**Command: ***
```javascript
if (update.callback_query?.data?.startsWith('set_lang_')) {
  const langCode = update.callback_query.data.replace('set_lang_', '');
  
  if (Libs.TranslateLib.setUserLang(user.id, langCode)) {
    const successMsg = await Libs.TranslateLib.autoTranslate(
      "Language changed successfully!", 
      langCode
    );
    
    Api.answerCallbackQuery({
      callback_query_id: update.callback_query.id,
      text: "Language updated!"
    });
    
    Bot.sendMessage(successMsg);
    
    // Restart with new language
    Bot.runCommand("/start");
  }
}
```

## 🛠️ Best Practices

### 1. Initialize New Users
```javascript
// Set default language for new users
if (!User.getProperty('user_lang')) {
  Libs.TranslateLib.setUserLang(user.id, 'en');
}
```

### 2. Handle Translation Errors
```javascript
try {
  const translated = await Libs.TranslateLib.autoTranslate(userMessage);
  Bot.sendMessage(translated);
} catch (error) {
  // Fallback to English
  Bot.sendMessage(userMessage);
}
```

### 3. Cache Common Phrases
```javascript
// Store translated versions of common messages
const commonMessages = {
  welcome: await Libs.TranslateLib.autoTranslate("Welcome!"),
  help: await Libs.TranslateLib.autoTranslate("Need help?"),
  error: await Libs.TranslateLib.autoTranslate("Something went wrong")
};
```

### 4. Respect API Limits
```javascript
// Don't translate very long texts
if (text.length > 500) {
  Bot.sendMessage("Text too long for translation");
  return;
}
```

## 🔧 API Backends

### Primary: MyMemory Translation
- **URL**: `https://api.mymemory.translated.net/`
- **Best for**: General text translation
- **Limits**: 1,000 words/day per IP

### Fallback: LibreTranslate  
- **URL**: `https://libretranslate.com/`
- **Best for**: Backup when MyMemory is busy
- **Limits**: Gentle rate limiting

## ⚠️ Error Handling

The library automatically handles:
- **API timeouts** (10-second timeout)
- **Network failures** (automatic fallback)
- **Invalid languages** (returns original text)
- **Rate limits** (waits and retries)

```javascript
// Always safe to use - returns original text on failure
const safeTranslation = await Libs.TranslateLib.autoTranslate("Any text");
```

## 🎯 Common Use Cases

### Multi-language Support
```javascript
// All bot messages auto-translated
const responses = {
  welcome: await Libs.TranslateLib.autoTranslate("Welcome to our service!"),
  help: await Libs.TranslateLib.autoTranslate("How can I help you today?"),
  goodbye: await Libs.TranslateLib.autoTranslate("Thank you for visiting!")
};
```

### Dynamic Language Switching
```javascript
// User changes language in settings
Libs.TranslateLib.setUserLang(user.id, 'ja');
// All future messages will be in Japanese
```

### Content Localization
```javascript
// Localize dynamic content
const userContent = {
  news: await Libs.TranslateLib.autoTranslate("Breaking news update"),
  promo: await Libs.TranslateLib.autoTranslate("Special offer available"),
  update: await Libs.TranslateLib.autoTranslate("System maintenance notice")
};
```

## 📈 Performance Tips

1. **Batch translations** for multiple messages
2. **Cache results** for repeated phrases  
3. **Set reasonable timeouts** (already handled)
4. **Monitor usage** to stay within free limits
5. **Use for user-facing messages**, not internal logic


## 🤝 Note
- This documentation is generated with AI assistance. You may find inconsistencies.
- Need help? Contact [FlashComAssistant](https://t.me/FlashComAssistant) I will guide you through any issues!

Thank you for your understanding! 🙏
