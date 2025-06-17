# Resources Library Documentation

## Overview
A comprehensive resource management system for Telegram bots that handles:
- Resource tracking (numeric values)
- Resource growth over time (simple, percentage, compound interest)
- Resource transfers between users/chats
- Complex resource exchanges

## Core Concepts

### Resource Types
1. **User Resources** - Bound to individual users
2. **Chat Resources** - Bound to chat groups
3. **Growth Resources** - Resources that increase automatically over time

## Basic Usage

### Creating Resources
```javascript
// User resource
const coins = Libs.ResourcesLib.createUserResource("coins");

// Chat resource 
const groupFunds = Libs.ResourcesLib.createChatResource("funds");

// Other user's resource
const otherUserCoins = Libs.ResourcesLib.createOtherUserResource("coins", 123456789);
```

### Basic Operations
```javascript
// Set initial value
coins.set(100);

// Add resources
coins.add(50); 

// Check balance
const balance = coins.value();

// Remove resources
coins.remove(30);

// Check if has enough
if (coins.have(20)) {
  coins.remove(20);
}
```

## Resource Growth System

### Growth Types
1. **Simple Growth** - Fixed amount per interval
2. **Percentage Growth** - Percentage of base value per interval  
3. **Compound Interest** - Exponential growth

### Managing Growth
```javascript
// Start simple growth (+5 every 10 seconds)
coins.growth.add({
  value: 5,
  interval: 10
});

// Start percentage growth (1% every 60 seconds) 
coins.growth.addPercent({
  percent: 1,
  interval: 60
});

// Start compound interest (0.5% every 300 seconds)
coins.growth.addCompoundInterest({
  percent: 0.5,
  interval: 300
});

// Stop growth
coins.growth.stop();
```

### Growth Options
```javascript
{
  value: 5,            // Fixed amount (for simple growth)
  percent: 1,          // Percentage (for % growth)
  interval: 60,        // Seconds between growth
  min: 0,              // Minimum value
  max: 1000,           // Maximum value
  max_iterations_count: 100  // Max growth cycles
}
```

## Resource Transfers

### Basic Transfers
```javascript
// Safe transfer (checks balance)
coins.safeTransfer(user2Coins, 10);

// Force transfer (no balance check)
coins.forceTransfer(user2Coins, 10);
```

### Advanced Transfers
```javascript
// Exchange resources (different amounts)
coins.exchange(gems, {
  remove_amount: 10,  // Remove 10 coins
  add_amount: 1       // Add 1 gem
});

// Different resources transfer
resources.transferDifferent(
  fromResource, 
  toResource,
  removeAmount,
  addAmount
);
```

## Error Handling

Common errors and solutions:

1. **Not enough resources**
```javascript
try {
  coins.remove(100);
} catch (e) {
  // Handle insufficient funds
}
```

2. **Invalid values**
```javascript
try {
  coins.add("100"); // Wrong type
} catch (e) {
  // Handle type error
}
```

## Best Practices

1. Always validate resources exist before operations
2. Use try-catch for critical transfers
3. Set reasonable growth limits (min/max)
4. Store resource names as constants
5. Monitor growth resources periodically

## Complete API Reference

### Resource Methods
| Method | Description |
|--------|-------------|
| `value()` | Get current value |
| `set(amount)` | Set absolute value |
| `add(amount)` | Add resources |
| `remove(amount)` | Remove resources (throws if insufficient) |
| `have(amount)` | Check if has enough |
| `removeAnyway(amount)` | Remove without check |

### Growth Methods
| Method | Description |
|--------|-------------|
| `add(options)` | Simple growth |
| `addPercent(options)` | Percentage growth |
| `addCompoundInterest(options)` | Compound growth |
| `stop()` | Stop growth |
| `title()` | Get growth description |
| `progress()` | Get current progress % |
| `willCompleteAfter()` | Time until next growth |

### Transfer Methods
| Method | Description |
|--------|-------------|
| `safeTransfer(to, amount)` | Transfer with checks |
| `forceTransfer(to, amount)` | Transfer without checks |
| `exchange(to, options)` | Different amount exchange |
| `receiveFrom(from, amount)` | Receive from another resource |
| `sendTo(to, amount)` | Send to another resource |
