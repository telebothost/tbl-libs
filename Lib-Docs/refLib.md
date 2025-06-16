
# refLib - Complete Referral Tracking Documentation

## Core Methods

### 1. Initialization
```javascript
// Basic initialization
Libs.refLib.track({
  onAttracted: (referrer) => {
    Bot.sendMessage(
      `🎉 New referral from ${referrer.first_name}!\n` +
      `Their total referrals: ${Libs.refLib.getRefCount(referrer.id)}`
    );
  }
});
```

**Little bit advance**
```js
Libs.refLib.track({
  onAttracted: (referrer) => {
    // Notify both new user and referrer
    Bot.sendMessage(`🎉 Welcome! You were referred by ${referrer.first_name}`);
    
    Api.sendMessage({
      chat_id: referrer.id, // Send to referrer specifically
      text: `🔥 ${user.first_name} just joined using your link!\n` +
            `You now have ${Libs.refLib.getRefCount(referrer.id)} referrals!`
    });
  },
  
  onTouchOwnLink: () => {
    Api.sendMessage({
      chat_id: user.id,
      text: "🔄 That's your own link! Share it with friends instead!"
    });
  },
  
  onAlreadyAttracted: () => {
    const referrer = Libs.refLib.getAttractedBy();
    if (referrer) {
      Bot.sendMessage(
        `You were referred by ${referrer.first_name}\n` +
        `Their total referrals: ${Libs.refLib.getRefCount(referrer.id)}`
      );
    }
  }
});
```

### 2. Generating Referral Links
```javascript
// Simple link
const basicLink = Libs.refLib.getLink();

// Customized link
const promoLink = Libs.refLib.getLink("DealsBot", "promo");

// QR Code example
const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(promoLink)}`;
```

## Data Retrieval Methods

### 1. Get Referral Information
```javascript
// Basic usage
const myReferrals = Libs.refLib.getRefList();

// With filtering
const recentReferrals = myReferrals.filter(ref => {
  const refDate = new Date(ref.date);
  return refDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
});
```

### 2. Leaderboard Access
```javascript
// Get raw leaderboard data
const leaders = Libs.refLib.getTopList();

// Formatted leaderboard
const top10 = Object.entries(leaders)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([userId, count], index) => 
    `${index + 1}. User ${userId}: ${count} referrals`
  ).join("\n");

Bot.sendMessage("🏆 Top Referrers:\n" + top10);
```

## Practical Examples

### Basic Referral Program
```javascript
// Command: /mylink
Bot.sendMessage(
  `🔗 Your referral link:\n${Libs.refLib.getLink()}\n\n` +
  `You have ${Libs.refLib.getRefCount()} referrals!`
);
```

### Advanced Reward System
```javascript
// Track with rewards
Libs.refLib.track({
  onAttracted: (referrer) => {
    const refCount = Libs.refLib.getRefCount(referrer.id);
    
    // Base reward
    let reward = 10;
    
    // Bonus for milestones
    if (refCount % 10 === 0) reward += 50;
    
    Bot.sendMessage(
      `💰 ${user.first_name} joined via ${referrer.first_name}'s link!\n` +
      `🎁 ${referrer.first_name} earned ${reward} points!`
    );
    
    // Update user balance
    const newBalance = Libs.wallet.add(referrer.id, reward);
  }
});
```

### Referral Analytics Dashboard
```javascript
// Command: /referralstats
const stats = `
📊 Your Referral Stats:

👥 Total Referrals: ${Libs.refLib.getRefCount()}
📅 Last 7 Days: ${recentReferrals.length}
🏆 Your Rank: ${getUserRank(user.id)}

🔗 Your Link: ${Libs.refLib.getLink()}
`;

function getUserRank(userId) {
  const leaders = Libs.refLib.getTopList();
  const sorted = Object.entries(leaders).sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([id]) => id == userId) + 1;
  return rank > 0 ? rank : "Not ranked";
}
```

## Complete Method Reference

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getLink` | `botName` (string, optional), `prefix` (string, optional) | string | Generates referral URL |
| `track` | `options` (object with event handlers) | void | Initializes tracking |
| `getRefList` | `userId` (number, optional) | Array[object] | Gets detailed referral list |
| `getRefCount` | `userId` (number, optional) | number | Gets referral count |
| `getTopList` | none | object | Gets all users' referral counts |
| `getAttractedBy` | none | object/null | Gets referrer info |

## Storage Structure Details

### User Properties
- `REFLIB_refList`: Array of referral objects
- `REFLIB_refsCount`: Number of referrals
- `REFLIB_attracted_by_user`: Referrer info
- `REFLIB_old_user`: Boolean flag

### Bot Properties
- `REFLIB_topList`: Leaderboard data
- `REFLIB_user{ID}`: User reference data
- `REFLIB_refLinkPrefix`: Current link prefix

