const libPrefix = 'ResourcesLib_';

const createGrowthResource = function(resource) {
  return {
    resource: resource,

    propName: function() { return this.resource.propName() + '_growth' },

    info: function() {
      return Bot.getProperty(this.propName()) || {}
    },

    title: function() {
      if(!this.isEnabled()) return;

      let growth = this.info();
      let startText = 'add ' + String(growth.increment);
      let middleText = ' once at ' + String(growth.interval) + ' secs';

      if(growth.type === 'simple') return startText + middleText;
      if(growth.type === 'percent') return startText + '%' + middleText;
      if(growth.type === 'compound_interest') return startText + '%' + middleText + ' with reinvesting';
    },

    have: function() { return this.info() },

    isEnabled: function() {
      let growth = this.info();
      return growth ? growth.enabled : false;
    },
    
    _toggle: function(status) {
      let growth = this.info();
      if(!growth) return;
      growth.enabled = status;
      return Bot.setProperty(this.propName(), growth, 'json');
    },

    stop: function() { return this._toggle(false) },

    progress: function() {
      let growth = this.info();
      if(!growth) return;
      let totalIterations = this.totalIterations(growth);
      let fraction = totalIterations % 1;
      return fraction * 100;
    },

    willCompleteAfter: function() {
      return this.info().interval - this.progress() / 100 * this.info().interval;
    },

    totalIterations: function(growth) {
      if(!growth) growth = this.info();
      let now = (new Date().getTime());
      let durationInSeconds = (now - growth.started_at) / 1000;
      return durationInSeconds / growth.interval;
    },

    _calcMinMax: function(result, growth) {
      if(growth.min && growth.min > result) return growth.min;
      if(growth.max && growth.max < result) return growth.max;
      return result;
    },

    _calcByTotalIterations: function(value, totalIterations, growth) {
      let result;
      if(growth.type === 'simple') result = value + totalIterations * growth.increment;
      if(growth.type === 'percent') {
        let percent = growth.increment / 100;
        let allPercents = percent * growth.base_value * totalIterations;
        result = value + allPercents;
      }
      if(growth.type === 'compound_interest') {
        let percent = (1 + growth.increment / 100);
        result = value * Math.pow(percent, totalIterations);
      }
      return result;
    },

    _getTotalIterationsWithLimit: function(growth) {
      let totalIterations = this.totalIterations(growth);
      if(!growth.max_iterations_count) return totalIterations;

      let total = totalIterations + growth.completed_iterations_count;
      return total < growth.max_iterations_count ? totalIterations : growth.max_iterations_count - growth.completed_iterations_count;
    },

    _calcValue: function(value, growth) {
      let totalIterations = this._getTotalIterationsWithLimit(growth);
      if(totalIterations < 1) return;

      let fraction = totalIterations % 1;
      totalIterations = totalIterations - fraction;

      let result = this._calcByTotalIterations(value, totalIterations, growth);
      growth.completed_iterations_count += totalIterations;
      result = this._calcMinMax(result, growth);
      this._updateIteration(growth, fraction * 1000);
      return result;
    },

    getValue: function(value) {
      let growth = this.info();
      if(!growth || !growth.enabled) return value;
      let newValue = this._calcValue(value, growth);
      if(!newValue) return value;
      this.resource._set(newValue);
      return newValue;
    },

    _updateIteration: function(growth, fraction) {
      if(!growth) growth = this.info();
      if(!growth) return;

      let startedAt = (new Date().getTime());
      if(fraction) startedAt = startedAt - fraction;
      growth.started_at = startedAt;
      return Bot.setProperty(this.propName(), growth, 'json');
    },

    _updateBaseValue: function(baseValue) {
      let growth = this.info();
      if(!growth) return;
      growth.base_value = baseValue;
      return Bot.setProperty(this.propName(), growth, 'json');
    },

    _newGrowth: function(options) {
      return {
        base_value: this.resource.baseValue(),
        increment: options.increment,
        interval: options.interval,
        type: options.type,
        min: options.min,
        max: options.max,
        max_iterations_count: options.max_iterations_count,
        enabled: true,
        completed_iterations_count: 0
      }
    },

    _addAs: function(options) {
      let growth = this._newGrowth(options);
      return this._updateIteration(growth);
    },

    add: function(options) {
      options.type = 'simple';
      options.increment = options.value;
      return this._addAs(options);
    },

    addPercent: function(options) {
      options.type = 'percent';
      options.increment = options.percent;
      return this._addAs(options);
    },

    addCompoundInterest: function(options) {
      options.type = 'compound_interest';
      options.increment = options.percent;
      return this._addAs(options);
    }
  }
};

