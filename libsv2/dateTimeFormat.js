/**
 * DateTimeFormat - date/time formatting and manipulation library for TBL runtime 
 * @module dateTimeFormat
 */
const dateTimeFormat = {
  // Pre-compiled regex patterns
  _tokenRegex: /d{1,4}|m{1,4}|s{1,2}|M{1,2}|H{1,2}|yyyy{1,4}|y{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
  _timezoneRegex: /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
  _timezoneClipRegex: /[^-+\dA-Z]/g,

  _locales: {
  en: {
    dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  },
  hi: {
    dayNames: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    monthNames: ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस", "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"]
  }
},
// For days 0-6 are short, 7-13 long names 
//For months 0-11 short, 12-23 long names

  // Pre-defined format masks
  masks: {
    default: "ddd mmm dd yyyy HH:MM:ss",
    shortDate: "m/d/yy",
    mediumDate: "mmm d, yyyy",
    longDate: "mmmm d, yyyy",
    fullDate: "dddd, mmmm d, yyyy",
    shortTime: "h:MM TT",
    mediumTime: "h:MM:ss TT",
    longTime: "h:MM:ss TT Z",
    isoDate: "yyyy-mm-dd",
    isoTime: "HH:MM:ss",
    isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
    custom: "yyyy-mm-dd HH:MM:ss Z"
  },

  /**
   * Pad a string or number with leading zeros
   * @private
   * @param {string|number} val - Value to pad
   * @param {number} len - Desired length
   * @returns {string} Padded string
   */
  _pad: function(val, len = 2) {
    val = String(val);
    while (val.length < len) val = "0" + val;
    return val;
  },

  /**
   * Register or update a locale
   * @param {string} localeCode - Locale code (e.g., 'es', 'fr', 'de')
   * @param {Object} localeData - Locale data object
   * @param {string[]} localeData.dayNames - Short day names (7 items: Sun-Sat)
   * @param {string[]} localeData.monthNames - Short month names (12 items: Jan-Dec)
   * @returns {Object} The library instance for chaining
   * @example
   * dateTimeFormat.registerLocale('es', {
   *   dayNames: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
   *   monthNames: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
   * });
   */
  registerLocale: function(localeCode, localeData) {
    // Validate required fields
    if (!localeData.dayNames || !localeData.monthNames) {
      throw new Error("Locale must include dayNames and monthNames arrays");
    }
    
    if (localeData.dayNames.length !== 7) {
      throw new Error("dayNames must have exactly 7 items (Sunday to Saturday)");
    }
    
    if (localeData.monthNames.length !== 12) {
      throw new Error("monthNames must have exactly 12 items (January to December)");
    }
    
    // Generate full names (capitalized versions for dddd and mmmm)
    const fullDayNames = localeData.dayNames.map(name => {
      return name.charAt(0).toUpperCase() + name.slice(1);
    });
    
    const fullMonthNames = localeData.monthNames.map(name => {
      return name.charAt(0).toUpperCase() + name.slice(1);
    });
    
    this._locales[localeCode] = {
      dayNames: [...localeData.dayNames, ...fullDayNames],
      monthNames: [...localeData.monthNames, ...fullMonthNames]
    };
    
    return this;
  },

  /**
   * Get current locale data
   * @param {string} localeCode - Locale code
   * @returns {Object|null} Locale data or null if not found
   */
  getLocale: function(localeCode) {
    return this._locales[localeCode] || null;
  },

  /**
   * Get list of available locales
   * @returns {string[]} Array of locale codes
   */
  getAvailableLocales: function() {
    return Object.keys(this._locales);
  },

  /**
   * Format a date according to the given mask
   * @private
   * @param {Date} date - Date object to format
   * @param {string} mask - Format mask
   * @param {boolean} utc - Use UTC time
   * @param {string} locale - Locale for names
   * @returns {string} Formatted date string
   */
  _formatDate: function(date, mask, utc, locale) {
    const self = dateTimeFormat;
    const method = utc ? "getUTC" : "get";
    
    const d = date[method + "Date"]();
    const D = date[method + "Day"]();
    const m = date[method + "Month"]();
    const y = date[method + "FullYear"]();
    const H = date[method + "Hours"]();
    const M = date[method + "Minutes"]();
    const s = date[method + "Seconds"]();
    const L = date[method + "Milliseconds"]();
    const o = utc ? 0 : date.getTimezoneOffset();
    const i18n = self._locales[locale] || self._locales.en;

    const flags = {
      d: d,
      dd: self._pad(d),
      ddd: i18n.dayNames[D],
      dddd: i18n.dayNames[D + 7],
      m: m + 1,
      mm: self._pad(m + 1),
      mmm: i18n.monthNames[m],
      mmmm: i18n.monthNames[m + 12],
      yy: String(y).slice(2),
      yyyy: y,
      h: H % 12 || 12,
      hh: self._pad(H % 12 || 12),
      H: H,
      HH: self._pad(H),
      M: M,
      MM: self._pad(M),
      s: s,
      ss: self._pad(s),
      l: self._pad(L, 3),
      L: self._pad(L > 99 ? Math.round(L / 10) : L, 2),
      t: H < 12 ? "a" : "p",
      tt: H < 12 ? "am" : "pm",
      T: H < 12 ? "A" : "P",
      TT: H < 12 ? "AM" : "PM",
      Z: utc ? "UTC" : (String(date).match(self._timezoneRegex) || [""]).pop().replace(self._timezoneClipRegex, ""),
      o: (o > 0 ? "-" : "+") + self._pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
      S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 !== 10) * d % 10]
    };

    return mask.replace(self._tokenRegex, function(match) {
      return match in flags ? flags[match] : match.slice(1, -1);
    });
  },

  /**
   * Format a date string
   * @param {Date|string|number} [date] - Date to format (defaults to current date)
   * @param {string} [mask="default"] - Format mask or named mask
   * @param {boolean} [utc=false] - Use UTC timezone
   * @param {string} [locale="en"] - Locale (currently only 'en' supported)
   * @returns {string} Formatted date string
   * @throws {Error} If date is invalid
   * @example
   * dateTimeFormat.format(new Date(), "yyyy-mm-dd")
   * dateTimeFormat.format("2024-01-01", "mmmm d, yyyy")
   */
  format: function(date, mask = "default", utc = false, locale = "en") {
    const inputDate = date ? new Date(date) : new Date();
    
    if (isNaN(inputDate.getTime())) {
      throw new Error("Invalid date");
    }

    let formatMask = this.masks[mask] || mask || this.masks.default;
    
    if (formatMask.startsWith("UTC:")) {
      formatMask = formatMask.slice(4);
      utc = true;
    }

    return this._formatDate(inputDate, formatMask, utc, locale);
  },

  /**
   * Get current formatted date/time
   * @param {string} [mask="default"] - Format mask
   * @param {boolean} [utc=false] - Use UTC timezone
   * @param {string} [locale="en"] - Locale
   * @returns {string} Current formatted date
   */
  getCurrentDate: function(mask = "default", utc = false, locale = "en") {
    return this.format(new Date(), mask, utc, locale);
  },

  /**
   * Add days to a date
   * @param {Date|string|number} date - Original date
   * @param {number} days - Number of days to add
   * @returns {Date} New date object
   */
  addDays: function(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Subtract days from a date
   * @param {Date|string|number} date - Original date
   * @param {number} days - Number of days to subtract
   * @returns {Date} New date object
   */
  subtractDays: function(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  },

  /**
   * Add time units to a date
   * @param {Date|string|number} date - Original date
   * @param {Object} units - Time units to add
   * @param {number} [units.years=0] - Years to add
   * @param {number} [units.months=0] - Months to add
   * @param {number} [units.days=0] - Days to add
   * @param {number} [units.hours=0] - Hours to add
   * @param {number} [units.minutes=0] - Minutes to add
   * @param {number} [units.seconds=0] - Seconds to add
   * @returns {Date} New date object
   */
  addTime: function(date, { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 }) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    result.setMonth(result.getMonth() + months);
    result.setDate(result.getDate() + days);
    result.setHours(result.getHours() + hours);
    result.setMinutes(result.getMinutes() + minutes);
    result.setSeconds(result.getSeconds() + seconds);
    return result;
  },

  /**
   * Subtract time units from a date
   * @param {Date|string|number} date - Original date
   * @param {Object} units - Time units to subtract
   * @param {number} [units.years=0] - Years to subtract
   * @param {number} [units.months=0] - Months to subtract
   * @param {number} [units.days=0] - Days to subtract
   * @param {number} [units.hours=0] - Hours to subtract
   * @param {number} [units.minutes=0] - Minutes to subtract
   * @param {number} [units.seconds=0] - Seconds to subtract
   * @returns {Date} New date object
   */
  subtractTime: function(date, { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 }) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() - years);
    result.setMonth(result.getMonth() - months);
    result.setDate(result.getDate() - days);
    result.setHours(result.getHours() - hours);
    result.setMinutes(result.getMinutes() - minutes);
    result.setSeconds(result.getSeconds() - seconds);
    return result;
  },

  /**
   * Check if a date is valid
   * @param {*} date - Date to validate
   * @returns {boolean} True if date is valid
   */
  isValidDate: function(date) {
    return !isNaN(new Date(date).getTime());
  },

  /**
   * Get timezone offset in minutes
   * @param {Date|string|number} [date=new Date()] - Date to check
   * @returns {number} Timezone offset in minutes
   */
  getTimeZoneOffset: function(date = new Date()) {
    return new Date(date).getTimezoneOffset();
  },

  /**
   * Calculate time difference between two dates
   * @param {Date|string|number} date1 - First date
   * @param {Date|string|number} date2 - Second date
   * @returns {Object} Difference in various units
   * @returns {number} return.milliseconds - Difference in milliseconds
   * @returns {number} return.seconds - Difference in seconds
   * @returns {number} return.minutes - Difference in minutes
   * @returns {number} return.hours - Difference in hours
   * @returns {number} return.days - Difference in days
   */
  getTimeDifference: function(date1, date2) {
    const diff = new Date(date2) - new Date(date1);
    return {
      milliseconds: diff,
      seconds: Math.floor(diff / 1000),
      minutes: Math.floor(diff / (1000 * 60)),
      hours: Math.floor(diff / (1000 * 60 * 60)),
      days: Math.floor(diff / (1000 * 60 * 60 * 24))
    };
  },

  /**
   * Convert date to Unix timestamp (seconds since epoch)
   * @param {Date|string|number} date - Date to convert
   * @returns {number} Unix timestamp in seconds
   */
  toUnixTimestamp: function(date) {
    return Math.floor(new Date(date).getTime() / 1000);
  },

  /**
   * Convert Unix timestamp to Date object
   * @param {number} timestamp - Unix timestamp in seconds
   * @returns {Date} Date object
   */
  fromUnixTimestamp: function(timestamp) {
    return new Date(timestamp * 1000);
  },

  /**
   * Get relative time (e.g., "2 days ago", "in 3 hours")
   * @param {Date|string|number} date - Date to compare
   * @param {Date} [now=new Date()] - Reference date
   * @param {string} [locale="en"] - Locale for relative time formatting
   * @returns {string} Human readable relative time
   * @example
   * dateTimeFormat.toRelativeTime("2024-01-01") // "2 months ago"
   * dateTimeFormat.toRelativeTime(new Date(Date.now() + 86400000)) // "tomorrow"
   */
  toRelativeTime: function(date, now = new Date(), locale = "en") {
    const diff = new Date(now) - new Date(date);
    const absDiff = Math.abs(diff);
    const isPast = diff > 0;
    
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      
      if (absDiff < 60000) return rtf.format(isPast ? -Math.round(absDiff / 1000) : Math.round(absDiff / 1000), 'second');
      if (absDiff < 3600000) return rtf.format(isPast ? -Math.round(absDiff / 60000) : Math.round(absDiff / 60000), 'minute');
      if (absDiff < 86400000) return rtf.format(isPast ? -Math.round(absDiff / 3600000) : Math.round(absDiff / 3600000), 'hour');
      if (absDiff < 2592000000) return rtf.format(isPast ? -Math.round(absDiff / 86400000) : Math.round(absDiff / 86400000), 'day');
      if (absDiff < 31536000000) return rtf.format(isPast ? -Math.round(absDiff / 2592000000) : Math.round(absDiff / 2592000000), 'month');
      return rtf.format(isPast ? -Math.round(absDiff / 31536000000) : Math.round(absDiff / 31536000000), 'year');
    } catch (e) {
      // Fallback for unsupported locales, for compatibility 
      const units = [
        { max: 60, unit: 'second', value: 1000 },
        { max: 3600, unit: 'minute', value: 60000 },
        { max: 86400, unit: 'hour', value: 3600000 },
        { max: 2592000, unit: 'day', value: 86400000 },
        { max: 31536000, unit: 'month', value: 2592000000 },
        { max: Infinity, unit: 'year', value: 31536000000 }
      ];
      
      const seconds = absDiff / 1000;
      for (const unit of units) {
        if (seconds < unit.max) {
          const value = Math.round(seconds / (unit.value / 1000));
          return isPast ? `${value} ${unit.unit}${value !== 1 ? 's' : ''} ago` : `in ${value} ${unit.unit}${value !== 1 ? 's' : ''}`;
        }
      }
      return isPast ? 'just now' : 'now';
    }
  }
};

module.exports = dateTimeFormat;

// last updated: 25/04/26
// _v: 1.0.0
// type: synchronous