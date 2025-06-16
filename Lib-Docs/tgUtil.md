# Telegram Utilities Library (tgutil) Documentation

A comprehensive toolkit for working with Telegram users, chats, and message formatting.

## 🔹 User Handling Methods

### `getNameFor(member, options)`
Get the best available name for a user.

```javascript
Libs.tgutil.getNameFor(user); // Returns username if available, otherwise first name
Libs.tgutil.getNameFor(user, { preferFullName: true }); // Prefers full name
```

### `getFullName(member)`
Get the user's full name (first + last name).

```javascript
Libs.tgutil.getFullName(user); // "John Doe"
```

### `formatUser(member, options)`
Format user information with various options.

```javascript
Libs.tgutil.formatUser(user, {
  showId: true,       // Show user ID
  useFullName: true,  // Use full name
  link: true,         // Create clickable link
  parseMode: 'html'    // HTML formatting
});
```

### `getUserMention(member, options)`
Create a mention link for a user.

```javascript
Libs.tgutil.getUserMention(user, {
  parseMode: 'markdown',
  showId: false
});
```

### `isBot(member)`
Check if a user is a bot.

```javascript
Libs.tgutil.isBot(user); // true/false
```

## 🔹 Chat Utilities

### `getChatLink(chat, parseMode)`
Get a clickable link to a chat.

```javascript
Libs.tgutil.getChatLink(chat, 'html');
Libs.tgutil.getChatLink(chat, 'markdown');
```

### `formatMessageLink(chatId, messageId, parseMode)`
Create a link to a specific message.

```javascript
Libs.tgutil.formatMessageLink(chat.id, msg.id, 'markdown');
```

## 🔹 Text Formatting

### `escapeText(text, parseMode)`
Escape special characters for Telegram formatting.

```javascript
Libs.tgutil.escapeText('*bold* text', 'markdown');
Libs.tgutil.escapeText('<b>bold</b> text', 'html');
```

### `parseEntities(text, entities, parseMode)`
Parse Telegram message entities into formatted text.

```javascript
Libs.tgutil.parseEntities(msg.text, msg.entities, 'markdown');
```

## 🔹 Complete Method Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `getNameFor(member, options)` | Gets display name for user | String |
| `getLinkFor(member, parseMode)` | Creates user mention link | String |
| `getFullName(member)` | Gets first + last name | String |
| `formatUser(member, options)` | Formats user info with options | String |
| `isBot(member)` | Checks if user is a bot | Boolean |
| `getChatLink(chat, parseMode)` | Creates chat invite link | String |
| `escapeText(text, parseMode)` | Escapes formatting chars | String |
| `formatMessageLink(chatId, messageId, parseMode)` | Creates message link | String |
| `getUserMention(member, options)` | Creates user mention | String |
| `parseEntities(text, entities, parseMode)` | Formats message entities | String |

## 🔹 Practical Examples

### 1. Mentioning Users
```javascript
// Simple mention
Bot.sendMessage(`Hello ${Libs.tgutil.getUserMention(user)}!`);

// With user ID
Bot.sendMessage(
  `User details: ${Libs.tgutil.formatUser(user, { showId: true })}`
);
```

### 2. Creating Chat Invites
```javascript
const inviteText = `Join our group: ${Libs.tgutil.getChatLink(chat)}`;
Bot.sendMessage(inviteText);
```

### 3. Formatting Received Messages
```javascript
Bot.onMessage((msg) => {
  const formatted = Libs.tgutil.parseEntities(
    msg.text, 
    msg.entities, 
    'markdown'
  );
  Bot.sendMessage(`Formatted: ${formatted}`);
});
```

### 4. User Information Display
```javascript
const userInfo = `
👤 User Information:
Name: ${Libs.tgutil.getFullName(user)}
Username: ${user.username || 'N/A'}
ID: ${user.id}
Bot: ${Libs.tgutil.isBot(user) ? 'Yes' : 'No'}
`;
Bot.sendMessage(userInfo);
```

### 5. Message Link Creation
```javascript
// Reply with link to original message
Bot.onReply((msg, reply) => {
  const link = Libs.tgutil.formatMessageLink(
    msg.chat.id,
    msg.message_id,
    'html'
  );
  Bot.sendMessage(`Replying to ${link}`, { parse_mode: 'HTML' });
});
```

This library provides essential utilities for working with Telegram's API, making user mentions, chat links, and message formatting much easier to handle.
