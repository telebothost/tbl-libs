/**
 * OxaPay crypto payment gateway library for TBL runtime
 * @module oxapay
 *
 * API: https://docs.oxapay.com
 * Base: https://api.oxapay.com/v1
 */

const PREFIX = 'oxp:';

const PAYMENT_TYPES = ['invoice', 'white_label', 'static_address', 'payment_link', 'donation'];
const PAYOUT_TYPE = 'payout';

const oxapay = {
  _config: {
    baseUrl: 'https://api.oxapay.com/v1',
    merchantKey: null,
    payoutKey: null,
    timeout: 15000,
    rawResponse: false,
    cfProxy: false
  },

  /**
   * Configure API keys and defaults
   * @param {Object} options
   * @param {string} [options.merchantKey] - Merchant API key (or process.env.OXAPAY_MERCHANT_KEY)
   * @param {string} [options.payoutKey] - Payout API key for payout webhooks
   * @param {number} [options.timeout] - HTTP timeout ms
   * @param {boolean} [options.rawResponse] - Return full API envelope instead of data only
   * @param {boolean} [options.cfProxy] - Use HTTP cfProxy option
   */
  configure(options = {}) {
    Object.assign(this._config, options);
    if (!this._config.merchantKey && typeof process !== 'undefined' && process.env) {
      this._config.merchantKey = process.env.OXAPAY_MERCHANT_KEY || process.env.OXAPAY_API_KEY || null;
    }
    if (!this._config.payoutKey && typeof process !== 'undefined' && process.env) {
      this._config.payoutKey = process.env.OXAPAY_PAYOUT_KEY || null;
    }
  },

  _merchantKey() {
    const key = this._config.merchantKey;
    if (!key) throw new Error('oxapay: merchant API key not set — call configure() or set OXAPAY_MERCHANT_KEY');
    return key;
  },

  _httpOpts(extra = {}) {
    return Object.assign({
      timeout: this._config.timeout,
      responseType: 'json'
    }, extra);
  },

  _httpFail(res, action) {
    const code = (res.error && res.error.code) ? res.error.code : res.status;
    const msg = (res.error && res.error.message) ? res.error.message : (res.statusText || 'request failed');
    const bodyMsg = res.data && res.data.error && res.data.error.message ? res.data.error.message : '';
    return new Error('oxapay: ' + action + ' failed — ' + code + ' ' + (bodyMsg || msg));
  },

  _unwrap(res, action) {
    if (!res.ok) throw this._httpFail(res, action);
    if (!res.data) throw new Error('oxapay: ' + action + ' — empty response');
    if (this._config.rawResponse) return res.data;
    if (res.data.error) {
      throw new Error('oxapay: ' + action + ' — ' + (res.data.error.message || res.data.message || 'API error'));
    }
    return res.data.data !== undefined ? res.data.data : res.data;
  },

  async _request(method, path, options = {}) {
    const url = this._config.baseUrl + path;
    const headers = Object.assign({
      'merchant_api_key': this._merchantKey(),
      'Content-Type': 'application/json'
    }, options.headers || {});

    const opts = this._httpOpts({
      headers: headers,
      query: options.query,
      body: options.body,
      cfProxy: this._config.cfProxy
    });

    const res = method === 'GET'
      ? await HTTP.get(url, opts)
      : await HTTP.post(url, opts);

    return this._unwrap(res, method + ' ' + path);
  },

  /**
   * Create a payment invoice and get payment URL
   * @param {Object} options
   * @param {number} options.amount - Invoice amount (USD if currency omitted)
   * @param {string} [options.currency] - Fiat or crypto currency symbol
   * @param {string} [options.order_id] - Your order reference
   * @param {string} [options.callback_url] - Webhook URL for status updates
   * @param {string} [options.return_url] - Redirect after payment
   * @param {string} [options.description]
   * @param {number} [options.lifetime] - Link lifetime minutes (15–2880)
   * @param {boolean} [options.sandbox] - Test mode
   * @param {boolean} [options.store] - Save order mapping to db.bot
   * @param {number} [options.userId] - TBL user id for store
   * @returns {Promise<Object>} { track_id, payment_url, expired_at, date }
   */
  async createInvoice(options = {}) {
    if (!options.amount && options.amount !== 0) {
      throw new Error('oxapay: createInvoice requires amount');
    }

    const body = Object.assign({}, options);
    delete body.store;
    delete body.userId;

    if (!body.order_id && user && user.id) {
      body.order_id = 'u' + user.id + '_' + Date.now();
    }

    const data = await this._request('POST', '/payment/invoice', { body: body });

    if (options.store && data.track_id) {
      await this._saveOrder({
        trackId: data.track_id,
        orderId: body.order_id || null,
        userId: options.userId || (user && user.id) || null,
        amount: options.amount,
        currency: options.currency || 'USD',
        type: 'invoice',
        status: 'new',
        paymentUrl: data.payment_url || null
      });
    }

    return data;
  },

  /**
   * Generate static deposit address for a network
   * @param {Object} options
   * @param {string} options.network - Blockchain network name
   * @param {string} [options.callback_url]
   * @param {string} [options.order_id]
   * @param {boolean} [options.store]
   * @returns {Promise<Object>} { track_id, network, address, memo, qr_code, date }
   */
  async createStaticAddress(options = {}) {
    if (!options.network) throw new Error('oxapay: createStaticAddress requires network');

    const body = Object.assign({}, options);
    delete body.store;
    delete body.userId;

    const data = await this._request('POST', '/payment/static-address', { body: body });

    if (options.store && data.track_id) {
      await this._saveOrder({
        trackId: data.track_id,
        orderId: body.order_id || null,
        userId: options.userId || (user && user.id) || null,
        type: 'static_address',
        network: data.network,
        address: data.address,
        status: 'active'
      });
    }

    return data;
  },

  /**
   * Get payment details by track_id
   * @param {string|number} trackId
   * @returns {Promise<Object>}
   */
  async getPayment(trackId) {
    if (!trackId) throw new Error('oxapay: getPayment requires trackId');
    return await this._request('GET', '/payment/' + String(trackId));
  },

  /**
   * List payments with optional filters
   * @param {Object} [query] - track_id, status, type, page, size, from_date, to_date, etc.
   * @returns {Promise<Object>} { list, meta }
   */
  async listPayments(query = {}) {
    return await this._request('GET', '/payment', { query: query });
  },

  /**
   * Poll until paid or timeout
   * @param {string} trackId
   * @param {Object} [options]
   * @param {number} [options.maxAttempts=5]
   * @param {number} [options.delayMs=2000]
   * @returns {Promise<{ok:boolean, paid:boolean, payment:Object|null}>}
   */
  async waitForPaid(trackId, options = {}) {
    const maxAttempts = options.maxAttempts || 5;
    const delayMs = options.delayMs || 2000;

    for (let i = 0; i < maxAttempts; i++) {
      const payment = await this.getPayment(trackId);
      if (this.isPaid(payment.status)) {
        return { ok: true, paid: true, payment: payment };
      }
      if (this.isFailed(payment.status) || this.isExpired(payment.status)) {
        return { ok: true, paid: false, payment: payment };
      }
      if (i < maxAttempts - 1 && typeof sleep === 'function') {
        await sleep(delayMs);
      }
    }

    const last = await this.getPayment(trackId);
    return { ok: true, paid: this.isPaid(last.status), payment: last };
  },

  /**
   * Parse webhook JSON body
   * @param {string|Object} rawBody
   * @returns {Object|null}
   */
  parseWebhook(rawBody) {
    if (!rawBody) return null;
    if (typeof rawBody === 'object') return rawBody;
    try {
      return JSON.parse(String(rawBody));
    } catch (e) {
      return null;
    }
  },

  /**
   * Validate OxaPay webhook HMAC-SHA512 signature
   * @param {string} rawBody - Exact raw POST body string
   * @param {string} hmacHeader - Value of HMAC header from request
   * @param {Object} [options]
   * @param {string} [options.merchantKey] - Override merchant key
   * @param {string} [options.payoutKey] - Override payout key
   * @param {string} [options.type] - Force payment type: invoice|payout
   * @returns {{valid:boolean, data:Object|null, error:string|null}}
   */
  validateWebhook(rawBody, hmacHeader, options = {}) {
    try {
      if (!rawBody || !hmacHeader) {
        throw new Error('Missing raw body or HMAC header');
      }

      const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      const data = this.parseWebhook(bodyStr);
      if (!data || !data.type) {
        throw new Error('Invalid webhook JSON or missing type');
      }

      let secret = options.merchantKey || this._config.merchantKey;
      if (data.type === PAYOUT_TYPE) {
        secret = options.payoutKey || this._config.payoutKey || secret;
      } else if (PAYMENT_TYPES.indexOf(data.type) === -1 && options.type) {
        secret = options.type === PAYOUT_TYPE
          ? (options.payoutKey || this._config.payoutKey || secret)
          : (options.merchantKey || this._config.merchantKey);
      }

      if (!secret) {
        throw new Error('API key not configured for webhook validation');
      }

      const computed = crypto.createHmac('sha512', secret)
        .update(bodyStr)
        .digest('hex');

      if (computed !== hmacHeader) {
        throw new Error('Invalid HMAC signature');
      }

      return { valid: true, data: data, error: null };
    } catch (err) {
      return { valid: false, data: null, error: err.message || String(err) };
    }
  },

  /** Webhook handler must return this body with HTTP 200 */
  webhookResponse() {
    return 'ok';
  },

  isPaid(status) {
    return String(status || '').toLowerCase() === 'paid';
  },

  isPaying(status) {
    return String(status || '').toLowerCase() === 'paying';
  },

  isExpired(status) {
    const s = String(status || '').toLowerCase();
    return s === 'expired' || s === 'expire';
  },

  isFailed(status) {
    const s = String(status || '').toLowerCase();
    return s === 'failed' || s === 'fail';
  },

  isPayout(type) {
    return String(type || '').toLowerCase() === PAYOUT_TYPE;
  },

  /**
   * Build inline pay button row
   * @param {string} paymentUrl
   * @param {string} [text='Pay now']
   * @returns {Array<Array<Object>>}
   */
  payButton(paymentUrl, text = 'Pay now') {
    if (!paymentUrl) return [];
    return [[{ text: text, url: paymentUrl }]];
  },

  _orderKey(orderId) {
    return PREFIX + 'ord:' + String(orderId);
  },

  _trackKey(trackId) {
    return PREFIX + 'trk:' + String(trackId);
  },

  async _dbSet(key, value) {
    const res = await db.bot.set(key, value, { type: 'object' });
    if (!res.ok) throw new Error(res.message || 'oxapay: storage write failed');
    return res;
  },

  async _saveOrder(record) {
    const payload = Object.assign({ updatedAt: Date.now() }, record);
    if (record.orderId) {
      await this._dbSet(this._orderKey(record.orderId), payload);
    }
    if (record.trackId) {
      await this._dbSet(this._trackKey(record.trackId), payload);
    }
    return payload;
  },

  /**
   * Load stored order by order_id or track_id
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getStoredOrder(id) {
    if (!id) return null;
    let data = await db.bot.get(this._orderKey(id), null);
    if (data) return data;
    return await db.bot.get(this._trackKey(id), null);
  },

  /**
   * Update stored order status from webhook or poll
   * @param {string} trackId
   * @param {string} status
   * @param {Object} [extra]
   */
  async updateStoredOrder(trackId, status, extra = {}) {
    const existing = await this.getStoredOrder(trackId);
    if (!existing) return null;
    const updated = Object.assign({}, existing, extra, {
      trackId: trackId,
      status: status,
      updatedAt: Date.now()
    });
    return await this._saveOrder(updated);
  }
};

module.exports = oxapay;

// last updated: 07/07/26
// _v: 0.1.0
// type: asynchronous