const createResource = function(objName, objID, resName) {
  return {
    objName: objName,
    objID: objID,
    name: resName,
    growth: null,

    _setGrowth: function(growth) { this.growth = growth },

    propName: function() { return libPrefix + this.objName + this.objID + '_' + this.name },

    isNumber: function(value) { 
      if (typeof value === 'string' && !isNaN(value)) {
        return true;
      }
      return typeof value === 'number';
    },

    _convertToNumber: function(value) {
      if (typeof value === 'string' && !isNaN(value)) {
        return parseFloat(value);
      }
      return value;
    },

    verifyNumber: function(value) {
      value = this._convertToNumber(value);
      if(!this.isNumber(value)) {
        let evalue = typeof value !== 'undefined' ? JSON.stringify(value) : '';
        throw 'ResLib: value must be number only. It is not number: ' + typeof value + ' ' + evalue;
      }
      return value;
    },

    removeRes: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      this.set(this.value() - resAmount);
      return true;
    },

    baseValue: function() {
      let curValue = Bot.getProperty(this.propName());
      return typeof curValue !== 'undefined' ? curValue : 0;
    },

    value: function() {
      let curValue = this.baseValue();
      return this._withEnabledGrowth() ? this.growth.getValue(curValue) : curValue;
    },
    
    add: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      this.set(this.value() + resAmount);
      return true;
    },

    have: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return resAmount > 0 && this.value() >= resAmount;
    },
    
    remove: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      if(!this.have(resAmount)) throw 'ResLib: not enough resources';
      return this.removeRes(resAmount);
    },
    
    removeAnyway: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return this.removeRes(resAmount);
    },

    _withEnabledGrowth: function() { return this.growth && this.growth.isEnabled() },

    _set: function(resAmount) { 
      resAmount = this.verifyNumber(resAmount);
      Bot.setProperty(this.propName(), resAmount, 'float') 
    },

    set: function(resAmount) {
      resAmount = this.verifyNumber(resAmount);
      if(this._withEnabledGrowth()) this.growth._updateBaseValue(resAmount);
      return this._set(resAmount);
    },

    anywayTakeFromAndTransferTo: function(fromResource, toResource, resAmount) {
      resAmount = this.verifyNumber(resAmount);
      if(fromResource.name !== toResource.name) throw 'ResLib: can not transfer different resources';
      if(fromResource.removeAnyway(resAmount)) return toResource.add(resAmount);
      return false;
    },

    anywayTakeFromAndTransferToDifferent: function(fromResource, toResource, removeAmount, addAmount) {
      removeAmount = this.verifyNumber(removeAmount);
      addAmount = this.verifyNumber(addAmount);
      if(fromResource.removeAnyway(removeAmount)) return toResource.add(addAmount);
      return false;
    },

    takeFromAndTransferTo: function(fromResource, toResource, resAmount) {
      resAmount = this.verifyNumber(resAmount);
      if(!fromResource.have(resAmount)) throw 'ResLib: not enough resources for transfer';
      return this.anywayTakeFromAndTransferTo(fromResource, toResource, resAmount);
    },

    takeFromAndTransferToDifferent: function(fromResource, toResource, removeAmount, addAmount) {
      removeAmount = this.verifyNumber(removeAmount);
      addAmount = this.verifyNumber(addAmount);
      if(!fromResource.have(removeAmount)) throw 'ResLib: not enough resources for transfer';
      return this.anywayTakeFromAndTransferToDifferent(fromResource, toResource, removeAmount, addAmount);
    },

    takeFromAnother: function(anotherResource, resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return this.takeFromAndTransferTo(anotherResource, this, resAmount);
    },

    transferTo: function(anotherResource, resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return this.takeFromAndTransferTo(this, anotherResource, resAmount);
    },

    exchangeTo: function(anotherResource, options) {
      options.remove_amount = this.verifyNumber(options.remove_amount);
      options.add_amount = this.verifyNumber(options.add_amount);
      return this.takeFromAndTransferToDifferent(this, anotherResource, options.remove_amount, options.add_amount);
    },

    takeFromAnotherAnyway: function(anotherResource, resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return this.anywayTakeFromAndTransferTo(anotherResource, this, resAmount);
    },

    transferToAnyway: function(anotherResource, resAmount) {
      resAmount = this.verifyNumber(resAmount);
      return this.anywayTakeFromAndTransferTo(this, anotherResource, resAmount);
    }
  }
};

const createGrowth = function(resource) {
  let growth = createGrowthResource(resource);
  resource._setGrowth(growth);
  return growth;
};

const getResource = function(object, objectID, resName) {
  let res = createResource(object, objectID, resName);
  createGrowth(res);
  return res;
};

const getUserResource = function(resName) {
  return getResource('user', user.telegramid, resName);
};

const getChatResource = function(resName) {
  return getResource('chat', chat.chatid, resName);
};

const getAnotherUserResource = function(resName, telegramid) {
  return getResource('user', telegramid, resName);
};

const getAnotherChatResource = function(resName, chatid) {
  return getResource('chat', chatid, resName);
};

module.exports = {
  userRes: getUserResource,
  chatRes: getChatResource,
  anotherUserRes: getAnotherUserResource,
  anotherChatRes: getAnotherChatResource,
  growthFor: createGrowth
};
