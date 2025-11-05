# TranslateLib - Multi-Language Translation for TBL

A powerful translation library for creating multilingual Telegram bots! Translates **any text content** into 12 languages based on user preferences, using free translation APIs with built-in error handling and usage limits.

## 🌟 Features

- **12 Supported Languages** - Supports 12 languages
- **Triple API Fallback** - MyMemory, Google Translate, Lingva Translate for maximum reliability  
- **User Preferences** - Remember each user's language choice
- **Free & No API Keys** - Uses free translation services
- **Error Handling** - Proper error throwing with clear messages
- **Rate Limiting** - Prevents hitting API limits with daily word tracking
- **Usage Monitoring** - Real-time translation statistics

## 📊 API Limits

### MyMemory Translation
- **Free Limit**: 1,000 words/day per IP address

### Google Translate (Unofficial)
- **Free Limit**: No hard limits (unofficial endpoint)
- **Rate limiting**: Gentle limits to avoid blocking
- **Best for fallback usage**

### Lingva Translate
- **Free Limit**: No limits (open source alternative)
- **Rate limiting**: Community-funded service
- **Excellent backup option**

### Library Protection
- **Daily Limit**: 1,000 words tracked automatically (MyMemory only)
- **Text Length Limit**: 500 characters max per request
- **Usage Monitoring**: Real-time word count tracking

## 🚀 Quick Start

```javascript
// Translate text to user's preferred language
const translated = await Libs.TranslateLib.autoTranslate("Hello World!");

// Set user language to Spanish
Libs.TranslateLib.setUserLang(user.id, 'es');

// Get user's current language
const userLang = Libs.TranslateLib.getUserLang(user.id);

// Check current usage
const usage = Libs.TranslateLib.getUsageInfo();
```

## 📋 Core Methods

### `autoTranslate(text, targetLang)`
Automatically translates text to target language or user's preferred language using triple API fallback.

```javascript
// Translate to user's language
const message = await Libs.TranslateLib.autoTranslate("Welcome to our bot!");

// Translate to specific language  
const spanishText = await Libs.TranslateLib.autoTranslate("Hello", 'es');

// Handle translation errors
try {
  const translated = await Libs.TranslateLib.autoTranslate("Some text");
} catch (error) {
  Bot.sendMessage("Translation failed: " + error.message);
}
```

### `setUserLang(userId, langCode)`
Sets user's preferred language.

```javascript
// Set to French
Libs.TranslateLib.setUserLang(user.id, 'fr');

// Set to Hindi
Libs.TranslateLib.setUserLang(user.id, 'hi');

// Throws error for invalid language code
try {
  Libs.TranslateLib.setUserLang(user.id, 'invalid');
} catch (error) {
  Bot.sendMessage(error.message);
}
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

### `getUsageInfo()`
Gets current translation usage statistics.

```javascript
const usage = Libs.TranslateLib.getUsageInfo();
// Returns: {wordsUsed: 150, wordsRemaining: 850, limit: 1000, resetDate: 'Mon Dec 11 2023'}
```

### `resetUsage()`
Resets the daily usage counter.

```javascript
Libs.TranslateLib.resetUsage();
// Resets word count to 0 for current day
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

### Multi-language Welcome Bot Sample

**Command: /start**
```javascript
const userLang = TranslateLib.getUserLang(user.id);
const currentLangName = TranslateLib.languages[userLang];

const welcomeText = `Hey man! your current lanf is ${currentLangName}. Use button below to change language. This iS is test`;

let translatedText;
try {
  translatedText = await TranslateLib.autoTranslate(welcomeText);
} catch (error) {
  translatedText = welcomeText;
}

Bot.sendMessage(translatedText, {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Change Language", callback_data: "/setlang" }]
    ]
  }
});
```

