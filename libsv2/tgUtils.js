/**
 * Telegram Utils Library - Complete utility suite for Telegram Bot development
 * @module tgUtil
 */

class TelegramUtils {
  constructor(options = {}) {
    this.defaultParseMode = options.defaultParseMode || 'markdown';
    this.validateWebAppData = options.validateWebAppData !== false;
  }

  /**
   * Escape text for different parse modes
   * @param {string} text - Text to escape
   * @param {string} parseMode - 'html', 'markdown', or 'markdownv2'
   * @returns {string} Escaped text
   */
  static escapeText(text, parseMode = 'markdown') {
    if (!text) return '';
    
    switch (parseMode) {
      case 'html':
        return text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
      
      case 'markdownv2':
        // MarkdownV2 special characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
        return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
      
      default: // markdown
        return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
    }
  }

  /**
   * Get display name for a Telegram member
   * @param {Object} member - Telegram user/member object
   * @param {Object} options - Options
   * @param {boolean} options.preferFullName - Prefer full name over username
   * @param {boolean} options.preferUsername - Prefer username over name
   * @returns {string} Display name
   */
  static getNameFor(member, options = {}) {
    const { preferFullName = false, preferUsername = false } = options;
    
    if (!member) return '';
    
    // Priority: username > full name > first/last name
    if (preferUsername && member.username) return '@' + member.username;
    if (preferFullName && member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    if (member.first_name) return member.first_name;
    if (member.last_name) return member.last_name;
    if (member.username) return '@' + member.username;
    
    return '';
  }

  /**
   * Get full name (first + last)
   * @param {Object} member - Telegram member
   * @returns {string} Full name
   */
  static getFullName(member) {
    if (!member) return '';
    const parts = [];
    if (member.first_name) parts.push(member.first_name);
    if (member.last_name) parts.push(member.last_name);
    return parts.length ? parts.join(' ') : this.getNameFor(member);
  }

  /**
   * Get user mention link
   * @param {Object} member - Telegram member
   * @param {string} parseMode - 'html', 'markdown', 'markdownv2'
   * @returns {string} Mention link
   */
  static getUserMention(member, parseMode = 'markdown') {
    return this.getLinkFor(member, parseMode);
  }

  /**
   * Generate link to a Telegram user
   * @param {Object} member - Telegram member
   * @param {string} parseMode - 'html', 'markdown', 'markdownv2'
   * @param {string} customText - Custom link text (optional)
   * @returns {string} Formatted user link
   */
  static getLinkFor(member, parseMode = 'markdown', customText = null) {
    const name = customText || this.getNameFor(member) || 'User';
    const id = member?.telegramid || member?.id;
    
    if (!id) return name;
    
    const url = `tg://user?id=${id}`;
    
    switch (parseMode) {
      case 'html':
        return `<a href="${url}">${this.escapeText(name, 'html')}</a>`;
      case 'markdownv2':
        return `[${this.escapeText(name, 'markdownv2')}](${url})`;
      default:
        return `[${this.escapeText(name)}](${url})`;
    }
  }

  /**
   * Format user with various options
   * @param {Object} member - Telegram member
   * @param {Object} options - Formatting options
   * @returns {string} Formatted user string
   */
  static formatUser(member, options = {}) {
    const {
      showId = false,
      useFullName = false,
      link = true,
      parseMode = 'markdown',
      fallbackText = 'Unknown User',
      customName = null
    } = options;

    const name = customName || (useFullName 
      ? this.getFullName(member) 
      : this.getNameFor(member));
    
    const id = member?.telegramid || member?.id;
    const displayName = name || (showId && id ? id : fallbackText);
    
    if (!link || !id) {
      return showId && name && id ? `${displayName} (${id})` : displayName;
    }
    
    const linkText = this.getLinkFor(member, parseMode, displayName);
    return showId && name && id ? `${linkText} (${id})` : linkText;
  }

  /**
   * Check if member is a bot
   * @param {Object} member - Telegram member
   * @returns {boolean} True if bot
   */
  static isBot(member) {
    return !!(member?.is_bot || member?.username?.toLowerCase().includes('bot'));
  }

  /**
   * Get chat link
   * @param {Object} chat - Telegram chat object
   * @param {string} parseMode - 'html', 'markdown', 'markdownv2'
   * @returns {string} Formatted chat link
   */
  static getChatLink(chat, parseMode = 'markdown') {
    const link = chat.username 
      ? `https://t.me/${chat.username}`
      : chat.invite_link || `https://t.me/c/${String(chat.id).replace('-100', '')}`;
    
    const title = this.escapeText(chat.title || chat.username || 'Private Chat', parseMode);
    
    switch (parseMode) {
      case 'html':
        return `<a href="${link}">${title}</a>`;
      case 'markdownv2':
        return `[${title}](${link})`;
      default:
        return `[${title}](${link})`;
    }
  }

  /**
   * Format message link
   * @param {number|string} chatId - Chat ID
   * @param {number} messageId - Message ID
   * @param {string} parseMode - 'html', 'markdown', 'markdownv2'
   * @param {string} text - Custom link text
   * @returns {string} Formatted message link
   */
  static formatMessageLink(chatId, messageId, parseMode = 'markdown', text = 'Message') {
    const cleanChatId = String(chatId).replace('-100', '');
    const link = `https://t.me/c/${cleanChatId}/${messageId}`;
    const linkText = this.escapeText(text, parseMode);
    
    switch (parseMode) {
      case 'html':
        return `<a href="${link}">${linkText}</a>`;
      case 'markdownv2':
        return `[${linkText}](${link})`;
      default:
        return `[${linkText}](${link})`;
    }
  }

  /**
   * Parse message entities and convert to formatted text
   * @param {string} text - Original text
   * @param {Array} entities - MessageEntity array from Telegram
   * @param {string} parseMode - Output parse mode
   * @returns {string} Formatted text with entities
   */
  static parseEntities(text, entities, parseMode = 'markdown') {
    if (!entities?.length) return this.escapeText(text, parseMode);
    
    let result = text;
    
    // Process from end to start to maintain offsets
    [...entities].sort((a, b) => b.offset - a.offset).forEach(entity => {
      const { offset, length, type, url, user, language, custom_emoji_id, unix_time, date_time_format } = entity;
      const snippet = result.substr(offset, length);
      const escapedSnippet = this.escapeText(snippet, parseMode);
      
      const formatMap = {
        // Basic formatting
        bold: parseMode === 'html' ? ['<b>', '</b>'] : ['*', '*'],
        italic: parseMode === 'html' ? ['<i>', '</i>'] : ['_', '_'],
        underline: parseMode === 'html' ? ['<u>', '</u>'] : ['__', '__'],
        strikethrough: parseMode === 'html' ? ['<s>', '</s>'] : ['~', '~'],
        spoiler: parseMode === 'html' ? ['<span class="tg-spoiler">', '</span>'] : ['||', '||'],
        
        // Code blocks
        code: parseMode === 'html' ? ['<code>', '</code>'] : ['`', '`'],
        pre: parseMode === 'html' 
          ? [`<pre${language ? ` language="${language}"` : ''}>`, '</pre>']
          : [`\`\`\`${language || ''}\n`, '\n```'],
        
        // Quotes
        blockquote: parseMode === 'html' ? ['<blockquote>', '</blockquote>'] : ['> ', ''],
        expandable_blockquote: parseMode === 'html' ? ['<details><summary>Expand</summary>', '</details>'] : ['||> ', '||'],
        
        // Links and mentions
        text_link: parseMode === 'html' 
          ? [`<a href="${url}">`, '</a>']
          : [`[${escapedSnippet}](${url})`, ''],
        text_mention: parseMode === 'html'
          ? [`<a href="tg://user?id=${user.id}">`, '</a>']
          : this.getLinkFor(user, parseMode, ''),
        
        // Special entities
        custom_emoji: parseMode === 'html'
          ? [`<tg-emoji emoji-id="${custom_emoji_id}">`, '</tg-emoji>']
          : ['', ''],
      };
      
      const [openTag, closeTag] = formatMap[type] || ['', ''];
      
      if (type === 'text_link' && parseMode !== 'html') {
        result = result.slice(0, offset) + openTag + result.slice(offset + length);
      } else if (type === 'text_mention' && parseMode !== 'html') {
        const mentionLink = this.getLinkFor(user, parseMode, escapedSnippet);
        result = result.slice(0, offset) + mentionLink + result.slice(offset + length);
      } else if (type === 'blockquote' && parseMode !== 'html') {
        const lines = escapedSnippet.split('\n');
        const quoted = lines.map(line => `> ${line}`).join('\n');
        result = result.slice(0, offset) + quoted + result.slice(offset + length);
      } else if (type === 'custom_emoji') {
        result = result.slice(0, offset) + (custom_emoji_id || '') + result.slice(offset + length);
      } else {
        result = result.slice(0, offset) + openTag + escapedSnippet + closeTag + result.slice(offset + length);
      }
    });
    
    return result;
  }

  /**
   * Validate and parse Telegram WebApp data
   * @param {string} rawData - Raw WebApp data string
   * @param {string} botToken - Bot token for validation (optional) default is current bot token
   * @returns {Object} Parsed and validated data
   */
  static validateWebAppData(rawData, botToken = bot.token) {
    try {
      const urlParams = new URLSearchParams(rawData);
      const data = {};
      let hash = null;
      
      // Parse all parameters
      for (const [key, value] of urlParams) {
        if (key === 'hash') {
          hash = value;
        } else {
          data[key] = value;
        }
      }
      
      if (!hash) {
        throw new Error('Missing hash parameter');
      }
      
      // Parse JSON fields
      if (data.user) {
        try {
          data.user = JSON.parse(data.user);
        } catch (e) {
          throw new Error('Invalid user data JSON');
        }
      }
      
      if (data.chat) {
        try {
          data.chat = JSON.parse(data.chat);
        } catch (e) {
          throw new Error('Invalid chat data JSON');
        }
      }
      
      // Validate with bot token if provided
      if (botToken) {
        const checkString = Object.keys(data)
          .sort()
          .map(key => `${key}=${data[key]}`)
          .join('\n');
        
        const secret = crypto.createHmac('sha256', 'WebAppData')
          .update(botToken)
          .digest();
        
        const computedHash = crypto.createHmac('sha256', secret)
          .update(checkString)
          .digest('hex');
        
        if (computedHash !== hash) {
          throw new Error('Invalid hash signature');
        }
      }
      
      return {
        valid: true,
        data: {
          ...data,
          hash,
          user: data.user || null,
          chat: data.chat || null,
          auth_date: data.auth_date ? new Date(parseInt(data.auth_date) * 1000) : null,
          query_id: data.query_id || null
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create WebApp button data
   * @param {Object} data - Data to embed
   * @returns {string} URL encoded string
   */
  static createWebAppData(data) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, String(value));
      }
    }
    
    return params.toString();
  }


  /**
   * Split long message into chunks (with markdown handling)
   * @param {string} text - Text to split
   * @param {number} maxLength - Maximum chunk length (default: 4096)
   * @returns {string[]} Array of message chunks
   */
  static splitMessage(text, maxLength = 4096) {
    if (text.length <= maxLength) return [text];
    
    const chunks = [];
    let remaining = text;
    
    while (remaining.length > maxLength) {
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1) splitIndex = remaining.lastIndexOf(' ', maxLength);
      if (splitIndex === -1) splitIndex = maxLength;
      
      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex);
    }
    
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  /**
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  static formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Get user profile photos link (if available)
   * @param {Object} member - Telegram member
   * @returns {string|null} Profile photo URL or null
   */
  static getProfilePhotoUrl(member) {
    const username = member?.username;
    if (!username) return null;
    return `https://t.me/i/userpic/320/${username}.jpg`;
  }

  /**
   * Create deep link for bot
   * @param {string} botUsername - Bot\ username
   * @param {string} command - Command to execute
   * @param {Object} params - Additional parameters
   * @returns {string} Deep link URL
   */
  static createDeepLink(botUsername, command, params = {}) {
    const url = `https://t.me/${botUsername}${command ? `/${command}` : ''}`;
    const queryString = new URLSearchParams(params).toString();
    return queryString ? `${url}?${queryString}` : url;
  }
}

module.exports = TelegramUtils;

// last updated: 25/04/26
// _v: 1.0.0
// type: synchronous