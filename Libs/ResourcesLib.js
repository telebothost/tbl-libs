/* ==========================================================
   INTERNAL CACHES (FAST IN-MEMORY SESSION CACHE)
========================================================== */
const _cache = {
  res: {},        // cache for basic resources
  growth: {}      // cache for growth objects
};

const P = key => 'ResourcesLib_' + key;

/* ==========================================================
   COMMON UTILITIES
========================================================== */
const getProp = key => {
  if (_cache.res[key] !== undefined) return _cache.res[key];
  const val = Bot.getProperty(key);
  _cache.res[key] = (val === undefined ? 0 : Number(val) || 0);
  return _cache.res[key];
};

const setProp = (key, value) => {
  _cache.res[key] = value;
  Bot.setProperty(key, value, 'float');
};

const getGrowth = key => {
  if (_cache.growth[key]) return _cache.growth[key];
  let g = Bot.getProperty(key);
  if (!g) return null;
  _cache.growth[key] = g;
  return g;
};

const setGrowth = (key, value) => {
  _cache.growth[key] = value;
  Bot.setProperty(key, value, 'json');
};

/* ==========================================================
   GROWTH RESOURCE (WITH CACHING)
========================================================== */
class GrowthResource {
  constructor(resource) {
    this.resource = resource;
    this.key = resource.propName() + '_growth';
  }

  info() { 
    return getGrowth(this.key) || {}; 
  }

  isEnabled() { 
    return !!this.info().enabled; 
  }

  have() { 
    return !!getGrowth(this.key); 
  }

  propName() { 
    return this.key; 
  }

  title() {
    if (!this.isEnabled()) return;

    let growth = this.info();
    if (!growth) return;
    
    let start_text = 'add ' + String(growth.increment || 0);
    let middle_text = ' once at ' + String(growth.interval || 0) + ' secs';

    if (growth.type == 'simple') {
      return start_text + middle_text;
    }
    if (growth.type == 'percent') {
      return start_text + '%' + middle_text;
    }
    if (growth.type == 'compound_interest') {
      return start_text + '%' + middle_text + ' with reinvesting';
    }
  }

  _toggle(status) {
    let growth = this.info();
    if (!growth) return false;

    growth.enabled = status;
    return setGrowth(this.key, growth);
  }

  stop() {
    return this._toggle(false);
  }

  progress() {
    let growth = this.info();
    if (!growth) return 0;

    let total_iterations = this.totalIterations(growth);
    let fraction = total_iterations % 1;
    return fraction * 100;
  }

  willCompleteAfter() {
    let growth = this.info();
    if (!growth || !growth.interval) return 0;
    
    return growth.interval - this.progress() / 100 * growth.interval;
  }

  totalIterations(growth) {
    if (!growth) { 
      growth = this.info(); 
    }
    if (!growth || !growth.started_at) return 0;

    let now = Date.now();
    let duration_in_seconds = (now - growth.started_at) / 1000;
    return duration_in_seconds / (growth.interval || 1);
  }

  _calcMinMax(result, growth) {
    if (!growth) return result;
    
    if ((growth.min !== undefined) && (growth.min > result)) {
      return growth.min;
    }

    if ((growth.max !== undefined) && (growth.max < result)) {
      return growth.max;
    }

    return result;
  }

  _calcByTotalIterations(value, total_iterations, growth) {
    if (!growth || !growth.type) return value;
    
    let result = value;
    if (growth.type == 'simple') {
      result = value + total_iterations * (growth.increment || 0);
    }
    if (growth.type == 'percent') {
      let percent = (growth.increment || 0) / 100;
      let all_percents = percent * (growth.base_value || 0) * total_iterations;
      result = value + all_percents;
    }
    if (growth.type == 'compound_interest') {
      let percent = (1 + (growth.increment || 0) / 100);
      result = value * Math.pow(percent, total_iterations);
    }
    return result;
  }

  _getTotalIterationsWithLimit(growth) {
    let total_iterations = this.totalIterations(growth);

    if (!growth || !growth.max_iterations_count) { 
      return total_iterations; 
    }

    let total = total_iterations + (growth.completed_iterations_count || 0);
    if (total < growth.max_iterations_count) {
      return total_iterations;
    }
    
    return growth.max_iterations_count - (growth.completed_iterations_count || 0);
  }

  _calcValue(value, growth) {
    let total_iterations = this._getTotalIterationsWithLimit(growth);

    if (total_iterations < 1) { 
      return value; 
    }

    let fraction = total_iterations % 1;
    total_iterations = total_iterations - fraction;

    let result = this._calcByTotalIterations(value, total_iterations, growth);

    growth.completed_iterations_count = (growth.completed_iterations_count || 0) + total_iterations;
    
    result = this._calcMinMax(result, growth);
    
    this._updateIteration(growth, fraction * 1000);

    return result;
  }

  getValue(value) {
    let growth = this.info();
    if (!growth) return value;
    if (!growth.enabled) return value;

    let new_value = this._calcValue(value, growth);

    if (!new_value) return value;

    this.resource._set(new_value);

    return new_value;
  }

  _updateIteration(growth, fraction) {
    if (!growth) { 
      growth = this.info(); 
    }
    if (!growth) return false;

    let started_at = Date.now();
    if (fraction) { 
      started_at = started_at - fraction; 
    }

    growth.started_at = started_at;

    return setGrowth(this.key, growth);
  }

  _updateBaseValue(base_value) {
    let growth = this.info();
    if (!growth) return false;

    growth.base_value = base_value || 0;
    return setGrowth(this.key, growth);
  }

