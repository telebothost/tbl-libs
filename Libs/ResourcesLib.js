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
    
    _updateBaseValue(v) {
      const g = this.info()
      if (!g || Object.keys(g).length === 0) return false
      g.base_value = v
      Bot.setProperty(this.propName(), g)
      return true
    },
    
    getValue(v) {
      const g = this.info()
      if (!g || !g.enabled || !g.started_at) return v
      return v
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
      const val = Bot.getProperty(this.propName())
      return this.verifyNumber(val)
    },
    
    _set(v) {
      v = this.verifyNumber(v)
      Bot.setProperty(this.propName(), v)
      return true
    },
    
    value() {
      const base = this.baseValue()
      if (this.growth && this.growth.isEnabled && this.growth.isEnabled())
        return this.growth.getValue(base)
      return base
    },
    
    set(v) {
      v = this.verifyNumber(v)
      if (this.growth && this.growth.isEnabled && this.growth._updateBaseValue)
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
    }
  }
}

const createGrowth = function(resource) {
  const g = createGrowthResource(resource)
  resource._setGrowth(g)
  return g
}

const getResource = function(obj, id, res) {
  const r = createResource(obj, id, res)
  createGrowth(r)
  return r
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