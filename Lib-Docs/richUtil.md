# richUtil (Telegram Rich Messages)

With the release of Bot API 10.1, Telegram introduced **Rich Messages** (`rich_message`). Instead of simple markdown text, messages can now contain structured arrays of blocks (such as paragraphs, quotes, tables, and lists) as well as styled rich text nodes.

`richUtil` is a complete utility library for handling this new format. It allows you to:
1. **Build:** Create complex rich messages programmatically using a fluent builder interface.
2. **Parse Strings:** Convert standard HTML or Markdown strings into Telegram's structured `rich_message` format.
3. **Render Objects:** Take incoming rich messages and render them back into standard HTML or Markdown.

---

## 1. Building Rich Messages Programmatically

Instead of manually constructing nested JSON arrays for Telegram, you can use `Libs.richUtil.builder()` to chain message blocks together cleanly.

### Example Usage

```javascript
let builder = Libs.richUtil.builder();

builder
  .heading("Monthly Bot Report", 1)
  .paragraph(p => {
    p.text("Report generated for ")
     .bold("@" + user.username)
     .text(" with status: ")
     .spoiler("ACTIVE");
  })
  .quote("This is an expandable quotation section.", { expandable: true, credit: "System Analytics" })
  .code("const status = 200;", "javascript")
  .divider()
  .details("Advanced Metrics", d => {
    d.paragraph("Detailed internal memory logs...");
  })
  .footer("TeleBotHost Runtime • 2026");

// Extract the final payload to send to Telegram
let payload = builder.build();
// Returns: { blocks: [ { type: "heading", ... }, ... ] }
```

### RichBuilder Block Methods

These methods append structural blocks to your message payload.

| Method | Description |
| --- | --- |
| `.heading(text, level?)` | Section heading (`h1` - `h6`) |
| `.paragraph(text)` | Text paragraph block (`<p>`) |
| `.quote(text, options?)` | Blockquote (`<blockquote>`). Options: `{ expandable, pull, credit }` |
| `.code(codeText, lang?)` | Preformatted code block (`<pre><code>`) |
| `.list(items, options?)` | Ordered or unordered list. Options: `{ ordered, startNumber }` |
| `.table(rows, options?)` | Structured table. Options: `{ hasHeader, striped, bordered, compact, caption }` |
| `.details(title, content)` | Collapsible section (`<details>`) |
| `.divider()` | Horizontal rule divider (`<hr>`) |
| `.thinking(text)` | AI thinking block |
| `.footer(text)` | Footer text block (`<footer>`) |
| `.mathematicalExpression(expr)` | Block-level mathematical expression |
| `.anchor(name)` | Invisible block anchor (`<a name="..."></a>`) |
| `.buttons(grid)` | Rich inline buttons |
| `.setRTL(isRtl)` | Sets Right-to-Left direction (`dir="rtl"`) |

### RichTextBuilder Inline Methods

Whenever a block method accepts a `text` parameter, you can pass a simple string OR a callback function `(p => p...)` to apply inline formatting to the text.

| Method | Example | Resulting Format |
| --- | --- | --- |
| `.text(str)` | `.text("Hello")` | Plain text |
| `.bold(str)` | `.bold("Important")` | Bold / `<b>` |
| `.italic(str)` | `.italic("Note")` | Italic / `<i>` |
| `.underline(str)` | `.underline("Link")` | Underline / `<u>` |
| `.strikethrough(str)` | `.strikethrough("Old")` | Strikethrough / `<s>` |
| `.spoiler(str)` | `.spoiler("Secret")` | Spoiler / `<tg-spoiler>` |
| `.code(str)` | `.code("x = 1")` | Inline Code / `<code>` |
| `.url(url, text?)` | `.url("https://t.me", "App")` | Hyperlink / `<a>` |
| `.mention(username)` | `.mention("admin")` | Mention (`@admin`) |
| `.textMention(userId, text)` | `.textMention(1234, "User")` | User ID Mention |
| `.customEmoji(docId, text?)`| `.customEmoji("54321", "fallback")` | Custom Telegram Emoji |
| `.math(expr)` | `.math("E=mc^2")` | Inline Math Expression |
| `.dateTime(timestamp)` | `.dateTime(1725200000)` | Formatted DateTime |
| `.marked(str)` | `.marked("Highlight")` | Highlighted / `<mark>` |
| `.subscript(str)` | `.subscript("2")` | Subscript / `<sub>` |
| `.superscript(str)` | `.superscript("2")` | Superscript / `<sup>` |
| `.bankCardNumber(str)` | `.bankCardNumber("1234...")` | Bank Card Entity |
| `.hashtag(str)` | `.hashtag("#bot")` | Hashtag Entity |
| `.cashtag(str)` | `.cashtag("$USD")` | Cashtag Entity |
| `.botCommand(str)` | `.botCommand("/start")` | Bot Command Entity |
| `.reference(name, text)` | `.reference("ref1", "Hi")` | Reference Anchor |
| `.referenceLink(name, text)`| `.referenceLink("ref1", "Link")`| Link to Reference Anchor |

---

## 2. HTML / Markdown to Rich Messages

If you prefer writing raw HTML or Markdown instead of using the programmatic builder, you can automatically convert standard formatted strings into a Telegram `rich_message` payload.

### `fromHTML(htmlString)`

Parses HTML syntax into Telegram blocks.

```javascript
let html = `
<h2>System Update</h2>
<p>Hello <b>Admin</b>, welcome back!</p>
<pre><code class="language-js">console.log("ready");</code></pre>
`;

let richMessagePayload = Libs.richUtil.fromHTML(html);
// Ready to be passed to Telegram's send method
```

### `fromMarkdown(markdownString)`

Parses standard Markdown syntax into Telegram blocks.

```javascript
let md = `
# System Update

Hello *Admin*, welcome back!
`;

let richMessagePayload = Libs.richUtil.fromMarkdown(md);
```

---

## 3. Rich Messages to HTML / Markdown

When receiving messages from users (or retrieving existing rich messages), you can easily render the structured objects back into standard formats for display or storage.

### `toHTML(data)`

Converts the rich message tree into standard HTML.

```javascript
if (update.message && update.message.rich_message) {
  let html = Libs.richUtil.toHTML(update.message.rich_message);
  Bot.sendMessage(html, { parse_mode: "HTML" });
}
```

### `toMarkdown(data)` / `toMarkdownV2(data)`

Converts the rich message tree into Telegram's Markdown formats.

```javascript
let md = Libs.richUtil.toMarkdown(update.message.rich_message);
```

### `toPlainText(data)`

Strips all structural and inline formatting to return only the raw string content.

```javascript
let plainText = Libs.richUtil.toPlainText(updateMessage.rich_message);
```
