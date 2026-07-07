/**
 * High-performance resource management library for TBL runtime
 * Uses async db.bot storage — same keys as v1 (ResourcesLib_*)
 *
 * @module ResourcesLib
 */

const _cache = {
  res: {},
  growth: {},
  resHit: {},
  growthHit: {}
};

const P = key => 'ResourcesLib_' + key;

function _cacheKey(key) {
  return key;
}

function _shallowCopy(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const copy = {};
  for (const k in obj) {
    copy[k] = obj[k];
  }
  return copy;
}

function _readCachedRes(key) {
  const ck = _cacheKey(key);
  if (!_cache.resHit[ck]) return undefined;
  return _cache.res[ck];
}

function _writeCachedRes(key, value) {
  const ck = _cacheKey(key);
  _cache.res[ck] = value;
  _cache.resHit[ck] = 1;
}

function _readCachedGrowth(key) {
  const ck = _cacheKey(key);
  if (!_cache.growthHit[ck]) return undefined;
  return _cache.growth[ck];
}

function _writeCachedGrowth(key, value) {
  const ck = _cacheKey(key);
  _cache.growth[ck] = value;
  _cache.growthHit[ck] = 1;
}

async function getProp(key) {
  const cached = _readCachedRes(key);
  if (cached !== undefined) return cached;

  const val = await db.bot.get(key, 0);
  const num = (val === undefined || val === null ? 0 : Number(val) || 0);
  _writeCachedRes(key, num);
  return num;
}

async function _ensureSet(result, action) {
  if (!result || !result.ok) {
    throw new Error('ResLib: ' + action + ' failed - ' + ((result && result.message) || 'storage error'));
  }
  return result;
}

async function setProp(key, value) {
  const num = Number(value) || 0;
  _writeCachedRes(key, num);
  const res = await db.bot.set(key, num, { type: 'number' });
  return await _ensureSet(res, 'set');
}

async function incrProp(key, amount) {
  try {
    const next = await db.bot.incr(key, amount);
    _writeCachedRes(key, Number(next) || 0);
    return _readCachedRes(key);
  } catch (err) {
    throw new Error('ResLib: incr failed - ' + (err.message || err));
  }
}

async function decrProp(key, amount) {
  try {
    const next = await db.bot.decr(key, amount);
    _writeCachedRes(key, Number(next) || 0);
    return _readCachedRes(key);
  } catch (err) {
    throw new Error('ResLib: decr failed - ' + (err.message || err));
  }
}

async function getGrowth(key) {
  const cached = _readCachedGrowth(key);
  if (cached !== undefined) return cached;

  const g = await db.bot.get(key, null);
  _writeCachedGrowth(key, g || null);
  return g || null;
}

async function setGrowth(key, value) {
  _writeCachedGrowth(key, value);
  const res = await db.bot.set(key, value, { type: 'object' });
  return await _ensureSet(res, 'set growth');
}

async function mgetValueAndGrowth(valueKey, growthKey) {
  const resCached = _readCachedRes(valueKey);
  const growthCached = _readCachedGrowth(growthKey);

  if (resCached !== undefined && growthCached !== undefined) {
    return { value: resCached, growth: growthCached };
  }

  const data = await db.bot.mget([valueKey, growthKey]);
  const value = (valueKey in data)
    ? (Number(data[valueKey]) || 0)
    : (resCached !== undefined ? resCached : 0);
  const growth = (growthKey in data)
    ? data[growthKey]
    : (growthCached !== undefined ? growthCached : null);

  _writeCachedRes(valueKey, value);
  _writeCachedGrowth(growthKey, growth);

  return { value, growth };
}

class GrowthResource {
  constructor(resource) {
    this.resource = resource;
    this.key = resource.propName() + '_growth';
    this._state = null;
  }

  _useState(growth) {
    this._state = growth;
    _writeCachedGrowth(this.key, growth);
    return growth;
  }

  async info() {
    if (this._state) return this._state;
    const g = await getGrowth(this.key);
    this._state = g || {};
    return this._state;
  }

  async isEnabled() {
    const g = await this.info();
    return !!g.enabled;
  }

  async have() {
    const g = await getGrowth(this.key);
    return !!g;
  }

  propName() {
    return this.key;
  }

