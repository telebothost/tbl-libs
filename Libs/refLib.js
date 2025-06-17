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

function extractReferralId() {
  const prefixes = Bot.getProperty(LIB_PREFIX + 'refLinkPrefix') || ['user'];
  const validPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes];
  const text = message || '';
  for (const prefix of validPrefixes) {
    const match = text.match(new RegExp(prefix + '(\\d+)', 'i'));
    if (match) return parseInt(match[1]);
  }
  const numberMatch = text.match(/(^|\s)(\d{5,10})(\s|$)/);
  if (numberMatch) return parseInt(numberMatch[2]);
  return null;
}

function trackRef() {
  const refId = extractReferralId();
  if (!refId || isNaN(refId)) return;
  if (refId === user.id) return emitEvent('onTouchOwnLink', { user });
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

  let prefixes = Bot.getProperty(LIB_PREFIX + 'refLinkPrefix') || [];
  if (!Array.isArray(prefixes)) prefixes = [prefixes];
  if (!prefixes.includes(prefix)) {
    prefixes.push(prefix);
    Bot.setProperty(LIB_PREFIX + 'refLinkPrefix', prefixes, 'json');
  }

  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function track(options = {}) {
  trackOptions = options;
  if (isAlreadyAttracted()) return emitEvent('onAlreadyAttracted');
  trackRef();
  setProp('old_user', true, user.id, 'boolean');
}

module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy
};
