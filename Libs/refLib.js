const LIB_PREFIX = 'REFLIB_';

let trackOptions = {};

function emitEvent(eventName, params = {}) {
  const handler = trackOptions[eventName];
  if (handler) {
    handler(params);
    return true;
  }
  return false;
}

function getProp(propName, userId = user.id) {
  return User.get(LIB_PREFIX + propName, userId);
}

function setProp(propName, value, userId = user.id, type = 'json') {
  User.set(LIB_PREFIX + propName, value, userId, type);
}

function getRefList(userId = user.id) {
  return getProp('refList', userId) || [];
}

function setRefList(userId, refList) {
  setProp('refList', refList, userId);
}

function getTopList() {
  return Bot.get(LIB_PREFIX + 'topList') || {};
}

function updateTopList(userId, refsCount) {
  const topList = getTopList();
  topList[userId] = refsCount;
  Bot.set(LIB_PREFIX + 'topList', topList, 'json');
}

function addReferral(userId) {
  const refList = getRefList(userId);
  const existingRef = refList.find(ref => ref.id === user.id);
  
  if (!existingRef) {
    refList.push({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name || "",
      date: new Date().toISOString()
    });
    setRefList(userId, refList);
    return true;
  }
  return false;
}

function getRefCount(userId = user.id) {
  return getProp('refsCount', userId) || 0;
}

function updateRefCount(userId) {
  const currentCount = getRefCount(userId);
  const newCount = currentCount + 1;
  setProp('refsCount', newCount, userId, 'number');
  updateTopList(userId, newCount);
  return newCount;
}

function setReferral(refUserId) {
  // Check if user is referring themselves
  if (refUserId === user.id) {
    emitEvent('onTouchOwnLink', { user: user });
    return false;
  }
  
  // Check if already attracted
  if (isAlreadyAttracted()) {
    emitEvent('onAlreadyAttracted', { referringUser: refUserId });
    return false;
  }
  
  // Add referral and update count
  const added = addReferral(refUserId);
  if (added) {
    updateRefCount(refUserId);
    
    // Store who attracted this user
    const refUserKey = LIB_PREFIX + 'user' + refUserId;
    const refUser = Bot.get(refUserKey);
    if (refUser) {
      setProp('attracted_by_user', refUser);
      emitEvent('onAttracted', { referringUser: refUser });
    }
    return true;
  }
  return false;
}

function isAlreadyAttracted() {
  return !!getProp('attracted_by_user') || !!getProp('old_user');
}

function isValidRefLink() {
  if (!isDeepLink()) return false;
  
  if (!params || typeof params !== 'string') return false;
  
  const prefix = Bot.get(LIB_PREFIX + 'refLinkPrefix') || 'user';
  const validPrefixes = Array.isArray(prefix) ? prefix : [prefix];
  const matchedPrefix = validPrefixes.find(p => params.startsWith(p));
  
  if (!matchedPrefix) return false;
  
  const refId = parseInt(params.slice(matchedPrefix.length));
  return !isNaN(refId) && refId > 0;
}

function trackRef() {
  if (!isValidRefLink()) {
    User.set(LIB_PREFIX + 'old_user', true, user.id, 'boolean');
    return;
  }

  const prefix = Bot.get(LIB_PREFIX + 'refLinkPrefix') || 'user';
  const validPrefixes = Array.isArray(prefix) ? prefix : [prefix];
  const matchedPrefix = validPrefixes.find(p => params.startsWith(p));
  const refId = parseInt(params.slice(matchedPrefix.length));

  setReferral(refId);
}

function getAttractedBy() {
  return getProp('attracted_by_user');
}

function getRefLink(botName = bot.name, prefix = 'user') {
  // Store user info for referral tracking
  const refUserKey = LIB_PREFIX + 'user' + user.id;
  Bot.set(refUserKey, {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name || "",
    telegramid: user.telegramid
  }, 'json');

  // Update prefix list
  let currentPrefixes = Bot.get(LIB_PREFIX + 'refLinkPrefix') || [];
  if (!Array.isArray(currentPrefixes)) {
    currentPrefixes = [currentPrefixes];
  }
  if (!currentPrefixes.includes(prefix)) {
    currentPrefixes.push(prefix);
    Bot.set(LIB_PREFIX + 'refLinkPrefix', currentPrefixes, 'json');
  }

  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function isDeepLink() {
  return message && message.startsWith('/start') && params && params.length > 0;
}

function track(options = {}) {
  trackOptions = options;
  if (isDeepLink()) {
    trackRef();
  } else {
    User.set(LIB_PREFIX + 'old_user', true, user.id, 'boolean');
  }
}

function getRefLeaderboard(limit = 10) {
  const topList = getTopList();
  const sorted = Object.entries(topList)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([userId, count]) => ({ userId: parseInt(userId), count }));
  
  return sorted;
}

function resetUserRefs(userId = user.id) {
  User.del(LIB_PREFIX + 'refList', userId);
  User.del(LIB_PREFIX + 'refsCount', userId);
  User.del(LIB_PREFIX + 'attracted_by_user', userId);
  User.del(LIB_PREFIX + 'old_user', userId);
  
  // Update top list
  const topList = getTopList();
  delete topList[userId];
  Bot.set(LIB_PREFIX + 'topList', topList, 'json');
  
  return true;
}

// Export using module.exports for TBL Lib development
module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy,
  getRefLeaderboard: getRefLeaderboard,
  resetUserRefs: resetUserRefs
};
