/**
 * Per-user and bot-wide cooldown library for TBL runtime
 * @module cooldown
 */

const PREFIX = 'cd:';
const MIN_TTL = 60;

const cooldown = {
  _session: {},

  _key(name) {
    return PREFIX + String(name);
  },

  _scope(userId) {
    if (userId && user && userId !== user.id) {
      return { user_id: userId };
    }
    if (userId) return { user_id: userId };
    return {};
  },

  _cacheKey(name, userId, global) {
    return (global ? 'g:' : 'u:') + (userId || (user && user.id) || 'self') + ':' + name;
  },

  _normalizeSeconds(seconds) {
    const s = Number(seconds) || 0;
    if (s < 1) throw new Error('cooldown: duration must be at least 1 second');
    return s;
  },

  async _dbUserSet(key, value, scope, ttl) {
    const opts = { ttl: ttl, type: 'number' };
    if (scope && scope.user_id) opts.user_id = scope.user_id;
    const res = await db.user.set(key, value, opts);
    if (!res.ok) throw new Error(res.message || 'Storage write failed');
    return res;
  },

  async _dbBotSet(key, value, ttl) {
    const res = await db.bot.set(key, value, { ttl: ttl, type: 'number' });
    if (!res.ok) throw new Error(res.message || 'Storage write failed');
    return res;
  },

  async _getUntil(name, userId, global) {
    const key = this._key(name);
    const ck = this._cacheKey(name, userId, global);

    if (this._session[ck] !== undefined) {
      return this._session[ck];
    }

    let until = 0;
    if (global) {
      until = Number(await db.bot.get(key, 0)) || 0;
    } else {
      const scope = this._scope(userId);
      until = scope.user_id
        ? Number(await db.user.get(key, 0, { user_id: scope.user_id })) || 0
        : Number(await db.user.get(key, 0)) || 0;
    }

    this._session[ck] = until;
    return until;
  },

  _writeCache(name, userId, global, until) {
    this._session[this._cacheKey(name, userId, global)] = until;
  },

  /**
   * Start a user cooldown
   * @param {string} name - Cooldown id e.g. "daily_bonus"
   * @param {number} seconds - Duration in seconds
   * @param {number} [userId] - Target user (default: current user)
   */
  async set(name, seconds, userId) {
    seconds = this._normalizeSeconds(seconds);
    const ttl = Math.max(MIN_TTL, seconds);
    const until = Date.now() + seconds * 1000;
    const scope = this._scope(userId);

    if (scope.user_id) {
      await this._dbUserSet(this._key(name), until, scope, ttl);
    } else {
      const res = await db.user.set(this._key(name), until, { ttl: ttl, type: 'number' });
      if (!res.ok) throw new Error(res.message || 'Storage write failed');
    }

    this._writeCache(name, userId, false, until);
    return until;
  },

  /**
   * Start a bot-wide cooldown (all users share it)
   * @param {string} name
   * @param {number} seconds
   */
  async setGlobal(name, seconds) {
    seconds = this._normalizeSeconds(seconds);
    const ttl = Math.max(MIN_TTL, seconds);
    const until = Date.now() + seconds * 1000;

    await this._dbBotSet(this._key(name), until, ttl);
    this._writeCache(name, null, true, until);
    return until;
  },

  /**
   * Is cooldown still active?
   */
  async active(name, userId) {
    const until = await this._getUntil(name, userId, false);
    return until > Date.now();
  },

  /** Is global cooldown active? */
  async activeGlobal(name) {
    const until = await this._getUntil(name, null, true);
    return until > Date.now();
  },

  /**
   * Seconds remaining (0 if ready)
   */
  async remaining(name, userId) {
    const until = await this._getUntil(name, userId, false);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  },

  async remainingGlobal(name) {
    const until = await this._getUntil(name, null, true);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  },

  /** Unix ms timestamp when cooldown ends (0 if none) */
  async until(name, userId) {
    const ts = await this._getUntil(name, userId, false);
    return ts > Date.now() ? ts : 0;
  },

  /** Clear user cooldown */
  async clear(name, userId) {
    const scope = this._scope(userId);
    if (scope.user_id) {
      await db.user.del(this._key(name), { user_id: scope.user_id });
    } else {
      await db.user.del(this._key(name));
    }
    this._writeCache(name, userId, false, 0);
    return true;
  },

  async clearGlobal(name) {
    await db.bot.del(this._key(name));
    this._writeCache(name, null, true, 0);
    return true;
  },

  /**
   * Run only if off cooldown — sets cooldown on success
   * @returns {Promise<{ok:boolean, remaining:number}>}
   */
  async tryRun(name, seconds, userId) {
    const left = await this.remaining(name, userId);
    if (left > 0) return { ok: false, remaining: left };
    await this.set(name, seconds, userId);
    return { ok: true, remaining: 0 };
  },

  async tryRunGlobal(name, seconds) {
    const left = await this.remainingGlobal(name);
    if (left > 0) return { ok: false, remaining: left };
    await this.setGlobal(name, seconds);
    return { ok: true, remaining: 0 };
  },

  /**
   * Human-readable time left e.g. "4m 30s"
   */
  async format(name, userId) {
    const secs = await this.remaining(name, userId);
    return this.formatSeconds(secs);
  },

  async formatGlobal(name) {
    return this.formatSeconds(await this.remainingGlobal(name));
  },

  formatSeconds(secs) {
    secs = Number(secs) || 0;
    if (secs <= 0) return 'ready';

    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  },

  /**
   * Check multiple cooldowns in one mget
   * @param {string[]} names
   * @param {number} [userId]
   * @returns {Promise<Object>} { name: { active, remaining } }
   */
  async checkAll(names, userId) {
    if (!names || !names.length) return {};

    const keys = [];
    for (let i = 0; i < names.length; i++) {
      keys.push(this._key(names[i]));
    }

    const scope = this._scope(userId);
    const data = scope.user_id
      ? await db.user.mget(keys, { user_id: scope.user_id })
      : await db.user.mget(keys);

    const now = Date.now();
    const result = {};

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const key = keys[i];
      const until = (key in data) ? (Number(data[key]) || 0) : 0;
      const left = until > now ? Math.ceil((until - now) / 1000) : 0;
      result[name] = { active: left > 0, remaining: left };
      this._writeCache(name, userId, false, until);
    }

    return result;
  },

  clearCache() {
    this._session = {};
  }
};

module.exports = cooldown;

// last updated: 07/07/26
// _v: 1.0.0
// type: asynchronous
