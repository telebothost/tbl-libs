# ResourcesLib Documentation

A flexible resource management library for handling numeric resources with growth/decay functionality.

## Installation

```javascript
const ResourcesLib = Libs.ResourcesLib;
// Now u can use ResourcesLib.xxx()
```

## Core Concepts

- **Resources**: Numeric values that can grow/decay over time
- **Growth Types**:
  - Simple (fixed amount per interval)
  - Percent (percentage of base value)
  - Compound Interest (exponential growth)

## Resource Creation Methods

### User Resources

```javascript
// Current user's resource
const gold = ResourcesLib.userRes('gold');

// Another user's resource
const friendGold = ResourcesLib.anotherUserRes('gold', friendTelegramId);
```

### Chat Resources

```javascript
// Current chat's resource
const groupPoints = ResourcesLib.chatRes('points');

// Another chat's resource
const otherGroupPoints = ResourcesLib.anotherChatRes('points', otherChatId);
```

## Basic Resource Operations

### Getting/Setting Values

```javascript
// Get current value
const currentGold = gold.value();

// Set value (auto-converts strings to numbers)
gold.set(100); 
gold.set("50"); // automatically converted to 50

// Add to current value
gold.add(25);

// Remove from current value
gold.remove(10);
```

### Checking Resources

```javascript
// Check if has enough
if (gold.have(30)) {
  gold.remove(30);
}

// Force remove (even if negative)
gold.removeAnyway(100);
```

### Transfers Between Resources

```javascript
// Transfer between users
gold.transferTo(friendGold, 20);

// Force transfer
gold.transferToAnyway(friendGold, 50);

// Exchange with different rates
gold.exchangeTo(silver, {
  remove_amount: 1,
  add_amount: 100
});
```

## Growth Management

### Adding Growth

```javascript
// Simple growth (fixed amount)
ResourcesLib.growthFor(gold).add({
  value: 1,          // amount to add
  interval: 60,      // every 60 seconds
  max: 1000          // optional max value
});

// Percentage growth
ResourcesLib.growthFor(gold).addPercent({
  percent: 5,        // 5% of base value
  interval: 300,     // every 5 minutes
  min: 0             // optional min value
});

// Compound interest
ResourcesLib.growthFor(gold).addCompoundInterest({
  percent: 2,        // 2% compound growth
  interval: 3600,    // every hour
  max_iterations_count: 100 // limit to 100 iterations
});
```

### Managing Growth

```javascript
const goldGrowth = ResourcesLib.growthFor(gold);

// Check if growing
if (goldGrowth.isEnabled()) {
  // Get growth info
  const progress = goldGrowth.progress(); // 0-100%
  const timeLeft = goldGrowth.willCompleteAfter(); // seconds
  
  // Stop growth
  goldGrowth.stop();
}
```

## Complete API Reference

### Resource Methods

| Method | Description |
|--------|-------------|
| `.value()` | Get current value |
| `.set(value)` | Set value (auto-converts strings) |
| `.add(amount)` | Add to current value |
| `.have(amount)` | Check if has enough |
| `.remove(amount)` | Remove if enough available |
| `.removeAnyway(amount)` | Force remove |
| `.transferTo(resource, amount)` | Transfer to another resource |
| `.transferToAnyway(resource, amount)` | Force transfer |
| `.exchangeTo(resource, options)` | Exchange with different rates |

### Growth Methods

| Method | Description |
|--------|-------------|
| `.add(options)` | Simple fixed growth |
| `.addPercent(options)` | Percentage growth |
| `.addCompoundInterest(options)` | Compound growth |
| `.stop()` | Stop growth |
| `.isEnabled()` | Check if active |
| `.progress()` | Get current progress (0-100) |
| `.willCompleteAfter()` | Time until next growth |

### Growth Options

| Option | Type | Description |
|--------|------|-------------|
| `value` | number | Amount for simple growth |
| `percent` | number | Percentage for % growth |
| `interval` | number | Seconds between growth |
| `min` | number | Minimum value |
| `max` | number | Maximum value |
| `max_iterations_count` | number | Max growth iterations |

## Example Usage

```javascript
// Setup player resources
const playerGold = ResourcesLib.userRes('gold');
const playerHealth = ResourcesLib.userRes('health');

// Initialize if new player
if (playerGold.value() === 0) {
  playerGold.set(100);
  playerHealth.set(100);
}

// Add passive income
ResourcesLib.growthFor(playerGold).add({
  value: 1,
  interval: 60,
  max: 1000
});

// Health regeneration
ResourcesLib.growthFor(playerHealth).addPercent({
  percent: 2,
  interval: 30,
  max: 100
});

// Combat system
function takeDamage(amount) {
  playerHealth.removeAnyway(amount);
  if (playerHealth.value() <= 0) {
    playerHealth.set(50); // Respawn with 50 health
    playerGold.remove(Math.floor(playerGold.value() * 0.1)); // Lose 10% gold
  }
}
```

## Notes

- All numeric values auto-convert from strings ("100" → 100)
- Resources persist via Bot properties
- Growth calculations happen when `.value()` is called
- Supports both user and chat resources
- Transfer operations validate resource types match

This documentation provides a comprehensive reference for the ResourcesLib functionality while maintaining the original library's behavior and adding clear examples and syntax highlighting.
