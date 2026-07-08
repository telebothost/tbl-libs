/**
 * random lib - random value generation library for TBL runtime
 * @module random
 */
const randomLib = {

  _defaultCharsets: {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789abcdef',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    brackets: '(){}[]<>',
    punctuation: '.,;:!?',
    whitespace: ' \t\n'
  },

  /**
   * Generate random integer between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value  
   * @param {boolean} [inclusive=true] - Include max value
   * @returns {number} Random integer
   */
  randomInt: (min, max, inclusive = true) => 
    Math.floor(Math.random() * (max - min + (inclusive ? 1 : 0))) + min,

  /**
   * Generate random float between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} [precision=Infinity] - Decimal precision
   * @returns {number} Random float
   */
  randomFloat: (min, max, precision = Infinity) => 
    Number((Math.random() * (max - min) + min).toFixed(precision)),

  /**
   * Pick random item(s) from array
   * @param {Array} arr - Source array
   * @param {number} [count=1] - Number of items to pick
   * @param {boolean} [unique=false] - Pick unique items
   * @returns {*} Single item or array of items
   */
  randomChoice: (arr, count = 1, unique = false) => {
    if (!arr.length) return null;
    if (count === 1) return arr[Math.floor(Math.random() * arr.length)];
    
    const result = [];
    const source = unique ? [...arr] : arr;
    const maxCount = Math.min(count, arr.length);
    
    for (let i = 0; i < maxCount; i++) {
      const idx = Math.floor(Math.random() * source.length);
      result.push(source[unique ? source.splice(idx, 1)[0] : idx]);
    }
    return result;
  },

  /**
   * Generate random string
   * @param {number} [length=10] - String length
   * @param {Object} [options] - Options
   * @param {string} [options.charset='alphanumeric'] - Predefined charset
   * @param {string} [options.custom] - Custom charset
   * @returns {string} Random string
   */
  randomString: (length = 10, options = {}) => {
    const { charset = 'alphanumeric', custom = '', uppercase = false, lowercase = false } = options;
    let chars = custom || randomLib._defaultCharsets[charset] || randomLib._defaultCharsets.alphanumeric;
    
    if (uppercase) chars = chars.toUpperCase();
    if (lowercase) chars = chars.toLowerCase();
    
    return Array.from({ length }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  },

  /**
   * Generate random boolean
   * @param {number} [probability=0.5] - True probability (0-1)
   * @returns {boolean} Random boolean
   */
  randomBoolean: (probability = 0.5) => Math.random() < probability,

  /**
   * Pick random value from object
   * @param {Object} obj - Source object
   * @param {boolean} [deep=false] - Include nested values
   * @returns {*} Random value
   */
  randomFromObject: (obj, deep = false) => {
    if (!deep) {
      const keys = Object.keys(obj);
      const key = keys[Math.floor(Math.random() * keys.length)];
      return { [key]: obj[key] };
    }
    const values = [];
    const collect = (o) => Object.values(o).forEach(v => 
      typeof v === 'object' && v !== null ? collect(v) : values.push(v));
    collect(obj);
    return values[Math.floor(Math.random() * values.length)];
  },

  /**
   * Generate random number with step
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} [step=0] - Step increment (0 for continuous)
   * @returns {number} Random number
   */
  randomRange: (min, max, step = 0) => {
    const range = max - min;
    if (step === 0) return Math.random() * range + min;
    const steps = Math.floor(range / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
  },

  /**
   * Generate random date between two dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} [format] - Optional formatting options
   * @returns {Date|string} Random date
   */
  randomDate: (startDate, endDate, format = null) => {
    const date = new Date(startDate.getTime() + 
      Math.random() * (endDate.getTime() - startDate.getTime()));
    return format ? date.toLocaleString('en-US', format) : date;
  },

  /**
   * Generate random color
   * @param {string} [type='hex'] - Color type (hex, rgb, hsl)
   * @param {boolean} [alpha=false] - Include alpha channel
   * @returns {string} Random color
   */
  randomColor: (type = 'hex', alpha = false) => {
    const r = () => Math.floor(Math.random() * 256);
    const formats = {
      hex: () => `#${[r(), r(), r()].map(n => n.toString(16).padStart(2, '0')).join('')}${alpha ? r().toString(16).padStart(2, '0') : ''}`,
      rgb: () => `rgb${alpha ? 'a' : ''}(${r()}, ${r()}, ${r()}${alpha ? `, ${Math.random().toFixed(2)}` : ''})`,
      hsl: () => `hsl${alpha ? 'a' : ''}(${Math.floor(Math.random() * 360)}, ${r()}%, ${r()}%${alpha ? `, ${Math.random().toFixed(2)}` : ''})`
    };
    return (formats[type] || formats.hex)();
  },

  /**
   * Shuffle array
   * @param {Array} arr - Array to shuffle
   * @param {boolean} [inPlace=false] - Modify original array
   * @returns {Array} Shuffled array
   */
  randomShuffle: (arr, inPlace = false) => {
    const target = inPlace ? arr : [...arr];
    for (let i = target.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [target[i], target[j]] = [target[j], target[i]];
    }
    return target;
  },

  /**
   * Weighted random selection
   * @param {Array} items - Items to choose from
   * @param {Array} weights - Corresponding weights
   * @param {boolean} [normalize=false] - Auto-normalize weights
   * @returns {*} Selected item
   */
  randomWeighted: (items, weights, normalize = false) => {
    if (!items.length) return null;
    const total = normalize ? weights.reduce((s, w) => s + w, 0) : 1;
    let sum = 0;
    const r = Math.random() * total;
    return items.find((_, i) => (sum += weights[i]) >= r);
  },

  /**
   * Generate unique random integers
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} count - Number of integers
   * @param {boolean} [sorted=false] - Sort result
   * @returns {number[]} Array of unique integers
   */
  randomUniqueInts: (min, max, count, sorted = false) => {
    const maxCount = max - min + 1;
    const actualCount = Math.min(count, maxCount);
    const set = new Set();
    
    while (set.size < actualCount) {
      set.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    
    const result = Array.from(set);
    return sorted ? result.sort((a, b) => a - b) : result;
  },

  /**
   * Generate secure random password
   * @param {number} [length=12] - Password length
   * @param {Object} [options] - Password options
   * @param {number} [options.upper=2] - Minimum uppercase letters
   * @param {number} [options.lower=2] - Minimum lowercase letters
   * @param {number} [options.numbers=2] - Minimum numbers
   * @param {number} [options.special=2] - Minimum special characters
   * @returns {string} Random password
   */
  randomPassword: (length = 12, options = {}) => {
    const { upper = 2, lower = 2, numbers = 2, special = 2 } = options;
    const chars = {
      u: randomLib._defaultCharsets.alpha.toUpperCase(),
      l: randomLib._defaultCharsets.alpha.toLowerCase(),
      n: randomLib._defaultCharsets.numeric,
      s: randomLib._defaultCharsets.symbols
    };
    
    let pwd = '';
    [upper, lower, numbers, special].forEach((n, i) => {
      const key = 'ulns'[i];
      for (let j = 0; j < n; j++) {
        pwd += chars[key][Math.floor(Math.random() * chars[key].length)];
      }
    });
    
    const shuffle = (str) => {
      const a = str.split('');
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.join('');
    };
    
    return shuffle(pwd + randomLib.randomString(length - pwd.length, { charset: 'alphanumeric' }));
  },

  /**
   * Generate UUID
   * @param {number} [version=4] - UUID version (1 or 4)
   * @returns {string} UUID string
   */
  randomUuid: (version = 4) => {
    const v4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    
    const v1 = () => {
      const time = Date.now();
      return `${time.toString(16).padStart(12, '0')}-1xxx-${Math.random().toString(16).slice(2, 6)}-xxxx-xxxxxxxxxxxx`
        .replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
    };
    
    return version === 1 ? v1() : v4();
  },

  /**
   * Generate random geographic point
   * @param {number[]} [latRange=[-90,90]] - Latitude range
   * @param {number[]} [lonRange=[-180,180]] - Longitude range
   * @param {number} [precision=6] - Decimal precision
   * @returns {Object} Geo point {latitude, longitude}
   */
  randomGeoPoint: (latRange = [-90, 90], lonRange = [-180, 180], precision = 6) => ({
    latitude: Number((Math.random() * (latRange[1] - latRange[0]) + latRange[0]).toFixed(precision)),
    longitude: Number((Math.random() * (lonRange[1] - lonRange[0]) + lonRange[0]).toFixed(precision))
  }),

  /**
   * Generate normal distribution value
   * @param {number} [mean=0] - Mean value
   * @param {number} [stdDev=1] - Standard deviation
   * @param {number[]} [truncate=[-Infinity,Infinity]] - Truncation range
   * @returns {number} Normally distributed value
   */
  randomNormal: (mean = 0, stdDev = 1, truncate = [-Infinity, Infinity]) => {
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const result = mean + stdDev * z;
    return Math.max(truncate[0], Math.min(truncate[1], result));
  },

  /**
   * Sample array with or without weights
   * @param {Array} arr - Source array
   * @param {number} n - Number of samples
   * @param {Array} [weights=null] - Sampling weights
   * @returns {Array} Sampled items
   */
  randomSample: (arr, n, weights = null) => {
    const count = Math.min(n, arr.length);
    if (!weights) return randomLib.randomShuffle([...arr]).slice(0, count);
    return Array.from({ length: count }, () => 
      randomLib.randomWeighted(arr, weights.slice(0, arr.length)));
  },

  /**
   * Generate random IP address
   * @param {number} [v=4] - IP version (4 or 6)
   * @returns {string} IP address
   */
  randomIp: (v = 4) => {
    if (v === 6) {
      return Array(8).fill().map(() => Math.floor(Math.random() * 65536).toString(16)).join(':');
    }
    return Array(4).fill().map(() => Math.floor(Math.random() * 256)).join('.');
  },

  /**
   * Generate sequence of random values
   * @param {number} length - Sequence length
   * @param {Function} [generator=randomInt] - Generator function
   * @param {Array} [args=[0,9]] - Generator arguments
   * @returns {Array} Random sequence
   */
  randomSequence: (length, generator = randomLib.randomInt, args = [0, 9]) => 
    Array.from({ length }, () => generator(...args)),

  /**
   * Generate noise array (sine wave with randomness)
   * @param {number} length - Array length
   * @param {number} [amplitude=1] - Noise amplitude
   * @param {number} [frequency=1] - Noise frequency
   * @returns {number[]} Noise array
   */
  randomNoise: (length, amplitude = 1, frequency = 1) => 
    Array.from({ length }, (_, i) => 
      amplitude * Math.sin(frequency * i + Math.random() * 0.1)),

  /**
   * Generate exponential distribution
   * @param {number} [lambda=1] - Rate parameter
   * @returns {number} Exponentially distributed value
   */
  randomExponential: (lambda = 1) => 
    -Math.log(1 - Math.random()) / lambda,

  /**
   * Generate binomial distribution
   * @param {number} n - Number of trials
   * @param {number} p - Success probability
   * @returns {number} Binomial distribution value
   */
  randomBinomial: (n, p) => {
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) successes++;
    }
    return successes;
  },

  /**
   * Generate random permutation of numbers
   * @param {number} n - Length of permutation
   * @returns {number[]} Permutation array
   */
  randomPermutation: (n) => {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Generate random matrix
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @param {Function} [generator=randomFloat] - Value generator
   * @param {Array} [args=[0,1]] - Generator arguments
   * @returns {Array[]} Matrix array
   */
  randomMatrix: (rows, cols, generator = randomLib.randomFloat, args = [0, 1]) => 
    Array.from({ length: rows }, () => 
      Array.from({ length: cols }, () => generator(...args))),

  /**
   * Generate random hex token
   * @param {number} [length=32] - Token length
   * @returns {string} Hex token
   */
  randomToken: (length = 32) => 
    Array.from({ length }, () => 
      randomLib._defaultCharsets.hex[Math.floor(Math.random() * 16)]).join(''),

  /**
   * Generate random email
   * @param {string[]} [domains=['gmail.com', 'yahoo.com', 'hotmail.com']] - Domain list
   * @returns {string} Random email
   */
  randomEmail: (domains = ['gmail.com', 'yahoo.com', 'hotmail.com']) => 
    `${randomLib.randomString(randomLib.randomInt(5, 15), { lowercase: true })}@${randomLib.randomChoice(domains)}`,

  /**
   * Generate random lorem ipsum text
   * @param {number} [words=10] - Number of words
   * @returns {string} Random text
   */
  randomLorem: (words = 10) => {
    const lorem = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    return randomLib.randomSample(lorem, words).join(' ');
  },

  /**
   * Generate random phone number
   * @param {string} [format='XXX-XXX-XXXX'] - Phone format (X = digit)
   * @returns {string} Random phone number
   */
  randomPhone: (format = 'XXX-XXX-XXXX') => 
    format.replace(/X/g, () => Math.floor(Math.random() * 10).toString()),

  /**
   * Generate random credit card number
   * @param {string} [prefix='4'] - Card prefix (4=Visa, 5=Mastercard)
   * @returns {string} Random card number
   */
   // Note: For test, it doesn't genarate valid credit card numbers 

  randomCreditCard: (prefix = '4') => {
    let card = prefix;
    while (card.length < 15) {
      card += Math.floor(Math.random() * 10);
    }
    // Simple Luhn check digit calculation
    let sum = 0;
    for (let i = 0; i < card.length; i++) {
      let digit = parseInt(card[i]);
      if ((card.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return card + checkDigit;
  },

  /**
   * Generate random name
   * @param {string} [gender='any'] - Gender (male, female, any)
   * @returns {string} Random name
   */
  randomName: (gender = 'any') => {
    const names = {
      male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles'],
      female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen']
    };
    const all = [...names.male, ...names.female];
    if (gender === 'male') return randomLib.randomChoice(names.male);
    if (gender === 'female') return randomLib.randomChoice(names.female);
    return randomLib.randomChoice(all);
  },

  /**
   * Generate random address
   * @returns {Object} Random address
   */
  randomAddress: () => ({
    street: `${randomLib.randomInt(1, 9999)} ${randomLib.randomChoice(['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Lake', 'Hill', 'Park'])} ${randomLib.randomChoice(['St', 'Ave', 'Rd', 'Blvd', 'Ln', 'Dr', 'Way'])}`,
    city: randomLib.randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']),
    state: randomLib.randomChoice(['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']),
    zipCode: randomLib.randomInt(10000, 99999).toString()
  }),

  /**
   * Generate random weighted number
   * @param {Object} weights - Weight mapping {value: weight}
   * @returns {*} Weighted random value
   */
  randomWeightedValue: (weights) => {
    const items = Object.keys(weights);
    const weightValues = Object.values(weights);
    return randomLib.randomWeighted(items, weightValues);
  },

  /**
   * Generate random bytes array
   * @param {number} length - Number of bytes
   * @returns {number[]} Bytes array
   */
  randomBytes: (length) => 
    Array.from({ length }, () => Math.floor(Math.random() * 256))
};

module.exports = randomLib;

// last updated: 25/04/26
// _v: 1.0.0
// type: synchronous