  async title() {
    const growth = await this.info();
    if (!growth.enabled) return;

    const start_text = 'add ' + String(growth.increment || 0);
    const middle_text = ' once at ' + String(growth.interval || 0) + ' secs';

    if (growth.type === 'simple') return start_text + middle_text;
    if (growth.type === 'percent') return start_text + '%' + middle_text;
    if (growth.type === 'compound_interest') return start_text + '%' + middle_text + ' with reinvesting';
  }

  async _toggle(status) {
    const growth = await this.info();
    if (!growth || !growth.type) return false;
    growth.enabled = status;
    return await setGrowth(this.key, this._useState(growth));
  }

  async stop() {
    return await this._toggle(false);
  }

  progressOf(growth) {
    if (!growth || !growth.started_at) return 0;
    const total_iterations = this.totalIterations(growth);
    return (total_iterations % 1) * 100;
  }

  async progress() {
    return this.progressOf(await this.info());
  }

  async willCompleteAfter() {
    const growth = await this.info();
    if (!growth || !growth.interval) return 0;
    return growth.interval - this.progressOf(growth) / 100 * growth.interval;
  }

  totalIterations(growth) {
    if (!growth || !growth.started_at) return 0;
    const duration_in_seconds = (Date.now() - growth.started_at) / 1000;
    return duration_in_seconds / (growth.interval || 1);
  }

  _calcMinMax(result, growth) {
    if (!growth) return result;
    if (growth.min !== undefined && growth.min > result) return growth.min;
    if (growth.max !== undefined && growth.max < result) return growth.max;
    return result;
  }

  _calcByTotalIterations(value, total_iterations, growth) {
    if (!growth || !growth.type) return value;

    if (growth.type === 'simple') {
      return value + total_iterations * (growth.increment || 0);
    }
    if (growth.type === 'percent') {
      const percent = (growth.increment || 0) / 100;
      return value + percent * (growth.base_value || 0) * total_iterations;
    }
    if (growth.type === 'compound_interest') {
      const percent = 1 + (growth.increment || 0) / 100;
      return value * Math.pow(percent, total_iterations);
    }
    return value;
  }

  _getTotalIterationsWithLimit(growth) {
    let total_iterations = this.totalIterations(growth);
    if (!growth.max_iterations_count) return total_iterations;

    const total = total_iterations + (growth.completed_iterations_count || 0);
    if (total < growth.max_iterations_count) return total_iterations;
    return growth.max_iterations_count - (growth.completed_iterations_count || 0);
  }

  _calcValue(value, growth) {
    let total_iterations = this._getTotalIterationsWithLimit(growth);
    if (total_iterations < 1) return { value, growth, changed: false };

    const fraction = total_iterations % 1;
    total_iterations = total_iterations - fraction;

    let result = this._calcByTotalIterations(value, total_iterations, growth);
    growth.completed_iterations_count = (growth.completed_iterations_count || 0) + total_iterations;
    result = this._calcMinMax(result, growth);

    const started_at = Date.now() - (fraction ? fraction * 1000 : 0);
    growth.started_at = started_at;

    return { value: result, growth, changed: true };
  }

  async getValue(value, growth) {
    if (!growth || !growth.enabled) return value;

    const calc = this._calcValue(value, growth);
    if (!calc.changed || !calc.value) return value;

    this._useState(calc.growth);
    await Promise.all([
      setGrowth(this.key, calc.growth),
      this.resource._set(calc.value)
    ]);

    return calc.value;
  }

  async _updateIteration(growth) {
    if (!growth) return false;
    growth.started_at = Date.now();
    return await setGrowth(this.key, this._useState(growth));
  }

  async _updateBaseValue(base_value) {
    const growth = await this.info();
    if (!growth || !growth.type) return false;
    growth.base_value = base_value || 0;
    return await setGrowth(this.key, this._useState(growth));
  }

  async _newGrowth(options) {
    return {
      base_value: await this.resource.baseValue(),
      increment: options.increment || 0,
      interval: options.interval || 60,
      type: options.type || 'simple',
      min: options.min,
      max: options.max,
      max_iterations_count: options.max_iterations_count,
      enabled: true,
      completed_iterations_count: 0
    };
  }

  async _addAs(options) {
    const growth = await this._newGrowth(options);
    return await this._updateIteration(growth);
  }

