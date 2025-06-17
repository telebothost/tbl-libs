let LIB_PREFIX = 'REFLIB_';
let trackOptions = {};

function emitEvent(eventName, prms = {}) {
  const evenFun = trackOptions[eventName];
  if (evenFun) {
    evenFun(prms);
    return true;
  }
}

function getProp(propName, userId = user.id) {
  return User.getProperty({ name: LIB_PREFIX + propName, user_id: userId });
}

function setProp(propName, value, type = 'json', userId = user.id) {
  return User.setProperty({ name: LIB_PREFIX + propName, value, type, user_id: userId });
}

function getRefList(userId = user.id) {
  return getProp('refList', userId) || [];
}

function setRefList(refList, userId) {
  setProp('refList', refList, 'json', userId);
}

function getTopList() {
  return Bot.getProperty(LIB_PREFIX + 'TopList') || {};
}

function setTopList(topList) {
  Bot.setProperty(LIB_PREFIX + 'TopList', topList, 'json');
}

function getRefCount(userId = user.id) {
  return getProp('refsCount', userId) || 0;
}

function updateRefCount(userId) {
  const count = getRefCount(userId) + 1;
  setProp('refsCount', count, 'integer', userId);

  const topList = getTopList();
  topList[userId] = count;
  setTopList(topList);
}

function addReferralUser(userId) {
  const refList = getRefList(userId);
  if (!refList.some(r => r.id === user.id)) {
    refList.push({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      telegramid: user.telegramid,
      date: new Date().toISOString()
    });
    setRefList(refList, userId);
  }
}

function saveUserRecord(userId = user.id) {
  const key = LIB_PREFIX + 'user' + userId;
  Bot.setProperty(key, {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    telegramid: user.telegramid
  }, 'json');
}

function setReferral(refUserId) {
  addReferralUser(refUserId);
  updateRefCount(refUserId);
  const refUser = Bot.getProperty(LIB_PREFIX + 'user' + refUserId);
  if (refUser) {
    setProp('attracted_by_user', refUser, 'json');
    emitEvent('onAttracted', refUser);
  }
}

function getAttractedBy() {
  const ref = getProp('attracted_by_user');
  if (ref) ref.chatId = ref.telegramid;
  return ref;
}

function isAlreadyAttracted() {
  return !!getProp('attracted_by_user') || !!getProp('old_user');
}

function extractReferralId(msg) {
  let prefixes = Bot.getProperty(LIB_PREFIX + 'refLinkPrefixes') || ['user'];
  if (!Array.isArray(prefixes)) prefixes = [prefixes];
  msg = msg || message;
  for (const prefix of prefixes) {
    const match = msg.match(new RegExp(prefix + '(\\d+)', 'i'));
    if (match) return parseInt(match[1]);
  }
  const fallback = msg.match(/(^|\s)(\d{5,12})(\s|$)/);
  if (fallback) return parseInt(fallback[2]);
  return null;
}

function trackRef() {
  const refId = extractReferralId();
  if (!refId || refId === user.id) return emitEvent('onTouchOwnLink');
  setReferral(refId);
}

function getRefLink(botName = bot.name, prefix = 'user') {
  saveUserRecord(user.id);

  let prefixes = Bot.getProperty(LIB_PREFIX + 'refLinkPrefixes') || [];
  if (!Array.isArray(prefixes)) prefixes = [prefixes];
  if (!prefixes.includes(prefix)) {
    prefixes.push(prefix);
    Bot.setProperty(LIB_PREFIX + 'refLinkPrefixes', prefixes, 'json');
  }

  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function isDeepLink() {
  return typeof params !== 'undefined' && params !== null;
}

function track(_trackOptions = {}) {
  trackOptions = _trackOptions;
  if (isAlreadyAttracted()) return emitEvent('onAlreadyAttracted');
  if (isDeepLink()) return trackRef();
  return setProp('old_user', true, 'boolean');
}

function clearRefList(userId = user.id) {
  setProp('refList', [], 'json', userId);
}

module.exports = {
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getRefCount: getRefCount,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy,

  currentUser: {
    getRefLink: getRefLink,
    track: track,
    refList: {
      get: getRefList,
      clear: clearRefList
    },
    attractedByUser: getAttractedBy
  },

  topList: {
    get: getTopList
  }
}
