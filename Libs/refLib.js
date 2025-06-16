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
  if (!refList.includes(user.id)) {
    refList.push(user.id);
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

function setReferral(userId) {
  addReferral(userId);
  updateRefCount(userId);
  const refUserKey = LIB_PREFIX + 'user' + userId;
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
  const [head, tail] = params.split(prefix);
  if (head || !tail) return;
  const refId = parseInt(tail);
  if (refId === user.id) return emitEvent('onTouchOwnLink');
  setReferral(refId);
}

function getAttractedBy() {
  const refUser = getProp('attracted_by_user');
  if (refUser) refUser.chatId = refUser.telegramid;
  return refUser;
}

function getRefLink(botName = bot.name, prefix = 'user') {
  Bot.setProperty(LIB_PREFIX + 'refLinkPrefix', prefix, 'string');
  const userKey = LIB_PREFIX + 'user' + user.id;
  Bot.setProperty(userKey, user, 'json');
  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function isDeepLink() {
  return message.startsWith('/start') && params;
}

function track(_options = {}) {
  trackOptions = _options;
  if (isAlreadyAttracted()) return emitEvent('onAlreadyAttracted');
  if (isDeepLink()) trackRef();
  else setProp('old_user', true, user.id, 'boolean');
}

module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy
};