  async add(options) {
    options = options || {};
    options.type = 'simple';
    options.increment = options.value || 0;
    return await this._addAs(options);
  }

  async addPercent(options) {
    options = options || {};
    options.type = 'percent';
    options.increment = options.percent || 0;
    return await this._addAs(options);
  }

  async addCompoundInterest(options) {
    options = options || {};
    options.type = 'compound_interest';
    options.increment = options.percent || 0;
    return await this._addAs(options);
  }

  /** Restart growth timer without changing config */
  async restart() {
    const growth = await this.info();
    if (!growth || !growth.type) return false;
    growth.enabled = true;
    return await this._updateIteration(growth);
  }

  /** Re-enable stopped growth */
  async resume() {
    const growth = await this.info();
    if (!growth || !growth.type) return false;
    growth.enabled = true;
    return await setGrowth(this.key, this._useState(growth));
  }

  /** Seconds until next growth tick */
  async nextTickIn() {
    return await this.willCompleteAfter();
  }

  /** How much growth would add right now (no db write) */
  async previewGain() {
    const { value, growth } = await this.resource._loadWithGrowth();
    if (!growth || !growth.enabled) return 0;
    const calc = this._calcValue(value, _shallowCopy(growth));
    return Math.max(0, (calc.value || value) - value);
  }
}

class CommonResource {
  constructor(objName, objID, resName) {
    this.objName = objName || 'global';
    this.objID = objID || 'global';
    this.name = resName || 'default';
    this.growth = new GrowthResource(this);
  }

  propName() {
    return P(this.objName + '_' + this.objID + '_' + this.name);
  }

  growthKey() {
    return this.propName() + '_growth';
  }

  isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  verifyNumber(value) {
    if (!this.isNumber(value)) {
      let evalue = '';
      if (typeof value !== 'undefined') {
        evalue = String(value).substring(0, 50);
      }
      throw 'ResLib: value must be number only. It is not number: ' + typeof(value) + ' ' + evalue;
    }
  }

  async baseValue() {
    return await getProp(this.propName());
  }

  async _loadWithGrowth() {
    return await mgetValueAndGrowth(this.propName(), this.growthKey());
  }

  async value() {
    const { value, growth } = await this._loadWithGrowth();
    if (!growth || !growth.enabled) return value;
    return await this.growth.getValue(value, growth);
  }

  /** Raw stored value — skips growth calculation (fast path) */
  async peek() {
    return await this.baseValue();
  }

  /** Simulated value after growth — no db write */
  async preview() {
    const { value, growth } = await this._loadWithGrowth();
    if (!growth || !growth.enabled) return value;
    const calc = this.growth._calcValue(value, _shallowCopy(growth));
    return calc.changed ? calc.value : value;
  }

  /**
   * Dashboard bundle — one mget
   * @returns {Promise<Object>}
   */
  async stats() {
    const { value, growth } = await this._loadWithGrowth();
    const hasGrowth = !!(growth && growth.type);
    const enabled = !!(growth && growth.enabled);
    let current = value;
    let pending = 0;

    if (enabled) {
      const calc = this.growth._calcValue(value, _shallowCopy(growth));
      if (calc.changed) {
        current = calc.value;
        pending = Math.max(0, current - value);
      }
    }

    let nextTickIn = 0;
    let progress = 0;
    if (enabled && growth.interval) {
      progress = this.growth.progressOf(growth);
      nextTickIn = growth.interval - progress / 100 * growth.interval;
    }

    return {
      name: this.name,
      key: this.propName(),
      base: value,
      current: current,
      pending: pending,
      growth: hasGrowth ? {
        enabled: enabled,
        type: growth.type,
        increment: growth.increment,
        interval: growth.interval,
        progress: progress,
        nextTickIn: nextTickIn
      } : null
    };
  }

  async isEmpty() {
    return (await this.peek()) <= 0;
  }

  async isAtLeast(amount) {
    amount = Number(amount) || 0;
    this.verifyNumber(amount);
    return (await this.value()) >= amount;
  }

  /**
   * Remove if enough — no throw
   * @returns {Promise<{ok:boolean, removed:number, balance:number}>}
   */
  async tryRemove(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);

