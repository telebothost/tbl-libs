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

function storeUserData(userId) {
  const userKey = LIB_PREFIX + 'user_' + userId;
  const userData = {
    id: userId,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    telegramid: user.telegramid,
    chatId: user.chatid
  };
  Bot.setProperty(userKey, userData, 'json');
  return userData;
}

function getUserData(userId) {
  return Bot.getProperty(LIB_PREFIX + 'user_' + userId) || null;
}

function getRefList(userId = user.id) {
  const refList = getProp('refList', userId) || [];
  return refList.map(id => getUserData(id)).filter(Boolean);
}

function setRefList(userId, refList) {
  setProp('refList', refList.map(user => user.id), userId);
}

function getTopList() {
  const topList = Bot.getProperty(LIB_PREFIX + 'topList') || {};
  return Object.entries(topList).map(([userId, count]) => {
    const user = getUserData(userId);
    return user ? {...user, refsCount: count} : null;
  }).filter(Boolean).sort((a, b) => b.refsCount - a.refsCount);
}

function updateTopList(userId, refsCount) {
  const topList = Bot.getProperty(LIB_PREFIX + 'topList') || {};
  topList[userId] = refsCount;
  Bot.setProperty(LIB_PREFIX + 'topList', topList, 'json');
}

function addReferral(userId) {
  const refList = getProp('refList', userId) || [];
  if (!refList.includes(user.id)) {
    refList.push(user.id);
    setProp('refList', refList, userId);
    storeUserData(user.id);
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

function setReferral(userId) {
  addReferral(userId);
  updateRefCount(userId);
  const refUser = getUserData(userId);
  if (refUser) {
    setProp('attracted_by_user', refUser);
    emitEvent('onAttracted', refUser);
  }
}

function isAlreadyAttracted() {
  return !!getProp('attracted_by_user') || !!getProp('old_user');
}

function getCurrentPrefix() {
  return Bot.getProperty(LIB_PREFIX + 'refLinkPrefix') || 'user';
}

function trackRef() {
  const prefix = getCurrentPrefix();
  if (!params.startsWith(prefix)) return;
  
  const refId = params.substring(prefix.length);
  if (!refId) return;
  
  if (parseInt(refId) === user.id) {
    emitEvent('onTouchOwnLink');
    return;
  }
  
  setReferral(refId);
}

function getAttractedBy() {
  return getProp('attracted_by_user');
}

function getRefLink(botName = bot.name, customPrefix) {
  const prefix = customPrefix || getCurrentPrefix();
  storeUserData(user.id);
  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function setRefLinkPrefix(prefix) {
  Bot.setProperty(LIB_PREFIX + 'refLinkPrefix', prefix, 'string');
}

function isDeepLink() {
  return message.startsWith('/start') && params;
}

function clearUserData(userId) {
  const props = ['refList', 'refsCount', 'attracted_by_user', 'old_user'];
  props.forEach(prop => User.deleteProperty({ name: LIB_PREFIX + prop, user_id: userId }));
  Bot.deleteProperty(LIB_PREFIX + 'user_' + userId);
}

function track(_options = {}) {
  trackOptions = _options;
  if (isAlreadyAttracted()) return emitEvent('onAlreadyAttracted');
  if (isDeepLink()) trackRef();
  else setProp('old_user', true, user.id, 'boolean');
}

function resetTopList() {
  Bot.setProperty(LIB_PREFIX + 'topList', {}, 'json');
}

module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy,
  getUserData: getUserData,
  setPrefix: setRefLinkPrefix,
  clearUserData: clearUserData,
  resetTopList: resetTopList
};
