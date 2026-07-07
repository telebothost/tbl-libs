/**
 * TON blockchain helper library for TBL runtime
 * @module ton
 *
 * Read-only queries via TON Center API v2/v3 + address/amount utilities.
 * Sending transactions requires a wallet signer — not included here.
 */

const NANO = 1000000000;

const ton = {
  _config: {
    mainnetV2: 'https://toncenter.com/api/v2',
    mainnetV3: 'https://toncenter.com/api/v3',
    testnetV2: 'https://testnet.toncenter.com/api/v2',
    testnetV3: 'https://testnet.toncenter.com/api/v3',
    apiKey: null,
    timeout: 15000,
    testnet: false,
    cfProxy: false
  },

  /**
   * @param {Object} options
   * @param {string} [options.apiKey] - TON Center API key (or TONCENTER_API_KEY env)
   * @param {boolean} [options.testnet] - Use testnet endpoints
   * @param {number} [options.timeout]
   * @param {boolean} [options.cfProxy]
   */
  configure(options = {}) {
    Object.assign(this._config, options);
    if (!this._config.apiKey && typeof process !== 'undefined' && process.env) {
      this._config.apiKey = process.env.TONCENTER_API_KEY || process.env.TON_API_KEY || null;
    }
  },

  _v2Base() {
    return this._config.testnet ? this._config.testnetV2 : this._config.mainnetV2;
  },

  _v3Base() {
    return this._config.testnet ? this._config.testnetV3 : this._config.mainnetV3;
  },

  _httpOpts(extra = {}) {
    const query = Object.assign({}, extra.query || {});
    if (this._config.apiKey && !query.api_key) {
      query.api_key = this._config.apiKey;
    }
    return Object.assign({
      timeout: this._config.timeout,
      responseType: 'json',
      query: query,
      cfProxy: this._config.cfProxy
    }, extra, { query: query });
  },

  _httpFail(res, action) {
    const code = (res.error && res.error.code) ? res.error.code : res.status;
    const msg = (res.error && res.error.message) ? res.error.message : (res.statusText || 'request failed');
    const apiErr = res.data && res.data.error ? res.data.error : '';
    return new Error('ton: ' + action + ' failed — ' + code + ' ' + (apiErr || msg));
  },

  _unwrapV2(res, action) {
    if (!res.ok) throw this._httpFail(res, action);
    if (!res.data || res.data.ok !== true) {
      const err = res.data && res.data.error ? res.data.error : 'invalid v2 response';
      throw new Error('ton: ' + action + ' — ' + err);
    }
    return res.data.result;
  },

  _unwrapV3(res, action) {
    if (!res.ok) throw this._httpFail(res, action);
    if (!res.data) throw new Error('ton: ' + action + ' — empty response');
    return res.data;
  },

  // ─── Units ───────────────────────────────────────────────

  /**
   * Convert TON to nanotons (string integer for API)
   * @param {number|string} amount
   * @returns {string}
   */
  toNano(amount) {
    const n = Number(amount);
    if (isNaN(n)) throw new Error('ton: toNano requires a number');
    return String(Math.round(n * NANO));
  },

  /**
   * Convert nanotons to TON
   * @param {string|number} nano
   * @param {number} [decimals=9]
   * @returns {number}
   */
  fromNano(nano, decimals = 9) {
    const n = Number(nano);
    if (isNaN(n)) return 0;
    const val = n / NANO;
    if (decimals === null || decimals === undefined) return val;
    return Number(val.toFixed(decimals));
  },

  /**
   * Format TON amount for display
   * @param {number|string} amount - TON or nanotons
   * @param {Object} [options]
   * @param {boolean} [options.fromNano=false]
   * @param {number} [options.decimals=4]
   * @param {string} [options.suffix=' TON']
   */
  format(amount, options = {}) {
    const val = options.fromNano ? this.fromNano(amount, options.decimals) : Number(amount);
    const dec = options.decimals !== undefined ? options.decimals : 4;
    const suffix = options.suffix !== undefined ? options.suffix : ' TON';
    if (isNaN(val)) return '0' + suffix;
    return val.toFixed(dec).replace(/\.?0+$/, '') + suffix;
  },

  /**
   * Basic TON address shape check (EQ/UQ/0: prefixes)
   * @param {string} address
   * @returns {boolean}
   */
  isAddress(address) {
    if (!address || typeof address !== 'string') return false;
    const a = address.trim();
    if (/^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(a)) return true;
    if (/^-?[0-9]:[0-9a-fA-F]{64}$/.test(a)) return true;
    return false;
  },

  // ─── TON Center v2 ─────────────────────────────────────

  /**
   * Get TON balance in nanotons
   * @param {string} address
   * @returns {Promise<string>}
   */
  async getBalance(address) {
    if (!this.isAddress(address)) throw new Error('ton: invalid address');
    const res = await HTTP.get(this._v2Base() + '/getAddressBalance', this._httpOpts({
      query: { address: address }
    }));
    return this._unwrapV2(res, 'getBalance');
  },

  /**
   * Get balance in TON (number)
   * @param {string} address
   * @param {number} [decimals=4]
   */
  async getBalanceTon(address, decimals = 4) {
    const nano = await this.getBalance(address);
    return this.fromNano(nano, decimals);
  },

  /**
   * Full address information
   * @param {string} address
   * @returns {Promise<Object>}
   */
  async getAddressInfo(address) {
    if (!this.isAddress(address)) throw new Error('ton: invalid address');
    const res = await HTTP.get(this._v2Base() + '/getAddressInformation', this._httpOpts({
      query: { address: address }
    }));
    return this._unwrapV2(res, 'getAddressInformation');
  },

  /**
   * Wallet-specific information (seqno, wallet type)
   * @param {string} address
   */
  async getWalletInfo(address) {
    if (!this.isAddress(address)) throw new Error('ton: invalid address');
    const res = await HTTP.get(this._v2Base() + '/getWalletInformation', this._httpOpts({
      query: { address: address }
    }));
    return this._unwrapV2(res, 'getWalletInformation');
  },

  /**
   * Recent transactions for address
   * @param {string} address
   * @param {Object} [options]
   * @param {number} [options.limit=10]
   * @param {number} [options.lt]
   * @param {string} [options.hash]
   */
  async getTransactions(address, options = {}) {
    if (!this.isAddress(address)) throw new Error('ton: invalid address');
    const query = {
      address: address,
      limit: options.limit || 10
    };
    if (options.lt) query.lt = options.lt;
    if (options.hash) query.hash = options.hash;

    const res = await HTTP.get(this._v2Base() + '/getTransactions', this._httpOpts({ query: query }));
    return this._unwrapV2(res, 'getTransactions');
  },

  /**
   * Detect bounceable / non-bounceable / raw forms
   * @param {string} address
   */
  async detectAddress(address) {
    if (!address) throw new Error('ton: detectAddress requires address');
    const res = await HTTP.get(this._v2Base() + '/detectAddress', this._httpOpts({
      query: { address: address }
    }));
    return this._unwrapV2(res, 'detectAddress');
  },

  /**
   * Run get-method on contract
   * @param {string} address
   * @param {string} method
   * @param {Array} [stack=[]]
   */
  async runGetMethod(address, method, stack = []) {
    if (!this.isAddress(address)) throw new Error('ton: invalid address');
    if (!method) throw new Error('ton: runGetMethod requires method name');

    const res = await HTTP.post(this._v2Base() + '/runGetMethod', this._httpOpts({
      body: {
        address: address,
        method: method,
        stack: stack
      }
    }));
    return this._unwrapV2(res, 'runGetMethod');
  },

  // ─── TON Center v3 ─────────────────────────────────────

  /**
   * Jetton transfer history
   * @param {Object} options
   * @param {string|string[]} [options.owner_address]
   * @param {string|string[]} [options.jetton_wallet]
   * @param {string} [options.jetton_master]
   * @param {string} [options.direction] - 'in' | 'out'
   * @param {number} [options.limit=20]
   */
  async getJettonTransfers(options = {}) {
    const query = Object.assign({ limit: 20 }, options);
    const res = await HTTP.get(this._v3Base() + '/jetton/transfers', this._httpOpts({ query: query }));
    return this._unwrapV3(res, 'getJettonTransfers');
  },

  /**
   * Jetton wallets for owner
   * @param {string} ownerAddress
   * @param {Object} [options]
   */
  async getJettonWallets(ownerAddress, options = {}) {
    if (!this.isAddress(ownerAddress)) throw new Error('ton: invalid owner address');
    const query = Object.assign({ owner_address: ownerAddress }, options);
    const res = await HTTP.get(this._v3Base() + '/jetton/wallets', this._httpOpts({ query: query }));
    return this._unwrapV3(res, 'getJettonWallets');
  },

  /**
   * Account state (v3 indexed)
   * @param {string} address
   */
  async getAccountState(address) {
    if (!this.isAddress(address)) throw new Error('ton: invalid address');
    const res = await HTTP.get(this._v3Base() + '/accountStates', this._httpOpts({
      query: { address: [address] }
    }));
    return this._unwrapV3(res, 'getAccountState');
  },

  /**
   * Masterchain info / latest block height
   */
  async getMasterchainInfo() {
    const res = await HTTP.get(this._v2Base() + '/getMasterchainInfo', this._httpOpts());
    return this._unwrapV2(res, 'getMasterchainInfo');
  },

  // ─── Deep links ────────────────────────────────────────

  /**
   * Tonkeeper / wallet transfer deep link
   * @param {string} address - Receiver
   * @param {number|string} [amountTon] - Amount in TON (converted to nano)
   * @param {string} [comment] - Transfer comment
   * @returns {string}
   */
  tonkeeperLink(address, amountTon, comment) {
    let url = 'https://app.tonkeeper.com/transfer/' + encodeURIComponent(address);
    const params = [];
    if (amountTon !== undefined && amountTon !== null && amountTon !== '') {
      params.push('amount=' + this.toNano(amountTon));
    }
    if (comment) {
      params.push('text=' + encodeURIComponent(String(comment)));
    }
    if (params.length) url += '?' + params.join('&');
    return url;
  },

  /**
   * Universal TON transfer link (ton://)
   * @param {string} address
   * @param {number|string} [amountTon]
   * @param {string} [comment]
   */
  transferLink(address, amountTon, comment) {
    let url = 'ton://transfer/' + address;
    const params = [];
    if (amountTon !== undefined && amountTon !== null && amountTon !== '') {
      params.push('amount=' + this.toNano(amountTon));
    }
    if (comment) {
      params.push('text=' + encodeURIComponent(String(comment)));
    }
    if (params.length) url += '?' + params.join('&');
    return url;
  },

  /**
   * Inline button to open Tonkeeper payment
   * @param {string} address
   * @param {number} amountTon
   * @param {string} [text='Pay with TON']
   * @param {string} [comment]
   */
  payButton(address, amountTon, text = 'Pay with TON', comment) {
    const url = this.tonkeeperLink(address, amountTon, comment);
    return [[{ text: text, url: url }]];
  },

  // ─── User wallet storage (db.user) ─────────────────────

  _walletKey() {
    return 'ton:wallet';
  },

  /**
   * Save user's TON wallet address
   * @param {string} address
   * @param {number} [userId]
   */
  async saveWallet(address, userId) {
    if (!this.isAddress(address)) throw new Error('ton: invalid wallet address');
    const scope = userId ? { user_id: userId } : {};
    const res = await db.user.set(this._walletKey(), address.trim(), scope);
    if (!res.ok) throw new Error(res.message || 'ton: save wallet failed');
    return address.trim();
  },

  /**
   * Get saved user wallet
   * @param {number} [userId]
   * @returns {Promise<string|null>}
   */
  async getWallet(userId) {
    const scope = userId ? { user_id: userId } : {};
    return await db.user.get(this._walletKey(), null, scope);
  },

  /**
   * Check if incoming TON tx matches expected amount (rough check via recent txs)
   * @param {string} address - Receiver wallet to watch
   * @param {number} expectedTon - Expected amount in TON
   * @param {Object} [options]
   * @param {number} [options.sinceLt] - Only txs after this logical time
   * @returns {Promise<{found:boolean, tx:Object|null}>}
   */
  async findIncomingPayment(address, expectedTon, options = {}) {
    const expectedNano = Number(this.toNano(expectedTon));
    const txs = await this.getTransactions(address, { limit: options.limit || 20 });

    if (!Array.isArray(txs)) return { found: false, tx: null };

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (options.sinceLt && tx.transaction_id && tx.transaction_id.lt <= options.sinceLt) {
        continue;
      }
      const inMsg = tx.in_msg;
      if (!inMsg || !inMsg.value) continue;
      const value = Number(inMsg.value);
      if (value >= expectedNano) {
        return { found: true, tx: tx };
      }
    }

    return { found: false, tx: null };
  }
};

module.exports = ton;

// last updated: 07/07/26
// _v: 0.1.0
// type: asynchronous