    const balance = await this.value();
    if (balance < res_amount) {
      return { ok: false, removed: 0, balance: balance };
    }

    await decrProp(this.propName(), res_amount);
    return { ok: true, removed: res_amount, balance: balance - res_amount };
  }

  /** Shorthand: returns true if spent successfully */
  async spend(res_amount) {
    return (await this.tryRemove(res_amount)).ok;
  }

  /** Set to 0 */
  async reset() {
    return await this._set(0);
  }

  /** Raise value to min if below */
  async ensureAtLeast(min) {
    min = Number(min) || 0;
    this.verifyNumber(min);
    const current = await this.peek();
    if (current >= min) return current;
    await this._set(min);
    return min;
  }

  /** Add only until target is reached */
  async fillTo(target) {
    target = Number(target) || 0;
    this.verifyNumber(target);
    const current = await this.peek();
    if (current >= target) return current;
    const delta = target - current;
    await incrProp(this.propName(), delta);
    return target;
  }

  /** Clamp and set */
  async setClamped(res_amount, min, max) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    if (typeof min === 'number') res_amount = Math.max(min, res_amount);
    if (typeof max === 'number') res_amount = Math.min(max, res_amount);
    return await this.set(res_amount);
  }

  /**
   * Human-readable amount
   * @param {Object} [options]
   * @param {string} [options.suffix] - e.g. "gold"
   * @param {boolean} [options.compact] - 1.2K style
   */
  async format(options = {}) {
    const amount = await this.value();
    const suffix = options.suffix ? ' ' + options.suffix : '';

    if (!options.compact) {
      return String(Math.floor(amount * 100) / 100) + suffix;
    }

    const abs = Math.abs(amount);
    if (abs >= 1e9) return (amount / 1e9).toFixed(1).replace(/\.0$/, '') + 'B' + suffix;
    if (abs >= 1e6) return (amount / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' + suffix;
    if (abs >= 1e3) return (amount / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' + suffix;
    return String(Math.floor(amount * 100) / 100) + suffix;
  }

  async removeRes(res_amount) {
    await decrProp(this.propName(), res_amount);
    return true;
  }

  async add(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    await incrProp(this.propName(), res_amount);
    return true;
  }

  async have(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    if (res_amount <= 0) return false;
    return (await this.value()) >= res_amount;
  }

  async remove(res_amount) {
    res_amount = Number(res_amount) || 0;
    if (!(await this.have(res_amount))) {
      throw 'ResLib: not enough resources';
    }
    return await this.removeRes(res_amount);
  }

  async removeAnyway(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    return await this.removeRes(res_amount);
  }

  async _set(res_amount) {
    res_amount = Number(res_amount) || 0;
    return await setProp(this.propName(), res_amount);
  }

  async set(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);

    const growth = await this.growth.info();
    if (growth && growth.enabled) {
      await this.growth._updateBaseValue(res_amount);
    }
    return await this._set(res_amount);
  }

  async anywayTakeFromAndTransferTo(fromResource, toResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    if (fromResource.name !== toResource.name) {
      throw 'ResLib: can not transfer different resources';
    }

    await Promise.all([
      decrProp(fromResource.propName(), res_amount),
      incrProp(toResource.propName(), res_amount)
    ]);
    return true;
  }

  async anywayTakeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount) {
    remove_amount = Number(remove_amount) || 0;
    add_amount = Number(add_amount) || 0;

    await Promise.all([
      decrProp(fromResource.propName(), remove_amount),
      incrProp(toResource.propName(), add_amount)
    ]);
    return true;
  }

  async takeFromAndTransferTo(fromResource, toResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    if (!(await fromResource.have(res_amount))) {
      throw 'ResLib: not enough resources for transfer';
    }
    return await this.anywayTakeFromAndTransferTo(fromResource, toResource, res_amount);
  }

  async takeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount) {
    remove_amount = Number(remove_amount) || 0;
    add_amount = Number(add_amount) || 0;

    if (!(await fromResource.have(remove_amount))) {
      throw 'ResLib: not enough resources for transfer';
    }
    return await this.anywayTakeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount);
  }

  async takeFromAnother(anotherResource, res_amount) {
    return await this.takeFromAndTransferTo(anotherResource, this, Number(res_amount) || 0);
  }

  async transferTo(anotherResource, res_amount) {
    return await this.takeFromAndTransferTo(this, anotherResource, Number(res_amount) || 0);
  }

  async exchangeTo(anotherResource, options) {
    options = options || {};
    return await this.takeFromAndTransferToDifferent(
      this,
      anotherResource,
      Number(options.remove_amount) || 0,
      Number(options.add_amount) || 0
    );
  }

  async takeFromAnotherAnyway(anotherResource, res_amount) {
    return await this.anywayTakeFromAndTransferTo(anotherResource, this, Number(res_amount) || 0);
  }

  async transferToAnyway(anotherResource, res_amount) {
    return await this.anywayTakeFromAndTransferTo(this, anotherResource, Number(res_amount) || 0);
  }
}

