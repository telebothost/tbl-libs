const libPrefix = 'ResourcesLib_'

const createGrowthResource = function(resource) {
  return {
    resource,

    propName() {
      return (this.resource.propName() || '') + '_growth'
    },

    info() {
      try {
        return Bot.getProperty(this.propName()) || {}
      } catch {
        return {}
      }
    },

    isEnabled() {
      const g = this.info()
      return g && g.enabled === true
    },

    have() {
      const g = this.info()
      return g && Object.keys(g).length > 0
    },

    title() {
      if (!this.isEnabled()) return ''
      const g = this.info()
      const inc = g.increment || 0
      const intv = g.interval || 0
      const t = g.type
      if (t === 'simple') return `add ${inc} once at ${intv}s`
      if (t === 'percent') return `add ${inc}% once at ${intv}s`
      if (t === 'compound_interest') return `add ${inc}% once at ${intv}s with reinvesting`
      return ''
    },

    _toggle(s) {
      const g = this.info()
      if (!g || Object.keys(g).length === 0) return false
      g.enabled = s
      try {
        Bot.setProperty(this.propName(), g, 'json')
        return true
      } catch {
        return false
      }
    },

    stop() {
      return this._toggle(false)
    },

    totalIterations(g) {
      if (!g) g = this.info()
      if (!g || !g.started_at) return 0
      const now = Date.now()
      const start = g.started_at || now
      const interval = g.interval || 1
      return (now - start) / 1000 / interval
    },

    _calcMinMax(v, g) {
      if (!g) return v
      if (typeof g.min === 'number' && v < g.min) v = g.min
      if (typeof g.max === 'number' && v > g.max) v = g.max
      return v
    },

    _calcByTotalIterations(v, t, g) {
      const inc = g.increment || 0
      const base = g.base_value || v
      if (g.type === 'simple') return v + t * inc
      if (g.type === 'percent') return v + base * (inc / 100) * t
      if (g.type === 'compound_interest') return v * Math.pow(1 + inc / 100, t)
      return v
    },

    _getTotalIterationsWithLimit(g) {
      if (!g) return 0
      const t = this.totalIterations(g)
      if (!g.max_iterations_count) return t
      const done = g.completed_iterations_count || 0
      return Math.min(t, g.max_iterations_count - done)
    },

    _calcValue(v, g) {
      if (!g || Object.keys(g).length === 0) return v
      let t = this._getTotalIterationsWithLimit(g)
      if (t < 1) return v
      const frac = t % 1
      t -= frac
      let res = this._calcByTotalIterations(v, t, g)
      g.completed_iterations_count = (g.completed_iterations_count || 0) + t
      res = this._calcMinMax(res, g)
      this._updateIteration(g, frac * 1000)
      return res
    },

    getValue(v) {
      const g = this.info()
      if (!g || !g.enabled || !g.started_at) return v
      const newV = this._calcValue(v, g)
      if (typeof newV !== 'number' || isNaN(newV)) return v
      this.resource._set(newV)
      return newV
    },

    _updateIteration(g, f) {
      if (!g) g = this.info()
      if (!g || Object.keys(g).length === 0) return false
      let start = Date.now()
      if (f) start -= f
      g.started_at = start
      try {
        Bot.setProperty(this.propName(), g, 'json')
        return true
      } catch {
        return false
      }
    },

    _updateBaseValue(v) {
      const g = this.info()
      if (!g || Object.keys(g).length === 0) return false
      g.base_value = v
      try {
        Bot.setProperty(this.propName(), g, 'json')
        return true
      } catch {
        return false
      }
    },

    _newGrowth(o = {}) {
      return {
        base_value: this.resource.baseValue(),
        increment: o.increment || 0,
        interval: o.interval || 60,
        type: o.type || 'simple',
        min: o.min || null,
        max: o.max || null,
        max_iterations_count: o.max_iterations_count || null,
        enabled: true,
        completed_iterations_count: 0,
        started_at: Date.now()
      }
    },

    _addAs(o) {
      const g = this._newGrowth(o)
      try {
        Bot.setProperty(this.propName(), g, 'json')
        return true
      } catch {
        return false
      }
    },

    add(o = {}) {
      o.type = 'simple'
      o.increment = o.value || 0
      return this._addAs(o)
    },

    addPercent(o = {}) {
      o.type = 'percent'
      o.increment = o.percent || 0
      return this._addAs(o)
    },

    addCompoundInterest(o = {}) {
      o.type = 'compound_interest'
      o.increment = o.percent || 0
      return this._addAs(o)
    }
  }
}

