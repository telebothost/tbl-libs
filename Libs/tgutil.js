//tgutils lib
module.exports = {
  getNameFor(member, options = {}) {
    const { preferFullName = false } = options;
    let haveAnyNames = member.username || member.first_name || member.last_name;
    if (!haveAnyNames) return "";
    if (member.username && !preferFullName) return "@" + member.username;
    return preferFullName && member.first_name && member.last_name 
      ? `${member.first_name} ${member.last_name}`
      : member.first_name || member.last_name;
  },

  getLinkFor(member, parseMode = 'markdown') {
    let name = module.exports.getNameFor(member);
    const id = member.telegramid || member.id;
    if (!name) name = id || "Unknown User";
    return parseMode === 'html'
      ? `<a href="tg://user?id=${id}">${name}</a>`
      : `[${name}](tg://user?id=${id})`;
  },

  getFullName(member) {
    let nameParts = [];
    if (member.first_name) nameParts.push(member.first_name);
    if (member.last_name) nameParts.push(member.last_name);
    return nameParts.length
      ? nameParts.join(" ")
      : module.exports.getNameFor(member);
  },

  formatUser(member, options = {}) {
    const {
      showId = false,
      useFullName = false,
      link = true,
      parseMode = 'markdown',
      fallbackText = 'Unknown User'
    } = options;

    const name = useFullName
      ? module.exports.getFullName(member)
      : module.exports.getNameFor(member);

    const id = member.telegramid || member.id;
    const displayName = name || (showId && id ? id : fallbackText);

    if (!link || !id) return displayName;
    const linkText = parseMode === 'html'
      ? `<a href="tg://user?id=${id}">${displayName}</a>`
      : `[${displayName}](tg://user?id=${id})`;
    return showId && name && id ? `${linkText} (${id})` : linkText;
  },

  isBot(member) {
    return !!(member.is_bot || member.username?.toLowerCase().endsWith('bot'));
  },

  getChatLink(chat, parseMode = 'markdown') {
    const link = chat.username 
      ? `https://t.me/${chat.username}`
      : chat.invite_link || `https://t.me/c/${String(chat.id).replace('-100', '')}`;
    const title = chat.title || chat.username || 'Private Chat';
    return parseMode === 'html'
      ? `<a href="${link}">${title}</a>`
      : `[${title}](${link})`;
  },

  escapeText(text, parseMode = 'markdown') {
    return parseMode === 'html'
      ? text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
      : text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1');
  },

  formatMessageLink(chatId, messageId, parseMode = 'markdown') {
    const link = `https://t.me/c/${String(chatId).replace('-100', '')}/${messageId}`;
    return parseMode === 'html'
      ? `<a href="${link}">Message</a>`
      : `[Message](${link})`;
  },

  getUserMention(member, options = {}) {
    const { parseMode = 'markdown', showId = false } = options;
    return module.exports.formatUser(member, { link: true, parseMode, showId });
  },

  parseEntities(text, entities, parseMode = 'markdown') {
    if (!entities || !entities.length) return module.exports.escapeText(text, parseMode);
    
    let result = text;
    entities.sort((a, b) => b.offset - a.offset).forEach(entity => {
      const { offset, length, type } = entity;
      const snippet = result.substr(offset, length);
      const escapedSnippet = module.exports.escapeText(snippet, parseMode);
      
      if (parseMode === 'html') {
        switch (type) {
          case 'bold': result = result.slice(0, offset) + `<b>${escapedSnippet}</b>` + result.slice(offset + length); break;
          case 'italic': result = result.slice(0, offset) + `<i>${escapedSnippet}</i>` + result.slice(offset + length); break;
          case 'code': result = result.slice(0, offset) + `<code>${escapedSnippet}</code>` + result.slice(offset + length); break;
          case 'pre': result = result.slice(0, offset) + `<pre>${escapedSnippet}</pre>` + result.slice(offset + length); break;
          case 'text_link': result = result.slice(0, offset) + `<a href="${entity.url}">${escapedSnippet}</a>` + result.slice(offset + length); break;
          case 'mention': result = result.slice(0, offset) + escapedSnippet + result.slice(offset + length); break;
        }
      } else {
        switch (type) {
          case 'bold': result = result.slice(0, offset) + `*${escapedSnippet}*` + result.slice(offset + length); break;
          case 'italic': result = result.slice(0, offset) + `_${escapedSnippet}_` + result.slice(offset + length); break;
          case 'code': result = result.slice(0, offset) + `\`${escapedSnippet}\`` + result.slice(offset + length); break;
          case 'pre': result = result.slice(0, offset) + `\`\`\`\n${escapedSnippet}\n\`\`\`` + result.slice(offset + length); break;
          case 'text_link': result = result.slice(0, offset) + `[${escapedSnippet}](${entity.url})` + result.slice(offset + length); break;
          case 'mention': result = result.slice(0, offset) + escapedSnippet + result.slice(offset + length); break;
        }
      }
    });
    return result;
  }
};