const getResourceFor = (object, object_id, resName) => new CommonResource(object, object_id, resName);

const userResource = (resName) => {
  const userId = (user && user.telegramid) ? user.telegramid : 'unknown';
  return getResourceFor('user', userId, resName);
};

const chatResource = (resName) => {
  const chatId = (chat && chat.chatid) ? chat.chatid : 'unknown';
  return getResourceFor('chat', chatId, resName);
};

const globalResource = (resName) => getResourceFor('global', 'global', resName);

const anotherUserResource = (resName, telegramid) => getResourceFor('user', telegramid || 'unknown', resName);

const anotherChatResource = (resName, chatid) => getResourceFor('chat', chatid || 'unknown', resName);

/**
 * Load multiple resource values in one mget round-trip
 * @param {CommonResource[]} resources
 * @param {Object} [options]
 * @param {boolean} [options.withGrowth=false] - Apply growth preview (no writes)
 * @returns {Promise<Object>} Map of resName → value
 */
async function loadAll(resources, options = {}) {
  if (!Array.isArray(resources) || !resources.length) return {};

  const keys = [];
  const growthKeys = [];
  const meta = [];

  for (const res of resources) {
    keys.push(res.propName());
    growthKeys.push(res.growthKey());
    meta.push(res);
  }

  const data = await db.bot.mget(keys.concat(growthKeys));
  const result = {};

  for (let i = 0; i < meta.length; i++) {
    const res = meta[i];
    const valueKey = keys[i];
    const growthKey = growthKeys[i];
    let value = Number(data[valueKey]) || 0;

    _writeCachedRes(valueKey, value);

    if (options.withGrowth) {
      const growth = data[growthKey] || null;
      _writeCachedGrowth(growthKey, growth);
      if (growth && growth.enabled) {
        const calc = res.growth._calcValue(value, _shallowCopy(growth));
        if (calc.changed) value = calc.value;
      }
    }

    result[res.name] = value;
  }

  return result;
}

/** Clear per-command memory cache */
function clearCache() {
  _cache.res = {};
  _cache.growth = {};
  _cache.resHit = {};
  _cache.growthHit = {};
}

/**
 * Spend multiple resources at once (checks all first, then deducts in parallel)
 * @param {Array<{res: CommonResource, amount: number}>} requirements
 * @returns {Promise<{ok:boolean, spent?:Object, missing?:string, need?:number, have?:number}>}
 */
async function spendAll(requirements) {
  if (!Array.isArray(requirements) || !requirements.length) {
    return { ok: true, spent: {} };
  }

  const resources = requirements.map(r => r.res);
  const values = await loadAll(resources, { withGrowth: true });
  const spent = {};

  for (const req of requirements) {
    const amount = Number(req.amount) || 0;
    const have = values[req.res.name] || 0;
    if (have < amount) {
      return { ok: false, missing: req.res.name, need: amount, have: have };
    }
  }

  await Promise.all(requirements.map(req => {
    spent[req.res.name] = Number(req.amount) || 0;
    return decrProp(req.res.propName(), spent[req.res.name]);
  }));

  return { ok: true, spent: spent };
}

module.exports = {
  userRes: userResource,
  chatRes: chatResource,
  globalRes: globalResource,
  anotherUserRes: anotherUserResource,
  anotherChatRes: anotherChatResource,
  growthFor: (resource) => resource.growth,
  loadAll: loadAll,
  spendAll: spendAll,
  clearCache: clearCache
};

// last updated: 07/07/26
// _v: 1.0.0
// type: asynchronous
