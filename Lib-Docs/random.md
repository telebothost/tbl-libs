# 🔀 Random Library Documentation

A comprehensive random value generation library with over 30 specialized methods for all your randomization needs. Because predictable is boring! 🎲

## 🎯 Core Methods

### 1. Basic Randomization
```javascript
// Random integer between min (inclusive) and max (inclusive)
Libs.random.randomInt(1, 10); // e.g. 7

// Random float between min (inclusive) and max (exclusive)
Libs.random.randomFloat(0, 1); // e.g. 0.57382

// Random boolean with custom probability
Libs.random.randomBoolean(0.3); // 30% chance of true
```

### 2. Collection Operations
```javascript
// Single random element from array
Libs.random.randomChoice(['red', 'green', 'blue']); 

// Multiple unique random elements
Libs.random.randomChoice([1,2,3,4,5], 3, true);

// Shuffle array (optionally in-place)
Libs.random.randomShuffle([1,2,3,4,5]);

// Weighted random selection
const prizes = ['gold', 'silver', 'bronze'];
const weights = [1, 3, 10];
Libs.random.randomWeighted(prizes, weights);
```

### 3. String Generation
```javascript
// Random alphanumeric string
Libs.random.randomString(12); 

// Custom charset string
Libs.random.randomString(8, {charset: 'numeric'});

// Secure password with guaranteed character types
Libs.random.randomPassword(16, {
  upper: 3,
  lower: 3,
  numbers: 2,
  special: 2
});
```

### 4. Specialized Generators
```javascript
// Random UUID v4
Libs.random.randomUuid(); 

// Random geographic coordinates
Libs.random.randomGeoPoint(); 

// Random IP address
Libs.random.randomIp(6); // IPv6

// Random date in range
const start = new Date(2020, 0, 1);
const end = new Date();
Libs.random.randomDate(start, end);
```

## 📊 Statistical Distributions

```javascript
// Normal distribution (Gaussian)
Libs.random.randomNormal(0, 1); 

// Exponential distribution
Libs.random.randomExponential(0.5);

// Binomial distribution
Libs.random.randomBinomial(10, 0.7);

// Random walk sequence
Libs.random.randomWalk(100);
```

## 🎨 Creative Generators

```javascript
// Random color in different formats
Libs.random.randomColor('rgb', true); // RGBA

// Random matrix
Libs.random.randomMatrix(3, 3); // 3x3 matrix

// Random lorem ipsum text
Libs.random.randomLorem(15); // 15 words

// Random email address
Libs.random.randomEmail(['company.com', 'test.org']);
```

## 🔢 Advanced Number Generation

```javascript
// Multiple unique random integers
Libs.random.randomUniqueInts(1, 100, 5, true); // sorted

// Number in range with step
Libs.random.randomRange(0, 100, 5); // e.g. 0, 5, 10...

// Random sequence
Libs.random.randomSequence(10, Libs.random.randomInt, [1, 100]);
```

## 🏆 Method Reference Cheat Sheet

| Method | Description | Example |
|--------|-------------|---------|
| `randomInt(min, max)` | Random integer in range | `randomInt(1, 6)` → 4 |
| `randomFloat(min, max)` | Random float in range | `randomFloat(0, 1)` → 0.723 |
| `randomChoice(arr)` | Random array element | `randomChoice(['a','b','c'])` → 'b' |
| `randomString(length)` | Random string | `randomString(8)` → "xY7fq2P9" |
| `randomBoolean()` | Random true/false | `randomBoolean()` → true |
| `randomShuffle(arr)` | Shuffled array | `randomShuffle([1,2,3])` → [2,1,3] |
| `randomWeighted(items, weights)` | Weighted selection | `randomWeighted(['a','b'], [1,9])` → 'b' |
| `randomUuid()` | Random UUID | `randomUuid()` → "f47ac..." |
| `randomColor(type)` | Random color | `randomColor('hex')` → "#a3f5c2" |
| `randomPassword()` | Strong password | `randomPassword(12)` → "Xk8@qL3#pY9!" |
| `randomNormal(mean, stdDev)` | Normal distribution | `randomNormal(0, 1)` → -0.342 |
| `randomDate(start, end)` | Random date in range | `randomDate(start, end)` → Date |
| `randomIp(version)` | Random IP address | `randomIp(4)` → "192.168.1.1" |

## 🚀 Practical Examples

### 1. Dice Roll Simulation
```javascript
const roll = Libs.random.randomInt(1, 6);
Bot.sendMessage(`🎲 You rolled a ${roll}!`);
```

### 2. Random User Generator
```javascript
const user = {
  id: Libs.random.randomUuid(),
  name: Libs.random.randomChoice(['Alice','Bob','Charlie']),
  age: Libs.random.randomInt(18, 65),
  email: Libs.random.randomEmail(),
  joined: Libs.random.randomDate(
    new Date(2020, 0, 1), 
    new Date()
  )
};
```

### 3. Lottery Number Generator
```javascript
const numbers = Libs.random.randomUniqueInts(1, 50, 6, true);
Bot.sendMessage(`Your lucky numbers: ${numbers.join(', ')}`);
```

### 4. Password Reset Token
```javascript
const token = Libs.random.randomString(32, {
  charset: 'alphanumeric'
});
User.setProperty('reset_token', token);
```

### 5. Random Test Data
```javascript
const testData = Libs.random.randomMatrix(5, 3, Libs.random.randomFloat, [0, 100]);
// Generates 5x3 matrix of random floats
```

This library provides endless possibilities for adding randomness to your applications - from games and simulations to security and testing! 🎰
