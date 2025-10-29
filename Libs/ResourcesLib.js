const libPrefix = 'ResourcesLib_';

const createGrowthResource = function(resource) {
  return {
    resource: resource,

    propName: function() { 
      return (this.resource.propName() || '') + '_growth' 
    },

    info: function() {
      try {
        return Bot.getProperty(this.propName()) || {};
      } catch (e) {
        return {};
      }
    },

    title: function() {
      if(!this.isEnabled()) return '';

      let growth = this.info();
      let increment = growth.increment || 0;
      let interval = growth.interval || 0;
      let startText = 'add ' + String(increment);
      let middleText = ' once at ' + String(interval) + ' secs';

      if(growth.type === 'simple') return startText + middleText;
      if(growth.type === 'percent') return startText + '%' + middleText;
      if(growth.type === 'compound_interest') return startText + '%' + middleText + ' with reinvesting';
      
      return '';
    },

    have: function() { 
      let info = this.info();
      return info && Object.keys(info).length > 0;
    },

    isEnabled: function() {
      let growth = this.info();
      return growth ? (growth.enabled === true) : false;
    },
    
    _toggle: function(status) {
      let growth = this.info();
      if(!growth || Object.keys(growth).length === 0) return false;
      growth.enabled = status;
      try {
        Bot.setProperty(this.propName(), growth, 'json');
        return true;
      } catch (e) {
        return false;
      }
    },

    stop: function() { 
      return this._toggle(false); 
    },

    progress: function() {
      let growth = this.info();
      if(!growth || Object.keys(growth).length === 0) return 0;
      let totalIterations = this.totalIterations(growth);
      let fraction = totalIterations % 1;
      return fraction * 100;
    },

    willCompleteAfter: function() {
      let growth = this.info();
      if(!growth || Object.keys(growth).length === 0) return 0;
      let interval = growth.interval || 0;
      return interval - this.progress() / 100 * interval;
    },

    totalIterations: function(growth) {
      if(!growth) growth = this.info();
      if(!growth || !growth.started_at) return 0;
      
      let now = (new Date().getTime());
      let startedAt = growth.started_at || now;
      let interval = growth.interval || 1;
      let durationInSeconds = (now - startedAt) / 1000;
      return durationInSeconds / interval;
    },

    _calcMinMax: function(result, growth) {
      if(!growth) return result;
      if(typeof growth.min === 'number' && growth.min > result) return growth.min;
      if(typeof growth.max === 'number' && growth.max < result) return growth.max;
      return result;
    },

    _calcByTotalIterations: function(value, totalIterations, growth) {
      if(!growth) return value;
      
      let result = value;
      let increment = growth.increment || 0;
      let baseValue = growth.base_value || value;
      
      if(growth.type === 'simple') {
        result = value + totalIterations * increment;
      } else if(growth.type === 'percent') {
        let percent = increment / 100;
        let allPercents = percent * baseValue * totalIterations;
        result = value + allPercents;
      } else if(growth.type === 'compound_interest') {
        let percent = (1 + increment / 100);
        result = value * Math.pow(percent, totalIterations);
      }
      return result;
    },

    _getTotalIterationsWithLimit: function(growth) {
      if(!growth) return 0;
      
      let totalIterations = this.totalIterations(growth);
      if(!growth.max_iterations_count) return totalIterations;

      let completedCount = growth.completed_iterations_count || 0;
      let total = totalIterations + completedCount;
      return total < growth.max_iterations_count ? totalIterations : growth.max_iterations_count - completedCount;
    },

    _calcValue: function(value, growth) {
      if(!growth || Object.keys(growth).length === 0) return value;
      
      let totalIterations = this._getTotalIterationsWithLimit(growth);
      if(totalIterations < 1) return value;

      let fraction = totalIterations % 1;
      totalIterations = totalIterations - fraction;

      let result = this._calcByTotalIterations(value, totalIterations, growth);
      growth.completed_iterations_count = (growth.completed_iterations_count || 0) + totalIterations;
      result = this._calcMinMax(result, growth);
      this._updateIteration(growth, fraction * 1000);
      return result;
    },

    getValue: function(value) {
      let growth = this.info();
      if(!growth || !growth.enabled) return value;
      let newValue = this._calcValue(value, growth);
      if(typeof newValue !== 'number' || isNaN(newValue)) return value;
      this.resource._set(newValue);
      return newValue;
    },

    _updateIteration: function(growth, fraction) {
      if(!growth) growth = this.info();
      if(!growth || Object.keys(growth).length === 0) return false;

      let startedAt = (new Date().getTime());
      if(fraction) startedAt = startedAt - fraction;
      growth.started_at = startedAt;
      try {
        Bot.setProperty(this.propName(), growth, 'json');
        return true;
      } catch (e) {
        return false;
      }
    },

    _updateBaseValue: function(baseValue) {
      let growth = this.info();
      if(!growth || Object.keys(growth).length === 0) return false;
      growth.base_value = baseValue;
      try {
        Bot.setProperty(this.propName(), growth, 'json');
        return true;
      } catch (e) {
        return false;
      }
    },

    _newGrowth: function(options) {
      options = options || {};
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
      try {
        Bot.setProperty(this.propName(), growth, 'json');
        return true;
      } catch (e) {
        return false;
      }
    },

    add: function(options) {
      options = options || {};
      options.type = 'simple';
      options.increment = options.value || 0;
      return this._addAs(options);
    },

    addPercent: function(options) {
      options = options || {};
      options.type = 'percent';
      options.increment = options.percent || 0;
      return this._addAs(options);
    },

    addCompoundInterest: function(options) {
      options = options || {};
      options.type = 'compound_interest';
      options.increment = options.percent || 0;
      return this._addAs(options);
    }
  };
};

