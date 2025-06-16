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
  const refList = getProp('refList', userId) || [];
  return refList.map(id => ({ id, ...getUserData(id) }));
}

function setRefList(userId, refList) {
  setProp('refList', refList.map(user => user.id), userId);
}

function getUserData(userId) {
  const userData = Bot.getProperty(LIB_PREFIX + 'user_data_' + userId) || {};
  if (!userData.id) userData.id = userId;
  return userData;
}

function storeUserData(userData) {
  const dataToStore = {
    id: userData.id,
    first_name: userData.first_name,
    last_name: userData.last_name,
    username: userData.username,
    language: userData.language,
    telegramid: userData.telegramid
  };
  Bot.setProperty(LIB_PREFIX + 'user_data_' + userData.id, dataToStore, 'json');
}

function getTopList() {
  const topList = Bot.getProperty(LIB_PREFIX + 'topList') || {};
  return Object.entries(topList)
    .map(([userId, count]) => ({ userId, count, ...getUserData(userId) }))
    .sort((a, b) => b.count - a.count);
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
  storeUserData(user);
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

function trackRef() {
  const prefix = Bot.getProperty(LIB_PREFIX + 'refLinkPrefix') || 'user';
  if (!params.startsWith(prefix)) return;
  
  const refId = parseInt(params.replace(prefix, ''));
  if (!refId) return;
  
  if (refId === user.id) {
    emitEvent('onTouchOwnLink', { user: getUserData(user.id) });
    return;
  }
  
  setReferral(refId);
}

function getAttractedBy() {
  return getProp('attracted_by_user');
}

function getRefLink(botName = bot.name, prefix = 'user') {
  Bot.setProperty(LIB_PREFIX + 'refLinkPrefix', prefix, 'string');
  storeUserData(user);
  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function isDeepLink() {
  return message.startsWith('/start') && params;
}

function track(_options = {}) {
  trackOptions = _options;
  storeUserData(user);
  
  if (isAlreadyAttracted()) {
    emitEvent('onAlreadyAttracted', { user: getUserData(user.id) });
    return;
  }
  
  if (isDeepLink()) trackRef();
  else setProp('old_user', true, user.id, 'boolean');
}

function resetUserData(userId = user.id) {
  const props = ['refList', 'refsCount', 'attracted_by_user', 'old_user'];
  props.forEach(prop => User.deleteProperty({ name: LIB_PREFIX + prop, user_id: userId }));
  Bot.deleteProperty(LIB_PREFIX + 'user_data_' + userId);
}

function getLeaderboard(limit = 10) {
  return getTopList().slice(0, limit);
}

function getMyRank() {
  const topList = getTopList();
  const userIndex = topList.findIndex(item => item.userId === user.id);
  return userIndex === -1 ? null : userIndex + 1;
}

module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getLeaderboard: getLeaderboard,
  getMyRank: getMyRank,
  getAttractedBy: getAttractedBy,
  getUserData: getUserData,
  resetUserData: resetUserData
};
