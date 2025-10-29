const libPrefix = 'ResourcesLib_';

const createGrowthResource = function(resource) {
  return {
    resource: resource,

    propName: function() { 
      return this.resource.propName() + '_growth';
    },

    info: function() {
      return Bot.getProperty(this.propName()) || {};
    },

    title: function() {
      if(!this.isEnabled()) return '';

      let growth = this.info();
      let start_text = 'add ' + String(growth.increment);
      let middle_text = ' once at ' + String(growth.interval) + ' secs';

      if(growth.type == 'simple') {
        return start_text + middle_text;
      }
      if(growth.type == 'percent') {
        return start_text + '%' + middle_text;
      }
      if(growth.type == 'compound_interest') {
        return start_text + '%' + middle_text + ' with reinvesting';
      }
      
      return '';
    },

    have: function() { 
      return Object.keys(this.info()).length > 0;
    },

    isEnabled: function() {
      let growth = this.info();
      return growth ? growth.enabled : false;
    },
    
    _toggle: function(status) {
      let growth = this.info();
      if(!growth) return false;

      growth.enabled = status;
      return Bot.setProperty(this.propName(), growth, 'json');
    },

    stop: function() {
      return this._toggle(false);
    },

    progress: function() {
      let growth = this.info();
      if(!growth) return 0;

      let total_iterations = this.totalIterations(growth);
      let fraction = total_iterations % 1;
      return fraction * 100;
    },

    willCompleteAfter: function() {
      let growth = this.info();
      if(!growth) return 0;
      return growth.interval - this.progress() / 100 * growth.interval;
    },

    totalIterations: function(growth) {
      if(!growth) growth = this.info();
      if(!growth || !growth.started_at) return 0;

      let now = (new Date().getTime());
      let duration_in_seconds = (now - growth.started_at) / 1000;
      return duration_in_seconds / growth.interval;
    },

    _calcMinMax: function(result, growth) {
      if(growth.min && growth.min > result) {
        return growth.min;
      }
      if(growth.max && growth.max < result) {
        return growth.max;
      }
      return result;
    },

    _calcByTotalIterations: function(value, total_iterations, growth) {
      let result;
      if(growth.type == 'simple') {
        result = value + total_iterations * growth.increment;
      }
      if(growth.type == 'percent') {
        let percent = growth.increment / 100;
        let all_percents = percent * growth.base_value * total_iterations;
        result = value + all_percents;
      }
      if(growth.type == 'compound_interest') {
        let percent = (1 + growth.increment / 100);
        result = value * Math.pow(percent, total_iterations);
      }
      return result;
    },

    _getTotalIterationsWithLimit: function(growth) {
      let total_iterations = this.totalIterations(growth);

      if(!growth.max_iterations_count) return total_iterations;

      let total = total_iterations + (growth.completed_iterations_count || 0);
      if(total < growth.max_iterations_count) {
        return total_iterations;
      }
      
      return growth.max_iterations_count - (growth.completed_iterations_count || 0);
    },

    _calcValue: function(value, growth) {
      let total_iterations = this._getTotalIterationsWithLimit(growth);

      if(total_iterations < 1) return value;

      let fraction = total_iterations % 1;
      total_iterations = total_iterations - fraction;

      let result = this._calcByTotalIterations(value, total_iterations, growth);

      growth.completed_iterations_count = (growth.completed_iterations_count || 0) + total_iterations;
      
      result = this._calcMinMax(result, growth);
      
      this._updateIteration(growth, fraction * 1000);

      return result;
    },

    getValue: function(value) {
      let growth = this.info();
      if(!growth) return value;
      if(!growth.enabled) return value;

      let new_value = this._calcValue(value, growth);

      if(!new_value) return value;

      this.resource._set(new_value);  // Update value

      return new_value;
    },

    _updateIteration: function(growth, fraction) {
      if(!growth) growth = this.info();
      if(!growth) return false;

      let started_at = (new Date().getTime());
      if(fraction) started_at = started_at - fraction;

      growth.started_at = started_at;

      return Bot.setProperty(this.propName(), growth, 'json');
    },

    _updateBaseValue: function(base_value) {
      let growth = this.info();
      if(!growth) return false;

      growth.base_value = base_value;
      return Bot.setProperty(this.propName(), growth, 'json');
    },

    _newGrowth: function(options) {
      return {
        base_value: this.resource.baseValue(),
        increment: options.increment || 0,
        interval: options.interval || 60,
        type: options.type || 'simple',
        min: options.min || null,
        max: options.max || null,
        max_iterations_count: options.max_iterations_count || null,
        enabled: true,
        completed_iterations_count: 0
      };
    },

    _addAs: function(options) {
      let growth = this._newGrowth(options);
      growth.started_at = new Date().getTime();
      return Bot.setProperty(this.propName(), growth, 'json');
    },

    add: function(options) {
      options.type = 'simple';
      options.increment = options.value || 0;
      return this._addAs(options);
    },

    addPercent: function(options) {
      options.type = 'percent';
      options.increment = options.percent || 0;
      return this._addAs(options);
    },

    addCompoundInterest: function(options) {
      options.type = 'compound_interest';
      options.increment = options.percent || 0;
      return this._addAs(options);
    }
  };
};

