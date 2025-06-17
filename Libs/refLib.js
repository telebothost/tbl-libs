const _LIB_PREFIX = 'REFLIB_';
let _refTrackOptions = {};

function _refEmitEvent(eventName, prms = {}) {
  const handler = _refTrackOptions[eventName];
  if (handler) {
    handler(prms);
    return true;
  }
}

function _refGetProp(name, userId = user.id) {
  return User.getProperty({ name: _LIB_PREFIX + name, user_id: userId });
}

function _refSetProp(name, value, type = 'json', userId = user.id) {
  return User.setProperty({ name: _LIB_PREFIX + name, value, type, user_id: userId });
}

function _refGetRefList(userId = user.id) {
  return _refGetProp('refList', userId) || [];
}

function _refSetRefList(refList, userId) {
  _refSetProp('refList', refList, 'json', userId);
}

function _refGetTopList() {
  return Bot.getProperty(_LIB_PREFIX + 'TopList') || {};
}

function _refSetTopList(topList) {
  Bot.setProperty(_LIB_PREFIX + 'TopList', topList, 'json');
}

function _refGetRefCount(userId = user.id) {
  return _refGetProp('refsCount', userId) || 0;
}

function _refUpdateRefCount(userId) {
  const count = _refGetRefCount(userId) + 1;
  _refSetProp('refsCount', count, 'integer', userId);

  const topList = _refGetTopList();
  topList[userId] = count;
  _refSetTopList(topList);
}

function _refAddReferralUser(userId) {
  const refList = _refGetRefList(userId);
  if (!refList.some(r => r.id === user.id)) {
    refList.push({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      telegramid: user.telegramid,
      date: new Date().toISOString()
    });
    _refSetRefList(refList, userId);
  }
}

function _refSaveUser(userId = user.id) {
  const key = _LIB_PREFIX + 'user' + userId;
  Bot.setProperty(key, {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    telegramid: user.telegramid
  }, 'json');
}

function _refSetReferral(refUserId) {
  _refAddReferralUser(refUserId);
  _refUpdateRefCount(refUserId);

  const refUser = Bot.getProperty(_LIB_PREFIX + 'user' + refUserId);
  if (refUser) {
    _refSetProp('attracted_by_user', refUser, 'json');
    _refEmitEvent('onAttracted', refUser);
  }
}

function _refGetAttractedBy() {
  const ref = _refGetProp('attracted_by_user');
  if (ref) ref.chatId = ref.telegramid;
  return ref;
}

function _refIsAlreadyAttracted() {
  return !!_refGetProp('attracted_by_user') || !!_refGetProp('old_user');
}

function _refExtractRefId(msg = message) {
  let prefixes = Bot.getProperty(_LIB_PREFIX + 'refLinkPrefixes') || ['user'];
  if (!Array.isArray(prefixes)) prefixes = [prefixes];

  for (const prefix of prefixes) {
    const match = msg.match(new RegExp(prefix + '(\\d+)', 'i'));
    if (match) return parseInt(match[1]);
  }

  const fallback = msg.match(/(^|\s)(\d{5,12})(\s|$)/);
  if (fallback) return parseInt(fallback[2]);

  return null;
}

function _refTrackRef() {
  const refId = _refExtractRefId();
  if (!refId) return false;
  if (refId === user.id) return _refEmitEvent('onTouchOwnLink');
  _refSetReferral(refId);
  return true;
}

function getLink(botName = bot.name, prefix = 'user') {
  _refSaveUser(user.id);

  let prefixes = Bot.getProperty(_LIB_PREFIX + 'refLinkPrefixes') || [];
  if (!Array.isArray(prefixes)) prefixes = [prefixes];
  if (!prefixes.includes(prefix)) {
    prefixes.push(prefix);
    Bot.setProperty(_LIB_PREFIX + 'refLinkPrefixes', prefixes, 'json');
  }

  return `https://t.me/${botName}?start=${prefix}${user.id}`;
}

function track(options = {}) {
  _refTrackOptions = options;

  if (_refIsAlreadyAttracted()) return _refEmitEvent('onAlreadyAttracted');

  const tracked = _refTrackRef();
  if (
    message.toLowerCase().startsWith('/start') &&
    !params &&
    !_refExtractRefId()
  ) {
    _refSetProp('old_user', true, 'boolean');
  }
}

function getRefList(userId) {
  return _refGetRefList(userId);
}

function getRefCount(userId) {
  return _refGetRefCount(userId);
}

function getTopList() {
  return _refGetTopList();
}

function getAttractedBy() {
  return _refGetAttractedBy();
}

function clearRefList(userId = user.id) {
  _refSetRefList([], userId);
}

module.exports = {
  getLink,
  track,
  getRefList,
  getRefCount,
  getTopList,
  getAttractedBy,

  currentUser: {
    getRefLink: getLink,
    track,
    refList: {
      get: getRefList,
      clear: clearRefList
    },
    attractedByUser: getAttractedBy
  },

  topList: {
    get: getTopList
  }
};
