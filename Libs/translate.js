/**
 * High-performance translation library for TBL runtime
 * @module translate
 */

const PROVIDERS = ['google', 'mymemory', 'lingva', 'libre'];

const TranslateLib = {
  languages: {
    en: 'English',
    hi: 'Hindi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    bn: 'Bengali',
    tr: 'Turkish',
    vi: 'Vietnamese',
    id: 'Indonesian',
    uk: 'Ukrainian',
    pl: 'Polish',
    nl: 'Dutch',
    th: 'Thai'
  },

  _usageKey: 'translate_daily_usage',
  _langKey: 'user_lang',

  _config: {
    dailyLimit: 1000,
    maxLength: 500,
    defaultLang: 'en',
    timeout: 10000,
    providers: PROVIDERS
  },

  _session: {
    usage: null,
    langs: {}
  },

  /**
   * Override limits and provider order
   * @param {Object} options
   */
  configure(options = {}) {
    Object.assign(this._config, options);
    if (options.providers) {
      this._config.providers = options.providers;
    }
  },

  _today() {
    return new Date().toDateString();
  },

  _wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  },

  _scope(userId) {
    return userId ? { user_id: userId } : {};
  },

  _normalizeLang(code) {
    if (!code || typeof code !== 'string') return this._config.defaultLang;
    return code.toLowerCase().trim();
  },

  isSupported(langCode) {
    return !!this.languages[this._normalizeLang(langCode)];
  },

  langName(langCode) {
    return this.languages[this._normalizeLang(langCode)] || langCode;
  },

  getSupportedLanguages() {
    return this.languages;
  },

  /** Sorted list for menus: [{ code, name }] */
  listLanguages() {
    return Object.keys(this.languages)
      .map(code => ({ code, name: this.languages[code] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async _getUsage() {
    const today = this._today();
    if (this._session.usage && this._session.usage.date === today) {
      return this._session.usage;
    }

    let usage = await db.bot.get(this._usageKey, { date: today, words: 0 });
    if (!usage || usage.date !== today) {
      usage = { date: today, words: 0 };
      await this._dbSet(this._usageKey, usage);
    }

    this._session.usage = usage;
    return usage;
  },

  async _addUsage(words, provider) {
    if (provider !== 'mymemory') return;
    const usage = await this._getUsage();
    usage.words += words;
    this._session.usage = usage;
    await this._dbSet(this._usageKey, usage);
    return usage.words;
  },

  async getUsageInfo() {
    const usage = await this._getUsage();
    const limit = this._config.dailyLimit;
    return {
      wordsUsed: usage.words,
      wordsRemaining: Math.max(0, limit - usage.words),
      limit: limit,
      resetDate: usage.date,
      percentUsed: Math.min(100, Math.round((usage.words / limit) * 100))
    };
  },

  async canTranslate(text) {
    const words = this._wordCount(String(text || ''));
    const usage = await this._getUsage();
    return {
      ok: words > 0 && words + usage.words <= this._config.dailyLimit,
      words: words,
      remaining: Math.max(0, this._config.dailyLimit - usage.words)
    };
  },

  async resetUsage() {
    const today = this._today();
    const usage = { date: today, words: 0 };
    this._session.usage = usage;
    await this._dbSet(this._usageKey, usage);
    return true;
  },

  async getUserLang(userId) {
    const id = userId || (user && user.id);
    if (id && this._session.langs[id]) return this._session.langs[id];

    const lang = await db.user.get(
      this._langKey,
      this._config.defaultLang,
      this._scope(userId)
    );

    const normalized = this._normalizeLang(lang);
    if (id) this._session.langs[id] = normalized;
    return normalized;
  },

  async setUserLang(userId, langCode) {
    const code = this._normalizeLang(langCode);
    if (!this.isSupported(code)) {
      throw new Error(`Unsupported language code: ${langCode}`);
    }

    const id = userId || (user && user.id);
    await this._dbSet(this._langKey, code, 'user', this._scope(userId));
    if (id) this._session.langs[id] = code;
    return code;
  },

  /**
   * Translate text — main API
   * @param {string} text
   * @param {Object|string} [options] - target lang code or options object
   * @param {string} [options.to] - target language
   * @param {string} [options.from] - source language ('auto' default)
   * @param {number} [options.userId] - user for lang preference
   * @param {string} [options.fallback] - return this if all providers fail
   * @param {boolean} [options.silent] - return fallback instead of throwing
   * @returns {Promise<string>}
   */
  async translate(text, options) {
    const result = await this.tryTranslate(text, options);
    if (result.ok) return result.text;
    if (result.fallback !== undefined) return result.fallback;
    if (typeof options === 'object' && options && options.fallback !== undefined) {
      return options.fallback;
    }
    if (typeof options === 'object' && options && options.silent) {
      return text;
    }
    throw new Error(result.error || 'Translation failed');
  },

  /** @deprecated Use translate() */
  async autoTranslate(text, targetLang) {
    return await this.translate(text, typeof targetLang === 'string' ? { to: targetLang } : targetLang);
  },

  /** Shorthand */
  async t(text, to) {
    return await this.translate(text, { to });
  },

  /**
   * Safe translate — never throws
   * @returns {Promise<{ok:boolean,text:string,provider?:string,from?:string,to?:string,words?:number,error?:string,fallback?:string}>}
   */
  async tryTranslate(text, options) {
    const opts = typeof options === 'string' ? { to: options } : (options || {});

    if (!text || typeof text !== 'string') {
      return { ok: false, text: '', error: 'Text must be a non-empty string' };
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return { ok: false, text: '', error: 'Text must be a non-empty string' };
    }

    if (trimmed.length > this._config.maxLength) {
      return {
        ok: false,
        text: trimmed,
        error: `Text too long (max ${this._config.maxLength} characters)`
      };
    }

    const to = this._normalizeLang(
      opts.to || (opts.userId || user?.id ? await this.getUserLang(opts.userId) : this._config.defaultLang)
    );
    const from = opts.from ? this._normalizeLang(opts.from) : 'auto';

    if (to === from || (from === 'auto' && to === this._config.defaultLang && this._looksEnglish(trimmed))) {
      return { ok: true, text: trimmed, provider: 'skip', from: from, to: to, words: 0 };
    }

    const words = this._wordCount(trimmed);
    const usage = await this._getUsage();
    const myMemoryAllowed = usage.words + words <= this._config.dailyLimit;

    const providers = this._config.providers.filter(name => {
      if (name === 'mymemory') return myMemoryAllowed;
      return true;
    });

    let lastError = 'All providers failed';

    for (let i = 0; i < providers.length; i++) {
      const name = providers[i];
      try {
        const translated = await this._callProvider(name, trimmed, from, to);
        if (translated && translated !== trimmed) {
          await this._addUsage(words, name);
          return {
            ok: true,
            text: this._clean(translated),
            provider: name,
            from: from,
            to: to,
            words: words
          };
        }
      } catch (err) {
        lastError = err.message || String(err);
      }
    }

    return {
      ok: false,
      text: trimmed,
      error: lastError,
      fallback: opts.fallback,
      from: from,
      to: to
    };
  },

  /**
   * Translate multiple strings (sequential — respects rate limits)
   * @param {string[]} texts
   * @param {Object} [options]
   * @returns {Promise<Array<{ok:boolean,text:string}>>}
   */
  async batch(texts, options = {}) {
    if (!Array.isArray(texts)) return [];
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      results.push(await this.tryTranslate(texts[i], options));
    }
    return results;
  },

  /**
   * Bundled user translation profile
   * @param {number} [userId]
   */
  async stats(userId) {
    const [lang, usageInfo] = await Promise.all([
      this.getUserLang(userId),
      this.getUsageInfo()
    ]);

    return {
      lang: lang,
      langName: this.langName(lang),
      usage: usageInfo
    };
  },

  /**
   * Build inline keyboard rows for language selection
   * @param {Object} [options]
   * @param {number} [options.perRow=2]
   * @param {string} [options.prefix='lang_'] - callback_data prefix
   * @param {string[]} [options.codes] - subset of language codes
   * @returns {Array<Array<Object>>}
   */
  langButtons(options = {}) {
    const perRow = options.perRow || 2;
    const prefix = options.prefix || 'lang_';
    const codes = options.codes || Object.keys(this.languages);
    const buttons = [];

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (!this.languages[code]) continue;
      buttons.push({
        text: this.languages[code],
        callback_data: prefix + code
      });
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += perRow) {
      rows.push(buttons.slice(i, i + perRow));
    }
    return rows;
  },

  /**
   * Parse callback_data from langButtons
   * @param {string} data
   * @param {string} [prefix='lang_']
   * @returns {string|null}
   */
  parseLangCallback(data, prefix = 'lang_') {
    if (!data || typeof data !== 'string' || !data.startsWith(prefix)) return null;
    const code = this._normalizeLang(data.slice(prefix.length));
    return this.isSupported(code) ? code : null;
  },

  /**
   * Format language list for display
   * @param {string} [bullet='•']
   */
  formatLangList(bullet = '•') {
    return this.listLanguages()
      .map(item => `${bullet} ${item.name} (${item.code})`)
      .join('\n');
  },

  clearCache() {
    this._session.usage = null;
    this._session.langs = {};
  },

  async _dbSet(key, value, collection = 'bot', scope = {}) {
    const res = collection === 'user'
      ? await db.user.set(key, value, scope)
      : await db.bot.set(key, value);
    if (!res.ok) {
      throw new Error(res.message || 'Storage write failed');
    }
    return res;
  },

  _httpFail(res, provider) {
    const code = (res.error && res.error.code) ? res.error.code : res.status;
    const msg = (res.error && res.error.message) ? res.error.message : (res.statusText || 'request failed');
    return new Error(provider + ': ' + code + ' - ' + msg);
  },

  _httpOpts(extra = {}) {
    return Object.assign({
      timeout: this._config.timeout,
      responseType: 'json'
    }, extra);
  },

  // ─── providers ───────────────────────────────────────────

  async _callProvider(name, text, from, to) {
    switch (name) {
      case 'google': return await this._google(text, from, to);
      case 'mymemory': return await this._myMemory(text, from, to);
      case 'lingva': return await this._lingva(text, from, to);
      case 'libre': return await this._libre(text, from, to);
      default: throw new Error(`Unknown provider: ${name}`);
    }
  },

  async _google(text, from, to) {
    const sl = from === 'auto' ? 'auto' : from;
    const response = await HTTP.get('https://translate.googleapis.com/translate_a/single', this._httpOpts({
      query: { client: 'gtx', sl: sl, tl: to, dt: 't', q: text },
      cfProxy: this._config.cfProxy
    }));

    if (!response.ok) throw this._httpFail(response, 'Google Translate');
    if (!response.data || !response.data[0]) {
      throw new Error('Google Translate: invalid response');
    }
    return response.data[0].map(item => item[0]).join('');
  },

  async _myMemory(text, from, to) {
    const sl = from === 'auto' ? 'en' : from;
    const response = await HTTP.get('https://api.mymemory.translated.net/get', this._httpOpts({
      query: { q: text, langpair: sl + '|' + to },
      cfProxy: this._config.cfProxy
    }));

    if (!response.ok) throw this._httpFail(response, 'MyMemory');

    const translated = response.data && response.data.responseData
      ? response.data.responseData.translatedText
      : null;
    if (!translated) throw new Error('MyMemory: invalid response');
    if (translated.toUpperCase().includes('QUERY LENGTH LIMIT')) {
      throw new Error('MyMemory: query length limit');
    }
    return translated;
  },

  async _lingva(text, from, to) {
    const sl = from === 'auto' ? 'auto' : from;
    const response = await HTTP.get(
      'https://lingva.ml/api/v1/' + sl + '/' + to + '/' + encodeURIComponent(text),
      this._httpOpts({ cfProxy: this._config.cfProxy })
    );

    if (!response.ok) throw this._httpFail(response, 'Lingva');
    if (!response.data || !response.data.translation) {
      throw new Error('Lingva: invalid response');
    }
    return response.data.translation;
  },

  async _libre(text, from, to) {
    const response = await HTTP.post('https://libretranslate.com/translate', this._httpOpts({
      body: {
        q: text,
        source: from === 'auto' ? 'auto' : from,
        target: to,
        format: 'text'
      },
      cfProxy: this._config.cfProxy
    }));

    if (!response.ok) throw this._httpFail(response, 'LibreTranslate');
    if (!response.data || !response.data.translatedText) {
      throw new Error('LibreTranslate: invalid response');
    }
    return response.data.translatedText;
  },

  _clean(text) {
    return String(text)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  },

  _looksEnglish(text) {
    return /^[\x00-\x7F\s\d.,!?'"\-:;()]+$/.test(text);
  }
};

module.exports = TranslateLib;

// last updated: 07/07/26
// _v: 1.0.0
// type: asynchronous
