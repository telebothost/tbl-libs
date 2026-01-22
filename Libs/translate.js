const TranslateLib = {
  languages: {
    'en': 'English',
    'hi': 'Hindi',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic'
  },

  _getUsage: function() {
    const today = new Date().toDateString();
    let usage = Bot.getProperty('translate_daily_usage') || { date: today, words: 0 };
    if (usage.date !== today) {
      usage = { date: today, words: 0 };
      Bot.setProperty('translate_daily_usage', usage, 'json');
    }
    return usage;
  },

  _updateUsage: function(textLength) {
    const usage = this._getUsage();
    usage.words += textLength;
    Bot.setProperty('translate_daily_usage', usage, 'json');
    return usage.words;
  },

  getUsageInfo: function() {
    const usage = this._getUsage();
    return {
      wordsUsed: usage.words,
      wordsRemaining: Math.max(0, 1000 - usage.words),
      limit: 1000,
      resetDate: usage.date
    };
  },

  getUserLang: function(userId) {
    return User.getProperty('user_lang') || 'en';
  },

  setUserLang: function(userId, langCode) {
    if (!this.languages[langCode]) {
      throw new Error(`Unsupported language code: ${langCode}`);
    }
    User.setProperty('user_lang', langCode);
    return true;
  },

autoTranslate: async function(text, targetLang) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  if (text.length > 500) {
    throw new Error('Text too long for translation (max 500 characters)');
  }

  const wordCount = text.split(' ').length;
  const usage = this._getUsage();
  const userLang = targetLang || this.getUserLang(user?.id);
  
  if (userLang === 'en') return text;

  try {
    if (usage.words + wordCount <= 1000) {
      let translated = await this._myMemoryTranslate(text, userLang);
      if (translated && translated !== text) {
        this._updateUsage(wordCount);
        return translated;
      }
    }
    let translated = await this._simpleGoogleTranslate(text, userLang);
    if (translated && translated !== text) {
      return translated;
    }
    translated = await this._lingvaTranslate(text, userLang);
    if (translated && translated !== text) {
      return translated;
    }
    
    throw new Error('Translation failed - all services unavailable');
  } catch (error) {
    throw new Error(`Translation error: ${error.message}`);
  }
},

  _myMemoryTranslate: async function(text, targetLang) {
    try {
      const response = await HTTP.get({
        url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`MyMemory API error: ${response.status}`);
      }
      
      if (response.data && response.data.responseData && response.data.responseData.translatedText) {
        return response.data.responseData.translatedText;
      }
      
      throw new Error('MyMemory returned invalid response format');
    } catch (error) {
      throw new Error(`MyMemory translation failed: ${error.message}`);
    }
  },

_simpleGoogleTranslate: async function(text, targetLang) {
  try {
    const response = await HTTP.get({
      url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
      timeout: 10000
    });
    
    if (response.ok && response.data && response.data[0]) {
      return response.data[0].map(item => item[0]).join('');
    }
    throw new Error('Invalid response format');
  } catch (error) {
    throw new Error(`Google Translate failed: ${error.message}`);
  }
},

_lingvaTranslate: async function(text, targetLang) {
  try {
    const response = await HTTP.get({
      url: `https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`,
      timeout: 10000
    });
    
    if (response.ok && response.data && response.data.translation) {
      return response.data.translation;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    throw new Error(`Lingva Translate failed: ${error.message}`);
  }
},

  getSupportedLanguages: function() {
    return this.languages;
  },
  
  resetUsage: function() {
    const today = new Date().toDateString();
    Bot.setProperty('translate_daily_usage', { date: today, words: 0 }, 'json');
    return true;
  }
};

module.exports = TranslateLib;
