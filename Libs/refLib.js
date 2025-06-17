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
  return User.getProperty({ name: LIB_PREFIX + propName, user_id: userId });
}

function setProp(propName, value, userId = user.id, type = 'json') {
  return User.setProperty({ name: LIB_PREFIX + propName, value, user_id: userId, type });
}

function getRefList(userId = user.id) {
  return getProp('refList', userId) || [];
}

function setRefList(userId, refList) {
  setProp('refList', refList, userId);
}

function getTopList() {
  return Bot.getProperty(LIB_PREFIX + 'topList') || {};
}

function updateTopList(userId, refsCount) {
  const topList = getTopList();
  topList[userId] = refsCount;
  Bot.setProperty(LIB_PREFIX + 'topList', topList, 'json');
}

function addReferral(userId) {
  const refList = getRefList(userId);
  if (!refList.some(ref => ref.id === user.id)) {
    refList.push({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      date: new Date().toISOString()
    });
    setRefList(userId, refList);
  }
}

function getRefCount(userId = user.id) {
  return getProp('refsCount', userId) || 0;
}

function updateRefCount(userId) {
  const count = getRefCount(userId) + 1;
  setProp('refsCount', count, userId, 'integer');
  updateTopList(userId, count);
}

function setReferral(refUserId) {
  addReferral(refUserId);
  updateRefCount(refUserId);
  const refUserKey = LIB_PREFIX + 'user' + refUserId;
  const refUser = Bot.getProperty(refUserKey);
  if (refUser) {
    setProp('attracted_by_user', refUser);
    emitEvent('onAttracted', refUser);
  }
}

function isAlreadyAttracted() {
  return !!getProp('attracted_by_user') || !!getProp('old_user');
}

function trackRef() {
  const prefix = Bot.getProperty(LIB_PREFIX + 'refLinkPrefix') || 'user';
  const validPrefixes = Array.isArray(prefix) ? prefix : [prefix];
  const matchedPrefix = validPrefixes.find(p => params.startsWith(p));
  if (!matchedPrefix) {
    setProp('old_user', true, user.id, 'boolean');
    return;
  }
  
  const refId = parseInt(params.slice(matchedPrefix.length));
  if (!refId || isNaN(refId)) {
    setProp('old_user', true, user.id, 'boolean');
    return;
  }
  
  if (refId === user.id) {
    emitEvent('onTouchOwnLink', { user });
    return;
  }
  
  setReferral(refId);
}

function getAttractedBy() {
  return getProp('attracted_by_user');
}

function getRefLink(botName = bot.name, prefix = 'user') {
  const refUserKey = LIB_PREFIX + 'user' + user.id;
  Bot.setProperty(refUserKey, {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    telegramid: user.telegramid
  }, 'json');

  let currentPrefixes = Bot.getProperty(LIB_PREFIX + 'refLinkPrefix') || [];
  if (!Array.isArray(currentPrefixes)) currentPrefixes = [currentPrefixes];
  if (!currentPrefixes.includes(prefix)) {
    currentPrefixes.push(prefix);
    Bot.setProperty(LIB_PREFIX + 'refLinkPrefix', currentPrefixes, 'json');
  }

  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function isDeepLink() {
  return message.startsWith('/start') && params && typeof params === 'string';
}

function track(options = {}) {
  trackOptions = options;
  if (isAlreadyAttracted()) return emitEvent('onAlreadyAttracted');
  if (isDeepLink()) return trackRef();
}

module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy
};