  _newGrowth(options) {
    return {
      base_value: this.resource.baseValue(),
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

  _addAs(options) {
    let growth = this._newGrowth(options);
    return this._updateIteration(growth);
  }

  add(options) {
    options = options || {};
    options.type = 'simple';
    options.increment = options.value || 0;
    return this._addAs(options);
  }

  addPercent(options) {
    options = options || {};
    options.type = 'percent';
    options.increment = options.percent || 0;
    return this._addAs(options);
  }

  addCompoundInterest(options) {
    options = options || {};
    options.type = 'compound_interest';
    options.increment = options.percent || 0;
    return this._addAs(options);
  }
}

/* ==========================================================
   COMMON RESOURCE (WITH CACHING)
========================================================== */
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

  isNumber(value) { 
    return typeof(value) == 'number' && !isNaN(value); 
  }

  verifyNumber(value) { 
    if (!this.isNumber(value)) {
      let evalue = '';
      if (typeof(value) != 'undefined') { 
        evalue = String(value).substring(0, 50); 
      }
      throw 'ResLib: value must be number only. It is not number: ' + typeof(value) + ' ' + evalue;
    }
  }

  removeRes(res_amount) {
    let current = this.baseValue();
    this.set(current - res_amount);
    return true;
  }

  baseValue() {
    return getProp(this.propName());
  }

  value() {
    let cur_value = this.baseValue();

    if (this._withEnabledGrowth()) {
      return this.growth.getValue(cur_value);
    }
    return cur_value;
  }
  
  add(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    this.set(this.baseValue() + res_amount);
    return true;
  }

  have(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    if (res_amount < 0) return false;
    if (res_amount == 0) return false;

    return this.value() >= res_amount;
  }
  
  remove(res_amount) {
    res_amount = Number(res_amount) || 0;
    if (!this.have(res_amount)) {
      throw 'ResLib: not enough resources';
    }
    return this.removeRes(res_amount);
  }
  
  removeAnyway(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);
    return this.removeRes(res_amount);
  }

  _withEnabledGrowth() {
    return (this.growth && this.growth.isEnabled());
  }

  _set(res_amount) {
    res_amount = Number(res_amount) || 0;
    setProp(this.propName(), res_amount);
  }

  set(res_amount) {
    res_amount = Number(res_amount) || 0;
    this.verifyNumber(res_amount);

    if (this._withEnabledGrowth()) {
      this.growth._updateBaseValue(res_amount);
    }
    return this._set(res_amount);
  }

  anywayTakeFromAndTransferTo(fromResource, toResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    if (fromResource.name != toResource.name) {
      throw 'ResLib: can not transfer different resources';
    }

    if (fromResource.removeAnyway(res_amount)) {
      return toResource.add(res_amount);
    }
    return false;
  }

  anywayTakeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount) {
    remove_amount = Number(remove_amount) || 0;
    add_amount = Number(add_amount) || 0;
    
    if (fromResource.removeAnyway(remove_amount)) {
      return toResource.add(add_amount);
    }
    return false;
  }

  takeFromAndTransferTo(fromResource, toResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    if (!fromResource.have(res_amount)) {
      throw 'ResLib: not enough resources for transfer';
    }

    return this.anywayTakeFromAndTransferTo(fromResource, toResource, res_amount);
  }

  takeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount) {
    remove_amount = Number(remove_amount) || 0;
    add_amount = Number(add_amount) || 0;
    
    if (!fromResource.have(remove_amount)) {
      throw 'ResLib: not enough resources for transfer';
    }

    return this.anywayTakeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount);
  }

  takeFromAnother(anotherResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    return this.takeFromAndTransferTo(anotherResource, this, res_amount);
  }

  transferTo(anotherResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    return this.takeFromAndTransferTo(this, anotherResource, res_amount);
  }

  exchangeTo(anotherResource, options) {
    options = options || {};
    let remove_amount = Number(options.remove_amount) || 0;
    let add_amount = Number(options.add_amount) || 0;
    
    return this.takeFromAndTransferToDifferent(this, anotherResource, remove_amount, add_amount);
  }

  takeFromAnotherAnyway(anotherResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    return this.anywayTakeFromAndTransferTo(anotherResource, this, res_amount);
  }

  transferToAnyway(anotherResource, res_amount) {
    res_amount = Number(res_amount) || 0;
    return this.anywayTakeFromAndTransferTo(this, anotherResource, res_amount);
  }
}

/* ==========================================================
   FACTORY FUNCTIONS
========================================================== */
const getResourceFor = function(object, object_id, resName) {
  return new CommonResource(object, object_id, resName);
};

const userResource = function(resName) {
  let userId = (user && user.telegramid) ? user.telegramid : 'unknown';
  return getResourceFor('user', userId, resName);
};

const chatResource = function(resName) {
  let chatId = (chat && chat.chatid) ? chat.chatid : 'unknown';
  return getResourceFor('chat', chatId, resName);
};

const globalResource = function(resName) {
  return getResourceFor('global', 'global', resName);
};

const anotherUserResource = function(resName, telegramid) {
  return getResourceFor('user', telegramid || 'unknown', resName);
};

const anotherChatResource = function(resName, chatid) {
  return getResourceFor('chat', chatid || 'unknown', resName);
};

// Export for TBL module system
module.exports = {
  userRes: userResource,
  chatRes: chatResource,
  globalRes: globalResource,
  anotherUserRes: anotherUserResource,
  anotherChatRes: anotherChatResource,
  growthFor: (resource) => resource.growth
};