const createResource = function(objName, objID, resName) {
  return {
    objName: objName,
    objID: objID,
    name: resName,
    growth: null,

    _setGrowth: function(growth) {
      this.growth = growth;
    },

    propName: function() {
      return libPrefix + this.objName + this.objID + '_' + this.name;
    },

    isNumber: function(value) { 
      return typeof value == 'number' && !isNaN(value);
    },

    verifyNumber: function(value) { 
      if(!this.isNumber(value)) {
        let evalue = '';
        if(typeof value != 'undefined') { 
          evalue = JSON.stringify(value); 
        }
        throw 'ResLib: value must be number only. It is not number: ' + typeof value + ' ' + evalue;
      }
      return value;
    },

    removeRes: function(res_amount) {
      this.set(this.value() - res_amount);
      return true;
    },

    baseValue: function() {
      let cur_value = Bot.getProperty(this.propName());
      if(typeof cur_value == 'undefined') return 0;
      
      // Ensure it's a number
      let numValue = parseFloat(cur_value);
      return isNaN(numValue) ? 0 : numValue;
    },

    value: function() {
      let cur_value = this.baseValue();

      if(this._withEnabledGrowth()) {
        return this.growth.getValue(cur_value);
      }
      return cur_value;
    },
    
    add: function(res_amount) {
      this.verifyNumber(res_amount);
      this.set(this.value() + res_amount);
      return true;
    },

    have: function(res_amount) {
      this.verifyNumber(res_amount);
      if(res_amount <= 0) return false;
      return this.value() >= res_amount;
    },
    
    remove: function(res_amount) {
      if(!this.have(res_amount)) {
        throw 'ResLib: not enough resources';
      }
      return this.removeRes(res_amount);
    },
    
    removeAnyway: function(res_amount) {
      this.verifyNumber(res_amount);
      return this.removeRes(res_amount);
    },

    _withEnabledGrowth: function() {
      return (this.growth && this.growth.isEnabled());
    },

    _set: function(res_amount) {
      this.verifyNumber(res_amount);
      Bot.setProperty(this.propName(), res_amount);
      return true;
    },

    set: function(res_amount) {
      this.verifyNumber(res_amount);

      if(this._withEnabledGrowth()) {
        this.growth._updateBaseValue(res_amount);
      }
      return this._set(res_amount);
    },

    anywayTakeFromAndTransferTo: function(fromResource, toResource, res_amount) {
      if(fromResource.name != toResource.name) {
        throw 'ResLib: can not transfer different resources';
      }

      if(fromResource.removeAnyway(res_amount)) {
        return toResource.add(res_amount);
      }
      return false;
    },

    anywayTakeFromAndTransferToDifferent: function(fromResource, toResource, remove_amount, add_amount) {
      if(fromResource.removeAnyway(remove_amount)) {
        return toResource.add(add_amount);
      }
      return false;
    },

    takeFromAndTransferTo: function(fromResource, toResource, res_amount) {
      if(!fromResource.have(res_amount)) {
        throw 'ResLib: not enough resources for transfer';
      }

      return this.anywayTakeFromAndTransferTo(fromResource, toResource, res_amount);
    },

    takeFromAndTransferToDifferent: function(fromResource, toResource, remove_amount, add_amount) {
      if(!fromResource.have(remove_amount)) {
        throw 'ResLib: not enough resources for transfer';
      }

      return this.anywayTakeFromAndTransferToDifferent(fromResource, toResource, remove_amount, add_amount);
    },

    takeFromAnother: function(anotherResource, res_amount) {
      return this.takeFromAndTransferTo(anotherResource, this, res_amount);
    },

    transferTo: function(anotherResource, res_amount) {
      return this.takeFromAndTransferTo(this, anotherResource, res_amount);
    },

    exchangeTo: function(anotherResource, options) {
      return this.takeFromAndTransferToDifferent(this, 
        anotherResource, options.remove_amount || 0, options.add_amount || 0);
    },

    takeFromAnotherAnyway: function(anotherResource, res_amount) {
      return this.anywayTakeFromAndTransferTo(anotherResource, this, res_amount);
    },

    transferToAnyway: function(anotherResource, res_amount) {
      return this.anywayTakeFromAndTransferTo(this, anotherResource, res_amount);
    }
  };
};

const createGrowth = function(resource) {
  let growth = createGrowthResource(resource);
  resource._setGrowth(growth);
  return growth;
};

const getResource = function(object, objectID, resName) {
  try {
    let res = createResource(object, objectID, resName);
    createGrowth(res);
    return res;
  } catch (e) {
    // Fallback for errors
    return {
      value: function() { return 0; },
      add: function() { return false; },
      have: function() { return false; },
      remove: function() { return false; },
      set: function() { return false; },
      baseValue: function() { return 0; }
    };
  }
};

// Global resource function
const getGlobalResource = function(resName) {
  return getResource('global', 'shared', resName);
};

const getUserResource = function(resName) {
  try {
    let telegramId = (user && user.telegramid) ? user.telegramid : 'unknown';
    return getResource('user', telegramId, resName);
  } catch (e) {
    return getResource('user', 'unknown', resName);
  }
};

const getChatResource = function(resName) {
  try {
    let chatId = (chat && chat.chatid) ? chat.chatid : 'unknown';
    return getResource('chat', chatId, resName);
  } catch (e) {
    return getResource('chat', 'unknown', resName);
  }
};

const getAnotherUserResource = function(resName, telegramid) {
  return getResource('user', telegramid || 'unknown', resName);
};

const getAnotherChatResource = function(resName, chatid) {
  return getResource('chat', chatid || 'unknown', resName);
};

module.exports = {
  userRes: getUserResource,
  chatRes: getChatResource,
  anotherUserRes: getAnotherUserResource,
  anotherChatRes: getAnotherChatResource,
  globalRes: getGlobalResource,
  growthFor: createGrowth
};