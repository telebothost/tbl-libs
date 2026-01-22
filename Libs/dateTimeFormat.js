// dateTimeFormat Lib 

const dateTimeFormat = {
  format: function(date, mask, utc, locale = 'en') {
    const dateFormat = function() {
      const token = /d{1,4}|m{1,4}|s{1,2}|M{1,2}|m{1,4}|H{1,2}|yyyy{1,4}|y{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function(val, len) {
          val = String(val);
          len = len || 2;
          while (val.length < len) val = "0" + val;
          return val;
        },
        locales = {
          en: {
            dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
          }
        };

      return function(date, mask, utc, locale) {
        const dF = dateFormat;

        if (arguments.length === 1 && Object.prototype.toString.call(date) === "[object String]" && !/\d/.test(date)) {
          mask = date;
          date = undefined;
        }

        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        if (mask.slice(0, 4) === "UTC:") {
          mask = mask.slice(4);
          utc = true;
        }

        const _ = utc ? "getUTC" : "get",
          d = date[_ + "Date"](),
          D = date[_ + "Day"](),
          m = date[_ + "Month"](),
          y = date[_ + "FullYear"](),
          H = date[_ + "Hours"](),
          M = date[_ + "Minutes"](),
          s = date[_ + "Seconds"](),
          L = date[_ + "Milliseconds"](),
          o = utc ? 0 : date.getTimezoneOffset(),
          i18n = locales[locale] || locales.en,
          flags = {
            d: d,
            dd: pad(d),
            ddd: i18n.dayNames[D],
            dddd: i18n.dayNames[D + 7],
            m: m + 1,
            mm: pad(m + 1),
            mmm: i18n.monthNames[m],
            mmmm: i18n.monthNames[m + 12],
            yy: String(y).slice(2),
            yyyy: y,
            h: H % 12 || 12,
            hh: pad(H % 12 || 12),
            H: H,
            HH: pad(H),
            M: M,
            MM: pad(M),
            s: s,
            ss: pad(s),
            l: pad(L, 3),
            L: pad(L > 99 ? Math.round(L / 10) : L),
            t: H < 12 ? "a" : "p",
            tt: H < 12 ? "am" : "pm",
            T: H < 12 ? "A" : "P",
            TT: H < 12 ? "AM" : "PM",
            Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
            o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
            S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 !== 10) * d % 10]
          };

        return mask.replace(token, function($0) {
          return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
      };
    }();

    dateFormat.masks = {
      "default": "ddd mmm dd yyyy HH:MM:ss",
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
    };

    return dateFormat(date, mask, utc, locale);
  },

  getCurrentDate: function(mask = "default", utc = false, locale = 'en') {
    return dateTimeFormat.format(new Date(), mask, utc, locale);
  },

  addDays: function(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  subtractDays: function(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  },

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

  isValidDate: function(date) {
    return !isNaN(new Date(date).getTime());
  },

  getTimeZoneOffset: function(date = new Date()) {
    return date.getTimezoneOffset();
  },

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

  toUnixTimestamp: function(date) {
    return Math.floor(new Date(date).getTime() / 1000);
  },

  fromUnixTimestamp: function(timestamp) {
    return new Date(timestamp * 1000);
  }
};

module.exports = dateTimeFormat;
