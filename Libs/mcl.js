/**
 * Telegram Channel Membership Checker library for TBL runtime 
 * @module mcl
 */

class MembershipChecker {
  /**
   * Normalizes channel input to a bare identifier (username without @, or numeric id)
   * Accepts: "@chan", "chan", "@@chan", " https://t.me/chan "
   * @private
   * @param {string|number} channel - Channel identifier
   * @returns {string} Normalized channel identifier
   */
  _normalizeChannel(channel) {
    if (channel == null) return channel;
    if (typeof channel === 'number') return String(channel);

    if (typeof channel !== 'string') return channel;

    let value = channel.trim();
    if (!value) return value;

    const tmeMatch = value.match(/^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]+)\/?$/i);
    if (tmeMatch) value = tmeMatch[1];

    return value.replace(/^@+/, '');
  }

  /**
   * Stable key for deduplicating channels (@Chan and Chan are the same)
   * @private
   * @param {string|number} channel - Channel identifier
   * @returns {string}
   */
  _channelKey(channel) {
    const normalized = this._normalizeChannel(channel);
    if (typeof normalized !== 'string' || !normalized) return String(channel);
    if (this._isPrivateChannel(normalized)) return normalized;
    return normalized.toLowerCase();
  }

  /**
   * Format for Telegram API chat_id (@username for public channels)
   * @private
   * @param {string|number} channel - Channel identifier
   * @returns {string|number}
   */
  _toApiChatId(channel) {
    const normalized = this._normalizeChannel(channel);
    if (typeof normalized !== 'string' || !normalized) return normalized;
    if (this._isPrivateChannel(normalized)) return normalized;
    return '@' + normalized;
  }

  /**
   * Consistent display label (@username for public channels)
   * @private
   * @param {string|number} channel - Channel identifier
   * @returns {string}
   */
  _toDisplayChannel(channel) {
    const normalized = this._normalizeChannel(channel);
    if (typeof normalized !== 'string' || !normalized) return String(channel);
    if (this._isPrivateChannel(normalized)) return normalized;
    return '@' + normalized;
  }

  /**
   * Deduplicate channels that refer to the same chat
   * @private
   * @param {Array<string|number>} channels
   * @returns {Array<string|number>}
   */
  _dedupeChannels(channels) {
    const seen = new Set();
    const unique = [];

    for (const channel of channels) {
      const key = this._channelKey(channel);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(channel);
    }

    return unique;
  }

  /**
   * Validates channel input parameters
   * @private
   * @param {string[]} channels - Array of channel identifiers
   * @throws {Error} When channels is invalid or exceeds limit
   */
  _validateChannels(channels) {
    if (!Array.isArray(channels)) {
      throw new Error("InputError: Channels must be an array");
    }
    
    if (channels.length === 0) {
      throw new Error("InputError: Channels array cannot be empty");
    }
    
    if (channels.length > 10) {
      throw new Error(`LimitError: Maximum 10 channels allowed, got ${channels.length}`);
    }
  }

  /**
   * Checks if a channel is private (has numeric ID or starts with -100)
   * @private
   * @param {string} channel - Channel identifier
   * @returns {boolean} True if channel is private
   */
  _isPrivateChannel(channel) {
    if (typeof channel !== 'string') return false;
    return /^-?\d+$/.test(channel) || channel.startsWith('-100');
  }

  /**
   * Processes a single channel membership check
   * @private
   * @param {string|number} userId - Telegram user ID
   * @param {string} channel - Channel identifier
   * @returns {Promise<Object>} Channel check result
   */
  async _processChannelCheck(userId, channel) {
    const normalizedChannel = this._normalizeChannel(channel);
    const displayChannel = this._toDisplayChannel(channel);
    const apiChatId = this._toApiChatId(channel);
    
    try {
      const member = await Api.getChatMember({
        chat_id: apiChatId,
        user_id: userId
      });

      if (member?.ok === false || member?.message) {
        return { 
          channel: displayChannel,
          status: 'invalid', 
          reason: member.message || 'Channel inaccessible'
        };
      }

      const status = member?.result?.status;
      
      if (status === 'left' || status === 'kicked') {
        return { 
          channel: displayChannel,
          status: 'left',
          isPrivate: this._isPrivateChannel(normalizedChannel)
        };
      }
      
      if (['member', 'administrator', 'creator'].includes(status)) {
        return { 
          channel: displayChannel,
          status: 'joined',
          isPrivate: this._isPrivateChannel(normalizedChannel)
        };
      }
      
      return { 
        channel: displayChannel,
        status: 'invalid',
        reason: `Unknown membership status: ${status}`
      };
      
    } catch (error) {
      return { 
        channel: displayChannel,
        status: 'invalid', 
        reason: error.message || 'Failed to check membership',
        isPrivate: this._isPrivateChannel(normalizedChannel)
      };
    }
  }

  /**
   * Check user membership in multiple channels
   * @param {string|number} userId - Telegram user ID
   * @param {string[]} channels - Array of channel identifiers (with or without @)
   * @returns {Promise<Object>} Detailed membership results
   * 
   * @example
   * const result = await checker.check(123456789, ['@channel1', 'channel2']);
   * console.log(result.allJoined); // camelCase (legacy)
   * console.log(result.all_joined); // snake_case (new)
   */
  async check(userId, channels) {
    this._validateChannels(channels);
    channels = this._dedupeChannels(channels);

    const results = {
      // camelCase (backward compatibility)
      allJoined: true,
      joined: [],
      left: [],
      invalid: [],
      
      // snake_case (new naming convention)
      all_joined: true,
      joined_channels: [],
      left_channels: [],
      invalid_channels: [],
      details: []
    };

    const channelResults = await Promise.all(
      channels.map(channel => this._processChannelCheck(userId, channel))
    );

    for (const result of channelResults) {
      switch (result.status) {
        case 'joined':
          // camelCase
          results.joined.push(result.channel);
          // snake_case
          results.joined_channels.push(result.channel);
          results.details.push({
            channel: result.channel,
            status: 'joined',
            isPrivate: result.isPrivate
          });
          break;
          
        case 'left':
          // camelCase
          results.left.push(result.channel);
          // snake_case
          results.left_channels.push(result.channel);
          results.details.push({
            channel: result.channel,
            status: 'left',
            isPrivate: result.isPrivate
          });
          results.allJoined = false;
          results.all_joined = false;
          break;
          
        case 'invalid':
          // camelCase
          results.invalid.push({
            channel: result.channel,
            reason: result.reason
          });
          // snake_case
          results.invalid_channels.push({
            channel: result.channel,
            reason: result.reason
          });
          results.details.push({
            channel: result.channel,
            status: 'invalid',
            reason: result.reason,
            isPrivate: result.isPrivate
          });
          results.allJoined = false;
          results.all_joined = false;
          break;
      }
    }

    return results;
  }

  /**
   * Quick check if user has joined all channels
   * @param {string|number} userId - Telegram user ID
   * @param {string[]} channels - Array of channel identifiers
   * @returns {Promise<boolean>} True if user joined all channels
   * 
   * @example
   * const hasJoinedAll = await checker.quick(123456789, ['@channel1', 'channel2']);
   */
  async quick(userId, channels) {
    const result = await this.check(userId, channels);
    return result.allJoined; // camelCase (backward compatible)
  }

  /**
   * Get list of channels user has not joined
   * @param {string|number} userId - Telegram user ID
   * @param {string[]} channels - Array of channel identifiers
   * @returns {Promise<string[]>} Array of channels user left
   * 
   * @example
   * const leftChannels = await checker.getLeftChannels(123456789, ['@channel1', 'channel2']);
   */
  async getLeftChannels(userId, channels) {
    const result = await this.check(userId, channels);
    return result.left; // camelCase (backward compatible)
  }

  /**
   * Get list of invalid or inaccessible channels
   * @param {string|number} userId - Telegram user ID
   * @param {string[]} channels - Array of channel identifiers
   * @returns {Promise<Array<Object>>} Array of invalid channels with reasons
   * 
   * @example
   * const invalid = await checker.getInvalidChannels(123456789, channels);
   */
  async getInvalidChannels(userId, channels) {
    const result = await this.check(userId, channels);
    return result.invalid; // camelCase (backward compatible)
  }

  /**
   * Generate human-readable summary text
   * @param {string|number} userId - Telegram user ID
   * @param {string[]} channels - Array of channel identifiers
   * @param {Object} [options] - Formatting options
   * @returns {Promise<string>} Formatted summary text
   * 
   * @example
   * const summary = await checker.summaryText(123456789, ['@channel1', 'channel2']);
   */
  async summaryText(userId, channels, options = {}) {
    const result = await this.check(userId, channels);
    
    const defaults = {
      joinedMessage: "You have joined all required channels.",
      leftHeader: "Please join the following channels:",
      invalidHeader: "Inaccessible channels:",
      separator: "\n\n"
    };
    
    const config = { ...defaults, ...options };
    
    if (result.allJoined) { // camelCase
      return config.joinedMessage;
    }

    const parts = [];
    
    if (result.left.length > 0) { // camelCase
      parts.push(config.leftHeader);
      parts.push(result.left.map(channel => `  - ${channel}`).join("\n"));
    }
    
    if (result.invalid.length > 0) { // camelCase
      if (parts.length > 0) parts.push("");
      parts.push(config.invalidHeader);
      const invalidList = result.invalid.map(item => 
        `  - ${item.channel}\n    Reason: ${item.reason}`
      );
      parts.push(invalidList.join("\n"));
    }
    
    return parts.join(config.separator);
  }

  /**
   * Generate inline keyboard buttons for channels
   * @param {string[]} channels - Array of channel identifiers
   * @param {Object} [options] - Button configuration
   * @param {string} [options.buttonPrefix="Join"] - Prefix for button text
   * @returns {Array<Array<Object>>} Telegram inline keyboard button array
   * 
   * @example
   * const buttons = checker.getBtn(['@channel1', 'channel2']);
   */
  getBtn(channels, options = {}) {
    const { buttonPrefix = "Join" } = options;
    
    if (!Array.isArray(channels)) {
      throw new Error("InputError: Channels must be an array");
    }
    
    if (channels.length === 0) {
      return [];
    }

    const buttons = [];

    for (const channel of this._dedupeChannels(channels)) {
      const normalized = this._normalizeChannel(channel);
      if (typeof normalized !== 'string' || !normalized) continue;
      if (this._isPrivateChannel(normalized)) continue;

      const display = this._toDisplayChannel(channel);
      buttons.push([{
        text: `${buttonPrefix} ${display}`,
        url: `https://t.me/${normalized}`
      }]);
    }

    return buttons;
  }

  /**
   * Get detailed statistics about channel membership
   * @param {string|number} userId - Telegram user ID
   * @param {string[]} channels - Array of channel identifiers
   * @returns {Promise<Object>} Statistics object
   * 
   * @example
   * const stats = await checker.getStats(123456789, channels);
   */
  async getStats(userId, channels) {
    const uniqueChannels = this._dedupeChannels(channels);
    const result = await this.check(userId, uniqueChannels);
    
    return {
      // camelCase (backward compatibility)
      total: uniqueChannels.length,
      joinedCount: result.joined.length,
      leftCount: result.left.length,
      invalidCount: result.invalid.length,
      percentJoined: uniqueChannels.length
        ? (result.joined.length / uniqueChannels.length) * 100
        : 0,
      allJoined: result.allJoined,
      hasIssues: result.left.length > 0 || result.invalid.length > 0,
      
      // snake_case (new naming convention)
      total_channels: uniqueChannels.length,
      joined_count: result.joined.length,
      left_count: result.left.length,
      invalid_count: result.invalid.length,
      percent_joined: uniqueChannels.length
        ? (result.joined.length / uniqueChannels.length) * 100
        : 0,
      all_joined: result.allJoined,
      has_issues: result.left.length > 0 || result.invalid.length > 0
    };
  }
}

module.exports = new MembershipChecker();

// last updated: 09/07/26
// _v: 1.1.1
// type: asynchronous
