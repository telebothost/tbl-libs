const LIB_PREFIX = 'REFLIB_';

let trackOptions = {};

// Fast event emitter with error handling
function emitEvent(eventName, params = {}) {
  const handler = trackOptions[eventName];
  if (handler) {
    try {
      handler(params);
      return true;
    } catch (e) {
      // Silent fail for event errors to not break referral tracking
    }
  }
  return false;
}

// Optimized property operations
function getProp(propName, userId = user.id) {
  return User.get(LIB_PREFIX + propName + (userId ? '_' + userId : ''));
}

function setProp(propName, value, userId = user.id, type = 'json') {
  User.set(LIB_PREFIX + propName + (userId ? '_' + userId : ''), value, type);
}

function delProp(propName, userId = user.id) {
  User.del(LIB_PREFIX + propName + (userId ? '_' + userId : ''));
}

// Fast reference list operations
function getRefList(userId = user.id) {
  return getProp('refs', userId) || [];
}

function setRefList(userId, refList) {
  setProp('refs', refList, userId);
}

function addToRefList(userId, refUser) {
  const refList = getRefList(userId);
  
  // Fast existence check using object map for O(1) lookup
  const existingIds = {};
  refList.forEach(ref => { existingIds[ref.id] = true; });
  
  if (!existingIds[refUser.id]) {
    refList.push({
      id: refUser.id,
      username: refUser.username || '',
      first_name: refUser.first_name || '',
      last_name: refUser.last_name || '',
      date: Date.now() // Faster than ISO string
    });
    setRefList(userId, refList);
    return true;
  }
  return false;
}

// Optimized top list with caching
let topListCache = null;
function getTopList() {
  if (topListCache) return topListCache;
  topListCache = Bot.get(LIB_PREFIX + 'top') || {};
  return topListCache;
}

function updateTopList(userId, count) {
  const topList = getTopList();
  topList[userId] = count;
  Bot.set(LIB_PREFIX + 'top', topList, 'json');
  topListCache = topList; // Update cache
}

// Fast referral count operations
function getRefCount(userId = user.id) {
  return getProp('count', userId) || 0;
}

function setRefCount(userId, count) {
  setProp('count', count, userId, 'number');
  updateTopList(userId, count);
}

function incrementRefCount(userId) {
  const count = getRefCount(userId) + 1;
  setRefCount(userId, count);
  return count;
}

// Core referral logic
function storeReferrerInfo(refUserId) {
  const refUserKey = LIB_PREFIX + 'ref_' + refUserId;
  Bot.set(refUserKey, {
    id: refUserId,
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    telegramid: user.telegramid || user.id
  }, 'json');
}

function getReferrerInfo(refUserId) {
  const refUserKey = LIB_PREFIX + 'ref_' + refUserId;
  return Bot.get(refUserKey);
}

function setReferral(refUserId) {
  // Store current user as referrer info for future use
  storeReferrerInfo(user.id);
  
  // Add to referrer's list and update count
  const wasAdded = addToRefList(refUserId, user);
  if (wasAdded) {
    const newCount = incrementRefCount(refUserId);
    
    // Store who attracted current user
    const referrer = getReferrerInfo(refUserId);
    if (referrer) {
      setProp('by', referrer);
      emitEvent('onAttracted', { 
        referrer: referrer,
        newCount: newCount,
        newUser: user
      });
    }
  }
}

// Fast validation functions
function isAlreadyAttracted() {
  return !!getProp('by') || !!getProp('old');
}

function extractRefId() {
  if (!params || typeof params !== 'string') return null;
  
  const prefixes = Bot.get(LIB_PREFIX + 'prefixes') || ['user'];
  const validPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes];
  
  for (const prefix of validPrefixes) {
    if (params.startsWith(prefix)) {
      const refId = parseInt(params.slice(prefix.length));
      if (!isNaN(refId) && refId > 0) return refId;
    }
  }
  return null;
}

function isValidRefLink() {
  if (!message || !message.startsWith('/start') || !params) return false;
  return extractRefId() !== null;
}

// Main tracking function - optimized
function trackRef() {
  const refId = extractRefId();
  if (!refId) {
    setProp('old', true, user.id, 'boolean');
    return;
  }

  // Prevent self-referral
  if (refId === user.id) {
    emitEvent('onTouchOwnLink', { user: user });
    return;
  }
  
  // Check if already attracted
  if (isAlreadyAttracted()) {
    const referrer = getProp('by');
    emitEvent('onAlreadyAttracted', { 
      referringUser: refId,
      currentReferrer: referrer 
    });
    return;
  }
  
  // Process new referral
  setReferral(refId);
}

// Public API functions
function getRefLink(botName = bot.name, prefix = 'user') {
  // Store current user info for referral tracking
  storeReferrerInfo(user.id);
  
  // Update prefixes list
  let currentPrefixes = Bot.get(LIB_PREFIX + 'prefixes') || [];
  if (!Array.isArray(currentPrefixes)) currentPrefixes = [currentPrefixes];
  if (!currentPrefixes.includes(prefix)) {
    currentPrefixes.push(prefix);
    Bot.set(LIB_PREFIX + 'prefixes', currentPrefixes, 'json');
  }

  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function track(options = {}) {
  trackOptions = options;
  
  // Only track if it's a deep link start command
  if (message && message.startsWith('/start') && params) {
    trackRef();
  } else {
    // Mark as existing user for future visits
    setProp('old', true, user.id, 'boolean');
  }
}

function getAttractedBy() {
  return getProp('by');
}

function getRefList(userId = user.id) {
  return getProp('refs', userId) || [];
}

function getRefCount(userId = user.id) {
  return getProp('count', userId) || 0;
}

function getTopList() {
  return Bot.get(LIB_PREFIX + 'top') || {};
}

// Reset cache when bot properties change
function clearCache() {
  topListCache = null;
}

// Export public API
module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy,
  clearCache: clearCache
};