**Command: /setlang**
```javascript
const languages = TranslateLib.getSupportedLanguages();
const currentLang = TranslateLib.getUserLang(user.id);

let keyboard = [];
Object.keys(languages).forEach(langCode => {
  const isCurrent = langCode === currentLang;
  keyboard.push([{
    text: `${languages[langCode]} ${isCurrent ? '✅' : ''}`,
    callback_data: `/setthelang ${langCode}`
  }]);
});

const message = `Please select your language:\nCurrent: ${languages[currentLang]}`;

Bot.sendMessage(message, {
  reply_markup: {
    inline_keyboard: keyboard
  }
});
```

**Command: /setthelang**
```javascript
if (params) {
  const langCode = params.trim();
  
  try {
    TranslateLib.setUserLang(user.id, langCode);
    Bot.sendMessage(`Language changed to ${TranslateLib.languages[langCode]}! Use /welcome to see translatidon.`);
  } catch (error) {
    Bot.sendMessage(`Error: ${error.message}`);
  }
  return;
}
const languages = TranslateLib.getSupportedLanguages();
const currentLang = TranslateLib.getUserLang(user.id);

let keyboard = [];
Object.keys(languages).forEach(langCode => {
  const isCurrent = langCode === currentLang;
  keyboard.push([{
    text: `${languages[langCode]} ${isCurrent ? '✅' : ''}`,
    callback_data: `/setlang ${langCode}`
  }]);
});

Bot.sendMessage(`Select language (Current: ${languages[currentLang]}):`, {
  reply_markup: { inline_keyboard: keyboard }
});
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
  Bot.sendMessage(`Translation failed: ${error.message}`);
  Bot.sendMessage(userMessage); // Fallback to original
}
```

### 3. Cache Common Phrases
```javascript
// Pre-translate common messages to avoid repeated API calls
let cachedMessages = {};

async function initializeCachedMessages() {
  try {
    cachedMessages = {
      welcome: await Libs.TranslateLib.autoTranslate("Welcome to our bot!"),
      help: await Libs.TranslateLib.autoTranslate("How can I help you?"),
      error: await Libs.TranslateLib.autoTranslate("Something went wrong"),
      goodbye: await Libs.TranslateLib.autoTranslate("Thank you for using our bot!")
    };
  } catch (error) {
    // Fallback to English if translation fails
    cachedMessages = {
      welcome: "Welcome to our bot!",
      help: "How can I help you?",
      error: "Something went wrong",
      goodbye: "Thank you for using our bot!"
    };
  }
}

// Call this once when bot starts
initializeCachedMessages();

// Now use cached messages throughout your bot
Bot.sendMessage(cachedMessages.welcome);
Bot.sendMessage(cachedMessages.help);
```

### 4. Monitor Usage
```javascript
// Check usage before translating
const usage = Libs.TranslateLib.getUsageInfo();
if (usage.wordsRemaining < 100) {
  Bot.sendMessage(`Translation limit warning: ${usage.wordsRemaining} words remaining`);
}

// Show usage statistics to admin
if (user.id === ADMIN_ID) {
  const usage = Libs.TranslateLib.getUsageInfo();
  Bot.sendMessage(`📊 Translation Usage Today:
Words Used: ${usage.wordsUsed}
Words Remaining: ${usage.wordsRemaining}
Daily Limit: ${usage.limit}
Reset: ${usage.resetDate}`);
}
```

## 🔧 API Backends

### Primary: MyMemory Translation
- **URL**: `https://api.mymemory.translated.net/`
- **Best for**: General text translation
- **Limits**: 1,000 words/day per IP

### Fallback 1: Google Translate  
- **URL**: `https://translate.googleapis.com/`
- **Best for**: Reliable fallback when MyMemory limit reached
- **Limits**: Unofficial but stable

### Fallback 2: Lingva Translate
- **URL**: `https://lingva.ml/`
- **Best for**: Open source backup option
- **Limits**: Community-funded, no hard limits

## ⚠️ Error Handling

The library throws clear errors for:
- **Invalid input** - Empty text, wrong data types
- **API failures** - Network errors, service unavailable
- **Rate limits** - Daily word limit exceeded (MyMemory only)
- **Text too long** - Over 500 characters
- **Unsupported languages** - Invalid language codes

