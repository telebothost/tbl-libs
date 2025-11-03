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

  getUserLang: function(userId) {
    return User.getProperty('user_lang') || 'en';
  },

  setUserLang: function(userId, langCode) {
    if (this.languages[langCode]) {
      User.setProperty('user_lang', langCode);
      return true;
    }
    return false;
  },

  autoTranslate: async function(text, targetLang) {
    if (!text) return text;
    
    const userLang = targetLang || this.getUserLang(user?.id);
    if (userLang === 'en') return text;
    
    try {
      let translated = await this._myMemoryTranslate(text, userLang);
      if (translated && translated !== text) return translated;
      
      translated = await this._libreTranslate(text, userLang);
      if (translated && translated !== text) return translated;
      
      return text;
    } catch (error) {
      return text;
    }
  },

  _myMemoryTranslate: async function(text, targetLang) {
    try {
      const response = await HTTP.get({
        url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
        timeout: 10000
      });
      
      if (response.ok && response.data && response.data.responseData && response.data.responseData.translatedText) {
        return response.data.responseData.translatedText;
      }
    } catch (e) {
    }
    return null;
  },
//Fllb ack to libretranslate if ab;ove fails
  _libreTranslate: async function(text, targetLang) {
    try {
      const response = await HTTP.post({
        url: 'https://libretranslate.com/translate',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text'
        }),
        timeout: 10000
      });
      
      if (response.ok && response.data && response.data.translatedText) {
        return response.data.translatedText;
      }
    } catch (e) {
    }
    return null;
  },

  getSupportedLanguages: function() {
    return this.languages;
  },

  detectLanguage: async function(text) {
    try {
      const response = await HTTP.post({
        url: 'https://libretranslate.com/detect',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text
        })
      });
      
      if (response.ok && response.data && response.data[0]) {
        return response.data[0].language;
      }
    } catch (e) {
    }
    return 'en';
  }
};

module.exports = TranslateLib;
