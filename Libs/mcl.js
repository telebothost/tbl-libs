/**
 * Telegram Channel Membership Checker library for TBL runtime 
 * @module mcl
 */

class MembershipChecker {
  /**
   * Normalizes channel input (removes @ if present)
   * @private
   * @param {string} channel - Channel identifier
   * @returns {string} Normalized channel identifier
   */
  _normalizeChannel(channel) {
    if (typeof channel !== 'string') return channel;
    return channel.startsWith('@') ? channel.slice(1) : channel;
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
    
    try {
      const member = await Api.getChatMember({
        chat_id: normalizedChannel,
        user_id: userId
      });

      if (member?.ok === false || member?.message) {
        return { 
          channel: channel,
          status: 'invalid', 
          reason: member.message || 'Channel inaccessible'
        };
      }

      const status = member?.result?.status;
      
      if (status === 'left' || status === 'kicked') {
        return { 
          channel: channel,
          status: 'left',
          isPrivate: this._isPrivateChannel(normalizedChannel)
        };
      }
      
      if (['member', 'administrator', 'creator'].includes(status)) {
        return { 
          channel: channel,
          status: 'joined',
          isPrivate: this._isPrivateChannel(normalizedChannel)
        };
      }
      
      return { 
        channel: channel,
        status: 'invalid',
        reason: `Unknown membership status: ${status}`
      };
      
    } catch (error) {
      return { 
        channel: channel,
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
   * console.log(result.allJoined);
   */
  async check(userId, channels) {
    this._validateChannels(channels);

    const results = {
      allJoined: true,
      joined: [],
      left: [],
      invalid: []
    };

    const channelResults = await Promise.all(
      channels.map(channel => this._processChannelCheck(userId, channel))
    );

    for (const result of channelResults) {
      switch (result.status) {
        case 'joined':
          results.joined.push(result.channel);
          break;
          
        case 'left':
          results.left.push(result.channel);
          results.allJoined = false;
          break;
          
        case 'invalid':
          results.invalid.push({
            channel: result.channel,
            reason: result.reason
          });
          results.allJoined = false;
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
    return result.allJoined;
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
    return result.left;
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
    return result.invalid;
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
    
    if (result.allJoined) {
      return config.joinedMessage;
    }

    const parts = [];
    
    if (result.left.length > 0) {
      parts.push(config.leftHeader);
      parts.push(result.left.map(channel => `  - ${channel}`).join("\n"));
    }
    
    if (result.invalid.length > 0) {
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

    const seen = new Set();
    const buttons = [];

    for (let channel of channels) {
      if (typeof channel !== 'string') continue;
      
      const normalized = this._normalizeChannel(channel);
      
      if (this._isPrivateChannel(normalized)) {
        continue;
      }

      if (seen.has(normalized)) continue;
      seen.add(normalized);
      
      buttons.push([{
        text: `${buttonPrefix} @${normalized}`,
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
    const result = await this.check(userId, channels);
    
    return {
      total: channels.length,
      joinedCount: result.joined.length,
      leftCount: result.left.length,
      invalidCount: result.invalid.length,
      percentJoined: (result.joined.length / channels.length) * 100,
      allJoined: result.allJoined,
      hasIssues: result.left.length > 0 || result.invalid.length > 0
    };
  }
}

module.exports = new MembershipChecker();

// last updated: 25/04/26
// _v: 1.0.0
// type: asynchronous