const createResource = function(objName, objID, resName) {
  // Safe parameter handling
  objName = objName || 'unknown';
  objID = objID || '0';
  resName = resName || 'resource';
  
  return {
    objName: objName,
    objID: objID,
    name: resName,
    growth: null,

    _setGrowth: function(growth) { 
      this.growth = growth; 
    },

    propName: function() { 
      return libPrefix + (this.objName || '') + (this.objID || '') + '_' + (this.name || ''); 
    },

    _convertToNumber: function(value) {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'string') {
        let parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      if (typeof value === 'number') return value;
      return 0;
    },

    isNumber: function(value) {
      value = this._convertToNumber(value);
      return typeof value === 'number' && !isNaN(value);
    },

    verifyNumber: function(value) {
      if (value === null || value === undefined) return 0;
      
      let converted = this._convertToNumber(value);
      if (isNaN(converted)) {
        return 0;
      }
      return converted;
    },

    removeRes: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      let currentValue = this.value();
      this.set(currentValue - resAmount);
      return true;
    },

    baseValue: function() {
      try {
        let curValue = Bot.getProperty(this.propName());
        return this.verifyNumber(curValue);
      } catch (e) {
        return 0;
      }
    },

    value: function() {
      try {
        let curValue = this.baseValue();
        if (this._withEnabledGrowth() && this.growth) {
          return this.growth.getValue(curValue);
        }
        return curValue;
      } catch (e) {
        return 0;
      }
    },
    
    add: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      let currentValue = this.value();
      this.set(currentValue + resAmount);
      return true;
    },

    have: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      let currentValue = this.value();
      return resAmount > 0 && currentValue >= resAmount;
    },
    
    remove: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      if(!this.have(resAmount)) return false;
      return this.removeRes(resAmount);
    },
    
    removeAnyway: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return this.removeRes(resAmount);
    },

    _withEnabledGrowth: function() { 
      return this.growth && this.growth.isEnabled && this.growth.isEnabled();
    },

    _set: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      try {
        Bot.setProperty(this.propName(), resAmount);
        return true;
      } catch (e) {
        return false;
      }
    },

    set: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      if(this._withEnabledGrowth() && this.growth && this.growth._updateBaseValue) {
        this.growth._updateBaseValue(resAmount);
      }
      return this._set(resAmount);
    },

    anywayTakeFromAndTransferTo: function(fromResource, toResource, resAmount) {
      if(!fromResource || !toResource) return false;
      if(fromResource.name !== toResource.name) return false;
      if(fromResource.removeAnyway(resAmount)) return toResource.add(resAmount);
      return false;
    },

    anywayTakeFromAndTransferToDifferent: function(fromResource, toResource, removeAmount, addAmount) {
      if(!fromResource || !toResource) return false;
      if(fromResource.removeAnyway(removeAmount)) return toResource.add(addAmount);
      return false;
    },

    takeFromAndTransferTo: function(fromResource, toResource, resAmount) {
      if(!fromResource || !toResource) return false;
      if(!fromResource.have(resAmount)) return false;
      return this.anywayTakeFromAndTransferTo(fromResource, toResource, resAmount);
    },

    takeFromAndTransferToDifferent: function(fromResource, toResource, removeAmount, addAmount) {
      if(!fromResource || !toResource) return false;
      if(!fromResource.have(removeAmount)) return false;
      return this.anywayTakeFromAndTransferToDifferent(fromResource, toResource, removeAmount, addAmount);
    },

    takeFromAnother: function(anotherResource, resAmount) {
      return this.takeFromAndTransferTo(anotherResource, this, resAmount);
    },

    transferTo: function(anotherResource, resAmount) {
      return this.takeFromAndTransferTo(this, anotherResource, resAmount);
    },

    exchangeTo: function(anotherResource, options) {
      if(!options) return false;
      return this.takeFromAndTransferToDifferent(this, anotherResource, options.remove_amount || 0, options.add_amount || 0);
    },

    takeFromAnotherAnyway: function(anotherResource, resAmount) {
      return this.anywayTakeFromAndTransferTo(anotherResource, this, resAmount);
    },

    transferToAnyway: function(anotherResource, resAmount) {
      return this.anywayTakeFromAndTransferTo(this, anotherResource, resAmount);
    }
  };
};

const createGrowth = function(resource) {
  try {
    let growth = createGrowthResource(resource);
    resource._setGrowth(growth);
    return growth;
  } catch (e) {
    return null;
  }
};

const getResource = function(object, objectID, resName) {
  try {
    let res = createResource(object, objectID, resName);
    createGrowth(res);
    return res;
  } catch (e) {
    // demo response so your code wouldn\'t crash anymore 
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

// Global resource - accessible by all users
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
  globalRes: getGlobalResource, // New global resource function
  growthFor: createGrowth
};

/*
Here a problem 


const globalCoins = Libs.ResourcesLib.globalRes("total_coins");
Bot.inspect(globalCoins.value())
globalCoins.add(60)
Bot.inspect(globalCoins.value())

first should print 0 its working 
then adding 60 
then it giving 0 again 

but next time 60 first then 0 again 
*/