```javascript
try {
  const translated = await Libs.TranslateLib.autoTranslate("Hello world");
} catch (error) {
  // Handle specific error types
  if (error.message.includes('limit reached')) {
    Bot.sendMessage("MyMemory translation limit reached, using fallback services");
  } else if (error.message.includes('Text too long')) {
    Bot.sendMessage("Please shorten your message for translation");
  } else {
    Bot.sendMessage("Translation failed: " + error.message);
  }
}
```

## 📈 Performance Tips

1. **Cache Common Phrases** - Pre-translate frequent messages during bot initialization
2. **Monitor Usage** - Check `getUsageInfo()` regularly and inform users
3. **Batch Operations** - Group short translations when possible
4. **Error Boundaries** - Always wrap translation calls in try-catch blocks
5. **User Education** - Inform users about translation limits and capabilities

## 🎯 Common Use Cases

### Multi-language Support with Caching
```javascript
// Pre-translate all common responses
let responseCache = {};

async function initializeResponseCache() {
  const phrases = {
    welcome: "Welcome to our multi-language bot!",
    help: "I can help you with translations and more.",
    features: "Features: Translation, Language detection, User preferences",
    contact: "Contact us for support in your preferred language"
  };

  for (const [key, englishText] of Object.entries(phrases)) {
    responseCache[key] = {};
    const languages = Libs.TranslateLib.getSupportedLanguages();
    
    for (const langCode of Object.keys(languages)) {
      try {
        responseCache[key][langCode] = await Libs.TranslateLib.autoTranslate(englishText, langCode);
      } catch (error) {
        responseCache[key][langCode] = englishText; // Fallback to English
      }
    }
  }
}

// Get cached response for user's language
function getResponse(userId, messageKey) {
  const userLang = Libs.TranslateLib.getUserLang(userId);
  return responseCache[messageKey]?.[userLang] || messageKey;
}

// Usage in commands
Bot.sendMessage(getResponse(user.id, "welcome"));
Bot.sendMessage(getResponse(user.id, "features"));
```

### Usage Monitoring Dashboard
```javascript
// Command: /usage
const usage = Libs.TranslateLib.getUsageInfo();
const message = `📊 Translation Usage:
Words Used: ${usage.wordsUsed}
Words Remaining: ${usage.wordsRemaining}
Daily Limit: ${usage.limit}
Reset Date: ${usage.resetDate}`;

Bot.sendMessage(message);
```

## 🔒 Rate Limiting Protection

The library includes built-in protection:
- **Daily word tracking** - Prevents exceeding 1,000 words/day (MyMemory only)
- **Automatic reset** - Daily counter reset at midnight
- **Usage monitoring** - Real-time usage statistics
- **Graceful degradation** - Falls back to other services when limits reached
- **Multiple fallbacks** - Two additional free APIs ensure service continuity

```javascript
// Example of proper error handling with caching
async function getTranslatedMessage(text, userId) {
  const userLang = Libs.TranslateLib.getUserLang(userId);
  const cacheKey = `${userLang}_${text}`;
  
  // Check cache first
  if (cachedTranslations[cacheKey]) {
    return cachedTranslations[cacheKey];
  }
  
  // If not cached, translate with error handling
  try {
    const translated = await Libs.TranslateLib.autoTranslate(text, userLang);
    cachedTranslations[cacheKey] = translated; // Cache the result
    return translated;
  } catch (error) {
    if (error.message.includes('limit reached')) {
      const usage = Libs.TranslateLib.getUsageInfo();
      Bot.sendMessage(`MyMemory limit reached. ${usage.wordsRemaining} words remaining today. Using fallback services.`);
    }
    return text; // Return original text as fallback
  }
}

// Usage
const welcomeMessage = await getTranslatedMessage("Welcome to our service!", user.id);
Bot.sendMessage(welcomeMessage);
```

## 🤝 Note
- This documentation is generated with AI assistance. You may find inconsistencies.
- Need help? Contact [FlashComAssistant](https://t.me/FlashComAssistant) I will guide you through any issues!

Thank you for your understanding! 🙏