const createResource = function(objName = 'unknown', objID = '0', resName = 'resource') {
  return {
    objName,
    objID,
    name: resName,
    growth: null,

    _setGrowth(g) {
      this.growth = g
    },

    propName() {
      return libPrefix + this.objName + this.objID + '_' + this.name
    },

    _num(v) {
      if (v === null || v === undefined) return 0
      if (typeof v === 'string') {
        const p = parseFloat(v)
        return isNaN(p) ? 0 : p
      }
      return typeof v === 'number' ? v : 0
    },

    verifyNumber(v) {
      return this._num(v)
    },

    baseValue() {
      try {
        return this.verifyNumber(Bot.getProperty(this.propName()))
      } catch {
        return 0
      }
    },

    _withEnabledGrowth() {
      return this.growth && this.growth.isEnabled && this.growth.isEnabled()
    },

    _set(v) {
      v = this.verifyNumber(v)
      try {
        Bot.setProperty(this.propName(), v, 'float')
        return true
      } catch {
        return false
      }
    },

    value() {
      try {
        const v = this.baseValue()
        const g = this.growth ? this.growth.info() : null
        if (g && g.enabled === true) return this.growth.getValue(v)
        return v
      } catch {
        return 0
      }
    },

    set(v) {
      v = this.verifyNumber(v)
      if (this._withEnabledGrowth() && this.growth._updateBaseValue)
        this.growth._updateBaseValue(v)
      return this._set(v)
    },

    add(v) {
      v = this.verifyNumber(v)
      return this.set(this.value() + v)
    },

    have(v) {
      v = this.verifyNumber(v)
      return v > 0 && this.value() >= v
    },

    remove(v) {
      v = this.verifyNumber(v)
      if (!this.have(v)) return false
      return this.set(this.value() - v)
    },

    removeAnyway(v) {
      v = this.verifyNumber(v)
      return this.set(this.value() - v)
    },

    anywayTakeFromAndTransferTo(from, to, v) {
      if (!from || !to || from.name !== to.name) return false
      if (from.removeAnyway(v)) return to.add(v)
      return false
    },

    anywayTakeFromAndTransferToDifferent(from, to, rm, add) {
      if (!from || !to) return false
      if (from.removeAnyway(rm)) return to.add(add)
      return false
    },

    takeFromAndTransferTo(from, to, v) {
      if (!from || !to || !from.have(v)) return false
      return this.anywayTakeFromAndTransferTo(from, to, v)
    },

    takeFromAndTransferToDifferent(from, to, rm, add) {
      if (!from || !to || !from.have(rm)) return false
      return this.anywayTakeFromAndTransferToDifferent(from, to, rm, add)
    },

    takeFromAnother(another, v) {
      return this.takeFromAndTransferTo(another, this, v)
    },

    transferTo(another, v) {
      return this.takeFromAndTransferTo(this, another, v)
    },

    exchangeTo(another, o) {
      if (!o) return false
      return this.takeFromAndTransferToDifferent(this, another, o.remove_amount || 0, o.add_amount || 0)
    },

    takeFromAnotherAnyway(another, v) {
      return this.anywayTakeFromAndTransferTo(another, this, v)
    },

    transferToAnyway(another, v) {
      return this.anywayTakeFromAndTransferTo(this, another, v)
    }
  }
}

const createGrowth = function(resource) {
  try {
    const g = createGrowthResource(resource)
    resource._setGrowth(g)
    return g
  } catch {
    return null
  }
}

const getResource = function(obj, id, res) {
  try {
    const r = createResource(obj, id, res)
    createGrowth(r)
    return r
  } catch {
    return {
      value: () => 0,
      add: () => false,
      have: () => false,
      remove: () => false,
      set: () => false,
      baseValue: () => 0
    }
  }
}

const getGlobalResource = res => getResource('global', 'shared', res)
const getUserResource = res => {
  const id = user && user.telegramid ? user.telegramid : 'unknown'
  return getResource('user', id, res)
}
const getChatResource = res => {
  const id = chat && chat.chatid ? chat.chatid : 'unknown'
  return getResource('chat', id, res)
}
const getAnotherUserResource = (res, id) => getResource('user', id || 'unknown', res)
const getAnotherChatResource = (res, id) => getResource('chat', id || 'unknown', res)

module.exports = {
  userRes: getUserResource,
  chatRes: getChatResource,
  anotherUserRes: getAnotherUserResource,
  anotherChatRes: getAnotherChatResource,
  globalRes: getGlobalResource,
  growthFor: createGrowth
}