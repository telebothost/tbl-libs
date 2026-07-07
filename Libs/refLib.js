/**
 * High-performance referral engine for TBL runtime
 * @module refLib
 */

const KEYS = {
  COUNT: 'rfl:ct',
  REFERRER: 'rfl:by',
  ORGANIC: 'rfl:og',
  LIST: 'rfl:ls',
  TOP: 'rfl:top',
  PREFIXES: 'rfl:px',
  PROFILE: 'rfl:lk',
  GLOBAL: 'rfl:g'
};

const TOP_LIMIT = 50;

const refLib = {
  _prefixes: ['ref'],
  _handlers: {},

  /**
   * Configure default link prefixes (avoids db read on hot path)
   * @param {Object} options
   * @param {string|string[]} [options.prefixes] - Allowed start param prefixes
   */
  configure(options = {}) {
    if (options.prefixes) {
      this._prefixes = Array.isArray(options.prefixes) ? options.prefixes : [options.prefixes];
    } else if (options.prefix) {
      this._prefixes = [options.prefix];
    }
  },

  /**
   * Register event handlers and process the current /start update
   * @param {Object} handlers
   * @param {Function} [handlers.onJoin] - New referral attributed (was onAttracted)
   * @param {Function} [handlers.onSelf] - User opened own link (was onTouchOwnLink)
   * @param {Function} [handlers.onRepeat] - Already referred user (was onAlreadyAttracted)
   * @param {Function} [handlers.onOrganic] - Normal /start without referral code
   * @param {string|string[]} [handlers.prefixes] - Override prefixes for this command
   */
  async track(handlers = {}) {
    this._handlers = {
      onJoin: handlers.onJoin || handlers.onAttracted || null,
      onSelf: handlers.onSelf || handlers.onTouchOwnLink || null,
      onRepeat: handlers.onRepeat || handlers.onAlreadyAttracted || null,
      onOrganic: handlers.onOrganic || null
    };

    if (handlers.prefixes) {
      this._prefixes = Array.isArray(handlers.prefixes) ? handlers.prefixes : [handlers.prefixes];
    } else if (handlers.prefix) {
      this._prefixes = [handlers.prefix];
    }

    if (!this._isStartPayload()) {
      await this._markOrganic();
      return { type: 'organic', reason: 'not_start' };
    }

    const parsed = await this._parsePayload(params);
    if (!parsed) {
      await this._markOrganic();
      if (this._handlers.onOrganic) {
        this._handlers.onOrganic({ user });
      }
      return { type: 'organic', reason: 'no_ref_code' };
    }

    if (parsed.id === user.id) {
      if (this._handlers.onSelf) {
        this._handlers.onSelf({ user, prefix: parsed.prefix });
      }
      return { type: 'self', referrerId: parsed.id };
    }

    const status = await db.user.mget([KEYS.REFERRER, KEYS.ORGANIC]);
    if (status[KEYS.REFERRER] || status[KEYS.ORGANIC]) {
      if (this._handlers.onRepeat) {
        this._handlers.onRepeat({
          user,
          referrerId: parsed.id,
          existingReferrer: status[KEYS.REFERRER] || null
        });
      }
      return {
        type: 'repeat',
        referrerId: parsed.id,
        existingReferrer: status[KEYS.REFERRER] || null
      };
    }

    const result = await this._attribute(parsed.id);
    if (this._handlers.onJoin) {
      this._handlers.onJoin({
        user,
        referrer: result.referrer,
        referrerId: parsed.id,
        count: result.count
      });
    }

    return {
      type: 'join',
      referrerId: parsed.id,
      referrer: result.referrer,
      count: result.count
    };
  },

  /**
   * Build referral URL (sync, no storage I/O)
   * Call register() once if you need profile cache + prefix persistence
   * @param {Object} [options]
   * @param {string} [options.bot] - Bot username override
   * @param {string} [options.prefix] - Link prefix
   * @returns {string}
   */
  link(options = {}) {
    const botName = options.bot || bot.name;
    const prefix = options.prefix || this._prefixes[0] || 'ref';
    return `https://t.me/${botName}?start=${prefix}${user.id}`;
  },

  /**
   * Cache referrer profile + register prefix (call from /mylink, not every message)
   * @param {Object} [options]
   * @param {string} [options.prefix]
   * @returns {Promise<string>} Referral URL
   */
  async register(options = {}) {
    const prefix = options.prefix || this._prefixes[0] || 'ref';
    const snapshot = this._snapshot(user);

    await this._dbSet(KEYS.PROFILE + ':' + user.id, snapshot);
    await this._ensurePrefix(prefix);

    return this.link({ bot: options.bot, prefix });
  },

  /** @deprecated Use link() + register() */
  async getLink(botName = bot.name, prefix = 'ref') {
    return await this.register({ bot: botName, prefix });
  },

  /**
   * Referral count for a user (1 db read)
   * @param {number} [userId]
   * @returns {Promise<number>}
   */
  async count(userId = user.id) {
    return Number(await db.user.get(KEYS.COUNT, 0, { user_id: userId })) || 0;
  },

  /** @deprecated Use count() */
  getRefCount: function(userId) {
    return refLib.count(userId);
  },

  /**
   * Who referred the current user
   * @returns {Promise<Object|null>}
   */
  async referrer() {
    return await db.user.get(KEYS.REFERRER, null);
  },

  /** @deprecated Use referrer() */
  getAttractedBy: function() {
    return refLib.referrer();
  },

  /**
   * Whether current user arrived via a referral
   * @returns {Promise<boolean>}
   */
  async isReferred() {
    return await db.user.has(KEYS.REFERRER);
  },

  /**
   * Referral list for a user (append-only storage)
   * @param {number} [userId]
   * @param {Object} [options]
   * @param {number} [options.limit] - Max items returned
   * @returns {Promise<Array>}
   */
  async list(userId = user.id, options = {}) {
    const items = (await db.user.get(KEYS.LIST, [], { user_id: userId })) || [];
    const limit = options.limit || items.length;
    return items.slice(-limit).map(this._expandListItem);
  },

  /** @deprecated Use list() */
  getRefList: function(userId) {
    return refLib.list(userId);
  },

  /**
   * Leaderboard (reads bounded top cache — not full bot scan)
   * @param {number} [top=10]
   * @returns {Promise<Array<{userId:number,count:number,rank:number}>>}
   */
  async leaderboard(top = 10) {
    const board = (await db.bot.get(KEYS.TOP, [])) || [];
    return board
      .slice(0, top)
      .map((entry, index) => ({
        userId: entry.i,
        count: entry.n,
        rank: index + 1
      }));
  },

  /**
   * Raw leaderboard map (legacy shape: { userId: count })
   * @returns {Promise<Object>}
   */
  async leaderboardMap() {
    const board = await this.leaderboard(TOP_LIMIT);
    const map = {};
    for (const row of board) {
      map[row.userId] = row.count;
    }
    return map;
  },

  /** @deprecated Use leaderboardMap() */
  getTopList: function() {
    return refLib.leaderboardMap();
  },

  /**
   * User rank on leaderboard (0 if unranked)
   * @param {number} [userId]
   * @returns {Promise<number>}
   */
  async rank(userId = user.id) {
    const board = await this.leaderboard(TOP_LIMIT);
    const row = board.find(entry => entry.userId === userId);
    return row ? row.rank : 0;
  },

  /**
   * Bundled stats — single mget for hot dashboard commands
   * @param {number} [userId]
   * @returns {Promise<Object>}
   */
  async stats(userId = user.id) {
    const mgetScope = (userId && userId !== user.id) ? { user_id: userId } : {};
    const data = await db.user.mget(
      [KEYS.COUNT, KEYS.REFERRER, KEYS.LIST, KEYS.ORGANIC],
      mgetScope
    );

    const list = data[KEYS.LIST] || [];
    return {
      count: Number(data[KEYS.COUNT]) || 0,
      referrer: data[KEYS.REFERRER] || null,
      isReferred: !!data[KEYS.REFERRER],
      isOrganic: !!data[KEYS.ORGANIC],
      listSize: Array.isArray(list) ? list.length : 0,
      rank: await this.rank(userId),
      link: this.link()
    };
  },

  /**
   * Increment referral count manually (admin/rewards)
   * @param {number} userId
   * @param {number} [amount=1]
   * @returns {Promise<number>} New count
   */
  async addCount(userId, amount = 1) {
    try {
      const newCount = await db.user.incr(KEYS.COUNT, amount, { user_id: userId });
      await this._dbSet(`${KEYS.GLOBAL}:${userId}`, newCount);
      await this._updateTop(userId, newCount);
      return newCount;
    } catch (err) {
      throw new Error('refLib: addCount failed - ' + (err.message || err));
    }
  },

  async _dbSet(key, value) {
    const res = await db.bot.set(key, value);
    if (!res.ok) {
      throw new Error(res.message || 'Storage write failed');
    }
    return res;
  },

  async _dbUserSet(key, value, userId) {
    const res = userId
      ? await db.user.set(key, value, { user_id: userId })
      : await db.user.set(key, value);
    if (!res.ok) {
      throw new Error(res.message || 'Storage write failed');
    }
    return res;
  },

  //internals

  _isStartPayload() {
    return message && String(message).startsWith('/start') && params && typeof params === 'string';
  },

  _snapshot(u) {
    return {
      i: u.id,
      f: u.first_name || '',
      l: u.last_name || '',
      u: u.username || '',
      t: u.telegramid || u.id
    };
  },

  _expandListItem(item) {
    if (!item) return item;
    return {
      id: item.i,
      username: item.u,
      first_name: item.f,
      last_name: item.l,
      date: item.d ? new Date(item.d).toISOString() : null
    };
  },

  _parseReferrerId(payload, prefixes) {
    for (let i = 0; i < prefixes.length; i++) {
      const prefix = prefixes[i];
      if (payload.startsWith(prefix)) {
        const id = parseInt(payload.slice(prefix.length), 10);
        if (id > 0 && !isNaN(id)) {
          return { id, prefix };
        }
      }
    }
    return null;
  },

  async _parsePayload(payload) {
    const cached = this._parseReferrerId(payload, this._prefixes);
    if (cached) return cached;

    const stored = await db.bot.get(KEYS.PREFIXES, null);
    if (!stored) return null;

    const prefixes = Array.isArray(stored) ? stored : [stored];
    return this._parseReferrerId(payload, prefixes);
  },

  async _markOrganic() {
    if (await db.user.has(KEYS.ORGANIC)) return;
    await this._dbUserSet(KEYS.ORGANIC, 1);
  },

  async _ensurePrefix(prefix) {
    const stored = await db.bot.get(KEYS.PREFIXES, []);
    const prefixes = Array.isArray(stored) ? stored : (stored ? [stored] : []);
    if (prefixes.includes(prefix)) return;
    prefixes.push(prefix);
    await this._dbSet(KEYS.PREFIXES, prefixes);
  },

  async _resolveReferrer(referrerId) {
    const cached = await db.bot.get(`${KEYS.PROFILE}:${referrerId}`, null);
    if (cached) {
      return {
        id: cached.i,
        first_name: cached.f,
        last_name: cached.l,
        username: cached.u,
        telegramid: cached.t
      };
    }
    return { id: referrerId };
  },

  async _attribute(referrerId) {
    const referrer = await this._resolveReferrer(referrerId);

    try {
      await this._dbUserSet(KEYS.REFERRER, {
        id: referrer.id,
        first_name: referrer.first_name || '',
        last_name: referrer.last_name || '',
        username: referrer.username || ''
      });

      const newCount = await db.user.incr(KEYS.COUNT, 1, { user_id: referrerId });

      await db.user.push(KEYS.LIST, {
        i: user.id,
        f: user.first_name || '',
        l: user.last_name || '',
        u: user.username || '',
        d: Date.now()
      }, { user_id: referrerId });

      await this._dbSet(`${KEYS.GLOBAL}:${referrerId}`, newCount);
      await this._updateTop(referrerId, newCount);

      return { referrer, count: newCount };
    } catch (err) {
      throw new Error('refLib: attribution failed - ' + (err.message || err));
    }
  },

  async _updateTop(userId, count) {
    let top = (await db.bot.get(KEYS.TOP, [])) || [];
    if (!Array.isArray(top)) top = [];

    const existing = top.find(entry => entry.i === userId);
    const minCount = top.length >= TOP_LIMIT ? top[top.length - 1].n : -1;

    if (!existing && top.length >= TOP_LIMIT && count <= minCount) {
      return;
    }

    if (existing) {
      existing.n = count;
    } else {
      top.push({ i: userId, n: count });
    }

    top.sort((a, b) => b.n - a.n);
    if (top.length > TOP_LIMIT) {
      top.length = TOP_LIMIT;
    }

    await this._dbSet(KEYS.TOP, top);
  }
};

module.exports = refLib;

// last updated: 07/07/26
// _v: 1.0.0
// type: asynchronous
