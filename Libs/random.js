//random lib 
module.exports = {
  randomInt: (min, max, inclusive = true) => 
    Math.floor(Math.random() * (max - min + (inclusive ? 1 : 0))) + min,

  randomFloat: (min, max, precision = Infinity) => 
    Number((Math.random() * (max - min) + min).toFixed(precision)),

  randomChoice: (arr, count = 1, unique = false) => {
    if (count === 1) return arr[Math.floor(Math.random() * arr.length)];
    const result = [];
    const source = unique ? [...arr] : arr;
    for (let i = 0; i < Math.min(count, arr.length); i++) {
      const idx = Math.floor(Math.random() * source.length);
      result.push(source[unique ? source.splice(idx, 1)[0] : idx]);
    }
    return result;
  },
  randomString: (length = 10, options = {}) => {
    const { charset = 'alphanumeric', custom = '' } = options;
    const sets = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      numeric: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };
    const chars = custom || sets[charset] || sets.alphanumeric;
    return Array.from({ length }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  },

  randomBoolean: (probability = 0.5) => Math.random() < probability,

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

  randomRange: (min, max, step = 0) => {
    const range = max - min;
    return step ? 
      min + Math.floor(Math.random() * (range / step + 1)) * step :
      Math.random() * range + min;
  },

  randomDate: (startDate, endDate, format = null) => {
    const date = new Date(startDate.getTime() + 
      Math.random() * (endDate.getTime() - startDate.getTime()));
    return format ? date.toLocaleString('en-US', format) : date;
  },

  randomColor: (type = 'hex', alpha = false) => {
    const r = () => Math.floor(Math.random() * 256);
    const formats = {
      hex: () => `#${[r(), r(), r()].map(n => n.toString(16).padStart(2, '0')).join('')}${alpha ? r().toString(16).padStart(2, '0') : ''}`,
      rgb: () => `rgb${alpha ? 'a' : ''}(${r()}, ${r()}, ${r()}${alpha ? `, ${Math.random().toFixed(2)}` : ''})`,
      hsl: () => `hsl${alpha ? 'a' : ''}(${Math.floor(Math.random() * 360)}, ${r()}%, ${r()}%${alpha ? `, ${Math.random().toFixed(2)}` : ''})`
    };
    return (formats[type] || formats.hex)();
  },

  randomShuffle: (arr, inPlace = false) => {
    const target = inPlace ? arr : [...arr];
    for (let i = target.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [target[i], target[j]] = [target[j], target[i]];
    }
    return target;
  },

  randomWeighted: (items, weights, normalize = false) => {
    const total = normalize ? weights.reduce((s, w) => s + w, 0) : 1;
    let sum = 0;
    const r = Math.random() * total;
    return items.find((_, i) => (sum += weights[i]) >= r);
  },

  randomUniqueInts: (min, max, count, sorted = false) => {
    const set = new Set();
    while (set.size < Math.min(count, max - min + 1)) {
      set.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    const result = Array.from(set);
    return sorted ? result.sort((a, b) => a - b) : result;
  },

  randomPassword: (length = 12, options = {}) => {
    const { upper = 2, lower = 2, numbers = 2, special = 2 } = options;
    const chars = {
      u: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      l: 'abcdefghijklmnopqrstuvwxyz',
      n: '0123456789',
      s: '!@#$%^&*()_+-=[]{}|;:,.<>?'
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
    return shuffle(pwd + module.exports.randomString(length - pwd.length));
  },

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

  randomGeoPoint: (latRange = [-90, 90], lonRange = [-180, 180], precision = 6) => ({
    latitude: Number((Math.random() * (latRange[1] - latRange[0]) + latRange[0]).toFixed(precision)),
    longitude: Number((Math.random() * (lonRange[1] - lonRange[0]) + lonRange[0]).toFixed(precision))
  }),

  randomNormal: (mean = 0, stdDev = 1, truncate = [-Infinity, Infinity]) => {
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const result = mean + stdDev * z;
    return Math.max(truncate[0], Math.min(truncate[1], result));
  },

  randomSample: (arr, n, weights = null) => {
    if (!weights) return module.exports.randomShuffle([...arr]).slice(0, Math.min(n, arr.length));
    return Array.from({ length: Math.min(n, arr.length) }, () => 
      module.exports.randomWeighted(arr, weights.splice(0, arr.length)));
  },

  randomIp: (v = 4) => {
    return v === 6 ? 
      Array(8).fill().map(() => Math.floor(Math.random() * 65536).toString(16)).join(':') :
      Array(4).fill().map(() => Math.floor(Math.random() * 256)).join('.');
  },

  randomSequence: (length, generator = module.exports.randomInt, args = [0, 9]) => 
    Array.from({ length }, () => generator(...args)),

  randomNoise: (length, amplitude = 1, frequency = 1) => 
    Array.from({ length }, (_, i) => 
      amplitude * Math.sin(frequency * i + Math.random() * 0.1)),

  randomExponential: (lambda = 1) => 
    -Math.log(1 - Math.random()) / lambda,

  randomBinomial: (n, p) => {
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) successes++;
    }
    return successes;
  },

  randomPermutation: (n) => {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  randomMatrix: (rows, cols, generator = module.exports.randomFloat, args = [0, 1]) => 
    Array.from({ length: rows }, () => 
      Array.from({ length: cols }, () => generator(...args))),


  randomToken: (length = 32) => 
    Array.from({ length }, () => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),


  randomEmail: (domains = ['gmail.com', 'yahoo.com', 'hotmail.com']) => 
    `${module.exports.randomString(module.exports.randomInt(5, 15))}@${module.exports.randomChoice(domains)}`,

  randomLorem: (words = 10) => {
    const lorem = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    return module.exports.randomSample(lorem, words).join(' ')
  }
};
