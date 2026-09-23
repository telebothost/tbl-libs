/**
 * RichBlock / RichMessage parser and builder for Telegram Bot API & TBL runtime
 * Compliant with Telegram Bot API 10.1+ Rich Message Formatting Options:
 * https://core.telegram.org/bots/api#rich-message-formatting-options
 * @module richUtil
 */

/**
 * Helper Escaping & Formatting Functions
 */

function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMarkdown(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  return str.replace(/([_*`\\[\]()])/g, '\\$1');
}

function escapeMarkdownV2(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  return str.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Normalize type name from Bot API / TDLib (@type, type, richBlockParagraph, richTextBold, etc.)
function normalizeType(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return 'plain';
  let t = obj['@type'] || obj.type || obj._ || '';
  if (typeof t !== 'string') return '';
  t = t.replace(/^rich(?:Block|Text)/i, '');
  t = t.replace(/([A-Z])/g, '_$1').toLowerCase();
  t = t.replace(/^_/, '');
  return t;
}

/**
 * RichText Parser (AST -> HTML / Markdown / PlainText)
 */

class RichTextParser {
  /**
   * Parse a RichText entity tree into HTML adhering to Telegram Rich Message Formatting Options
   * @param {Object|string|Array} node - RichText node
   * @param {Object} [options]
   * @returns {string}
   */
  static toHTML(node, options = {}) {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string') return escapeHtml(node);
    if (typeof node === 'number' || typeof node === 'boolean') return escapeHtml(String(node));

    if (Array.isArray(node)) {
      return node.map(item => this.toHTML(item, options)).join('');
    }

    const type = normalizeType(node);
    const innerText = () => {
      if (node.text !== undefined) return this.toHTML(node.text, options);
      if (node.texts !== undefined) return this.toHTML(node.texts, options);
      if (node.content !== undefined) return this.toHTML(node.content, options);
      return '';
    };

    switch (type) {
      case 'plain':
      case 'text':
        return typeof node.text === 'string' ? escapeHtml(node.text) : innerText();

      case 'bold':
        return `<b>${innerText()}</b>`;

      case 'italic':
        return `<i>${innerText()}</i>`;

      case 'underline':
        return `<u>${innerText()}</u>`;

      case 'strikethrough':
      case 'strike_through':
        return `<s>${innerText()}</s>`;

      case 'spoiler':
        return `<tg-spoiler>${innerText()}</tg-spoiler>`;

      case 'code':
        return `<code>${innerText()}</code>`;

      case 'fixed':
      case 'pre':
        return `<pre>${innerText()}</pre>`;

      case 'url': {
        const url = escapeHtml(node.url || node.href || '#');
        return `<a href="${url}">${innerText() || url}</a>`;
      }

      case 'email_address':
      case 'email': {
        const email = escapeHtml(node.email_address || node.email || '');
        return `<a href="mailto:${email}">${innerText() || email}</a>`;
      }

      case 'phone_number':
      case 'phone': {
        const phone = escapeHtml(node.phone_number || node.phone || '');
        return `<a href="tel:${phone}">${innerText() || phone}</a>`;
      }

      case 'bank_card_number':
      case 'hashtag':
      case 'cashtag':
      case 'bot_command':
        return typeof node.text === 'string' ? escapeHtml(node.text) : innerText();

      case 'reference': {
        const refName = escapeHtml(node.reference_name || '');
        return `<a name="${refName}">${innerText()}</a>`;
      }

      case 'reference_link': {
        const refName = escapeHtml(node.reference_name || '');
        return `<a href="#${refName}">${innerText()}</a>`;
      }

      case 'mention': {
        const user = node.username || node.user || '';
        const name = user.startsWith('@') ? user : '@' + user;
        return `<a href="https://t.me/${escapeHtml(user.replace(/^@/, ''))}">${innerText() || escapeHtml(name)}</a>`;
      }

      case 'text_mention': {
        const userId = node.user_id || node.id || (node.user && node.user.id) || '';
        return `<a href="tg://user?id=${escapeHtml(String(userId))}">${innerText()}</a>`;
      }

      case 'custom_emoji': {
        const emojiId = escapeHtml(String(node.document_id || node.custom_emoji_id || node.id || ''));
        return `<tg-emoji emoji-id="${emojiId}">${innerText()}</tg-emoji>`;
      }

      case 'datetime':
      case 'date_time': {
        const dt = node.date_time ?? node.date ?? node.timestamp ?? '';
        return `<time datetime="${escapeHtml(String(dt))}">${innerText() || escapeHtml(String(dt))}</time>`;
      }

      case 'subscript':
        return `<sub>${innerText()}</sub>`;

      case 'superscript':
        return `<sup>${innerText()}</sup>`;

      case 'marked':
      case 'highlight':
        return `<mark>${innerText()}</mark>`;

      case 'mathematical_expression':
      case 'math': {
        const expr = node.expression || node.math || '';
        return `<code>${escapeHtml(expr)}</code>`;
      }

      case 'anchor': {
        const name = escapeHtml(node.name || node.anchor || '');
        return `<a name="${name}">${innerText()}</a>`;
      }

      case 'anchor_link': {
        const anchor = escapeHtml(node.anchor_name || node.name || node.url || '');
        const href = anchor.startsWith('#') ? anchor : `#${anchor}`;
        return `<a href="${href}">${innerText() || anchor}</a>`;
      }

      case 'button': {
        return `<button type="button">${innerText()}</button>`;
      }

      case 'texts':
      case 'concat':
        return Array.isArray(node.texts) ? node.texts.map(t => this.toHTML(t, options)).join('') : innerText();

      default:
        return innerText();
    }
  }

  /**
   * Parse a RichText entity tree into Telegram Markdown / MarkdownV2
   * @param {Object|string|Array} node - RichText node
   * @param {Object} [options]
   * @returns {string}
   */
  static toMarkdown(node, options = {}) {
    const isV2 = options.version === 'v2' || options.v2 === true;
    const esc = isV2 ? escapeMarkdownV2 : escapeMarkdown;

    if (node === null || node === undefined) return '';
    if (typeof node === 'string') return esc(node);
    if (typeof node === 'number' || typeof node === 'boolean') return esc(String(node));

    if (Array.isArray(node)) {
      return node.map(item => this.toMarkdown(item, options)).join('');
    }

    const type = normalizeType(node);
    const innerText = () => {
      if (node.text !== undefined) return this.toMarkdown(node.text, options);
      if (node.texts !== undefined) return this.toMarkdown(node.texts, options);
      if (node.content !== undefined) return this.toMarkdown(node.content, options);
      return '';
    };

    switch (type) {
      case 'plain':
      case 'text':
        return typeof node.text === 'string' ? esc(node.text) : innerText();

      case 'bold':
        return `*${innerText()}*`;

      case 'italic':
        return `_${innerText()}_`;

      case 'underline':
        return isV2 ? `__${innerText()}__` : innerText();

      case 'strikethrough':
      case 'strike_through':
        return isV2 ? `~${innerText()}~` : innerText();

      case 'spoiler':
        return isV2 ? `||${innerText()}||` : innerText();

      case 'code':
        return `\`${innerText()}\``;

      case 'fixed':
      case 'pre':
        return `\`\`\`\n${innerText()}\n\`\`\``;

      case 'url': {
        const url = node.url || node.href || '#';
        const txt = innerText() || esc(url);
        return `[${txt}](${url})`;
      }

      case 'email_address':
      case 'email': {
        const email = node.email_address || node.email || '';
        return `[${innerText() || esc(email)}](mailto:${email})`;
      }

      case 'phone_number':
      case 'phone': {
        const phone = node.phone_number || node.phone || '';
        return `[${innerText() || esc(phone)}](tel:${phone})`;
      }

      case 'bank_card_number':
      case 'hashtag':
      case 'cashtag':
      case 'bot_command':
        return typeof node.text === 'string' ? esc(node.text) : innerText();

      case 'reference':
        return innerText();

      case 'reference_link': {
        const refName = node.reference_name || '';
        return `[${innerText()}](#${refName})`;
      }

      case 'mention': {
        const user = node.username || node.user || '';
        const name = user.startsWith('@') ? user : '@' + user;
        return esc(name);
      }

      case 'text_mention': {
        const userId = node.user_id || node.id || (node.user && node.user.id) || '';
        return `[${innerText()}](tg://user?id=${userId})`;
      }

      case 'custom_emoji': {
        const emojiId = node.document_id || node.custom_emoji_id || node.id || '';
        if (isV2 && emojiId) {
          return `![${innerText()}](tg://emoji?id=${emojiId})`;
        }
        return innerText();
      }

      case 'datetime':
      case 'date_time': {
        return innerText() || esc(String(node.date_time ?? node.date ?? ''));
      }

      case 'mathematical_expression':
      case 'math': {
        const expr = node.expression || node.math || '';
        return `\`${expr}\``;
      }

      case 'texts':
      case 'concat':
        return Array.isArray(node.texts) ? node.texts.map(t => this.toMarkdown(t, options)).join('') : innerText();

      default:
        return innerText();
    }
  }

  /**
   * Parse a RichText entity tree into Plain Text
   * @param {Object|string|Array} node - RichText node
   * @returns {string}
   */
  static toPlainText(node) {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number' || typeof node === 'boolean') return String(node);

    if (Array.isArray(node)) {
      return node.map(item => this.toPlainText(item)).join('');
    }

    if (node.text !== undefined) return this.toPlainText(node.text);
    if (node.texts !== undefined) return this.toPlainText(node.texts);
    if (node.content !== undefined) return this.toPlainText(node.content);
    if (node.expression !== undefined) return String(node.expression);

    return '';
  }
}

/**
 * Blocks Parser (AST -> HTML / Markdown / AST)
 */

class BlocksParser {
  /**
   * @param {Array|Object} blocksOrMessage - Array of blocks or Update.message.rich_message object
   * @param {Object} [options]
   */
  constructor(blocksOrMessage, options = {}) {
    this.options = options;
    if (blocksOrMessage && typeof blocksOrMessage === 'object' && Array.isArray(blocksOrMessage.blocks)) {
      this.blocks = blocksOrMessage.blocks;
      this.isRtl = blocksOrMessage.is_rtl ?? options.is_rtl ?? false;
    } else if (Array.isArray(blocksOrMessage)) {
      this.blocks = blocksOrMessage;
      this.isRtl = options.is_rtl ?? false;
    } else if (blocksOrMessage && typeof blocksOrMessage === 'object') {
      this.blocks = [blocksOrMessage];
      this.isRtl = blocksOrMessage.is_rtl ?? options.is_rtl ?? false;
    } else {
      this.blocks = [];
      this.isRtl = false;
    }
  }

  /**
   * Convert blocks to HTML string compliant with Telegram Rich Message formatting options
   * @param {Object} [overrideOptions]
   * @returns {string}
   */
  toHTML(overrideOptions = {}) {
    const opts = { ...this.options, ...overrideOptions };
    const htmlChunks = [];

    for (const block of this.blocks) {
      const chunk = this._renderBlockHTML(block, opts);
      if (chunk) htmlChunks.push(chunk);
    }

    let result = htmlChunks.join('\n');
    if (this.isRtl || opts.is_rtl) {
      result = `<div dir="rtl">\n${result}\n</div>`;
    }
    return result;
  }

  /**
   * Convert blocks to Markdown string
   * @param {Object} [overrideOptions]
   * @returns {string}
   */
  toMarkdown(overrideOptions = {}) {
    const opts = { ...this.options, ...overrideOptions, version: 'v1' };
    const mdChunks = [];

    for (const block of this.blocks) {
      const chunk = this._renderBlockMarkdown(block, opts);
      if (chunk) mdChunks.push(chunk);
    }

    return mdChunks.join('\n\n');
  }

  /**
   * Convert blocks to MarkdownV2 string
   * @param {Object} [overrideOptions]
   * @returns {string}
   */
  toMarkdownV2(overrideOptions = {}) {
    return this.toMarkdown({ ...overrideOptions, version: 'v2', v2: true });
  }

  /**
   * Convert blocks to plain text string
   * @returns {string}
   */
  toPlainText() {
    const textChunks = [];
    for (const block of this.blocks) {
      const chunk = this._renderBlockPlainText(block);
      if (chunk) textChunks.push(chunk);
    }
    return textChunks.join('\n\n');
  }

  /**
   * Normalize blocks to clean Abstract Syntax Tree
   * @returns {Array<Object>}
   */
  toAST() {
    return this.blocks.map(block => this._normalizeASTNode(block));
  }

  /**
   * Internal Block HTML Renderer
   */
  _renderBlockHTML(block, options) {
    if (!block) return '';
    const type = normalizeType(block);

    switch (type) {
      case 'paragraph': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        return `<p>${textHtml}</p>`;
      }

      case 'section_heading':
      case 'heading': {
        const level = block.level || 2;
        const tag = `h${Math.min(Math.max(level, 1), 6)}`;
        const textHtml = RichTextParser.toHTML(block.text, options);
        return `<${tag}>${textHtml}</${tag}>`;
      }

      case 'subhead':
      case 'subtitle': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        return `<h3>${textHtml}</h3>`;
      }

      case 'preformatted':
      case 'code_block': {
        const lang = block.language ? ` class="language-${escapeHtml(block.language)}"` : '';
        const rawCode = RichTextParser.toPlainText(block.text);
        return `<pre><code${lang}>${escapeHtml(rawCode)}</code></pre>`;
      }

      case 'mathematical_expression': {
        const expr = block.expression || block.math || '';
        return `<pre><code class="language-math">${escapeHtml(expr)}</code></pre>`;
      }

      case 'anchor': {
        const name = escapeHtml(block.name || block.anchor || '');
        return `<a name="${name}"></a>`;
      }

      case 'footer': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        return `<footer><small>${textHtml}</small></footer>`;
      }

      case 'divider':
      case 'separator':
        return '<hr>';

      case 'block_quotation':
      case 'blockquote': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        let creditHtml = '';
        if (block.credit) {
          creditHtml = `<cite>${RichTextParser.toHTML(block.credit, options)}</cite>`;
        }
        return `<blockquote>${textHtml}${creditHtml ? `<br>${creditHtml}` : ''}</blockquote>`;
      }

      case 'expandable_block_quotation':
      case 'expandable_blockquote': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        let creditHtml = '';
        if (block.credit) {
          creditHtml = `<cite>${RichTextParser.toHTML(block.credit, options)}</cite>`;
        }
        return `<blockquote expandable>${textHtml}${creditHtml ? `<br>${creditHtml}` : ''}</blockquote>`;
      }

      case 'pull_quotation': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        let creditHtml = '';
        if (block.credit) {
          creditHtml = `<cite>${RichTextParser.toHTML(block.credit, options)}</cite>`;
        }
        return `<blockquote class="pullquote">${textHtml}${creditHtml ? `<br>${creditHtml}` : ''}</blockquote>`;
      }

      case 'list': {
        const tag = block.is_ordered ? 'ol' : 'ul';
        const startAttr = (block.is_ordered && block.start_number && block.start_number !== 1)
          ? ` start="${Number(block.start_number)}"`
          : '';
        const items = Array.isArray(block.items) ? block.items : [];
        const itemsHtml = items.map(item => {
          if (!item) return '<li></li>';
          const itemText = RichTextParser.toHTML(item.text ?? item, options);
          let subList = '';
          if (item.list) {
            subList = '\n' + this._renderBlockHTML(item.list, options);
          }
          return `<li>${itemText}${subList}</li>`;
        }).join('\n');

        return `<${tag}${startAttr}>\n${itemsHtml}\n</${tag}>`;
      }

      case 'table': {
        const isStriped = block.is_striped ? ' striped' : '';
        const isBordered = block.is_bordered ? ' bordered' : '';
        const isCompact = block.is_compact ? ' compact' : '';
        const classes = `table${isStriped}${isBordered}${isCompact}`.trim();
        const classAttr = classes ? ` class="${classes}"` : '';

        let captionHtml = '';
        if (block.caption) {
          captionHtml = `<caption>${RichTextParser.toHTML(block.caption, options)}</caption>\n`;
        }

        const rows = Array.isArray(block.rows) ? block.rows : [];
        const rowsHtml = rows.map((row, rIndex) => {
          const cells = Array.isArray(row) ? row : (row.cells || []);
          const cellsHtml = cells.map(cell => {
            const isHeader = cell?.is_header || (rIndex === 0 && block.has_header);
            const tag = isHeader ? 'th' : 'td';
            const align = cell?.align ? ` align="${escapeHtml(cell.align)}"` : '';
            const colspan = cell?.colspan ? ` colspan="${cell.colspan}"` : '';
            const rowspan = cell?.rowspan ? ` rowspan="${cell.rowspan}"` : '';
            const cellText = cell?.text !== undefined ? RichTextParser.toHTML(cell.text, options) : RichTextParser.toHTML(cell, options);
            return `<${tag}${align}${colspan}${rowspan}>${cellText}</${tag}>`;
          }).join('');
          return `<tr>${cellsHtml}</tr>`;
        }).join('\n');

        return `<table${classAttr}>\n${captionHtml}<tbody>\n${rowsHtml}\n</tbody>\n</table>`;
      }

      case 'details': {
        const titleHtml = RichTextParser.toHTML(block.title, options) || 'Details';
        const openAttr = block.is_open ? ' open' : '';
        const content = Array.isArray(block.content) ? block.content : (block.blocks || []);
        const contentHtml = content.map(b => this._renderBlockHTML(b, options)).join('\n');
        return `<details${openAttr}>\n<summary>${titleHtml}</summary>\n${contentHtml}\n</details>`;
      }

      case 'thinking': {
        const textHtml = RichTextParser.toHTML(block.text, options);
        return `<div class="thinking"><em>${textHtml}</em></div>`;
      }

      case 'buttons': {
        const buttons = Array.isArray(block.buttons) ? block.buttons : [];
        const rowsHtml = buttons.map(row => {
          if (!Array.isArray(row)) row = [row];
          const btns = row.map(btn => {
            const text = RichTextParser.toHTML(btn?.text ?? btn, options);
            const url = btn?.url ? ` data-url="${escapeHtml(btn.url)}"` : '';
            const cb = btn?.callback_data ? ` data-callback="${escapeHtml(btn.callback_data)}"` : '';
            const wa = btn?.web_app?.url ? ` data-web-app="${escapeHtml(btn.web_app.url)}"` : '';
            return `<button type="button"${url}${cb}${wa}>${text}</button>`;
          }).join(' ');
          return `<div class="button-row">${btns}</div>`;
        }).join('\n');
        return `<div class="rich-buttons">\n${rowsHtml}\n</div>`;
      }

      case 'photo':
      case 'video':
      case 'audio':
      case 'animation':
      case 'voice_note':
      case 'document': {
        const mediaType = type;
        const captionObj = block.caption ? RichTextParser.toHTML(block.caption.text || block.caption, options) : '';
        const mediaSrc = block.url || block.file_id || block[mediaType]?.file_id || '';
        return `<figure class="rich-media-${mediaType}"><div class="media-placeholder">[Media: ${mediaType} ${escapeHtml(mediaSrc)}]</div>${captionObj ? `<figcaption>${captionObj}</figcaption>` : ''}</figure>`;
      }

      case 'map': {
        const captionObj = block.caption ? RichTextParser.toHTML(block.caption.text || block.caption, options) : '';
        const lat = block.location?.latitude ?? block.latitude ?? '';
        const lon = block.location?.longitude ?? block.longitude ?? '';
        return `<figure class="rich-map"><div class="map-placeholder">[Map: ${lat}, ${lon}]</div>${captionObj ? `<figcaption>${captionObj}</figcaption>` : ''}</figure>`;
      }

      case 'collage':
      case 'slideshow': {
        const captionObj = block.caption ? RichTextParser.toHTML(block.caption.text || block.caption, options) : '';
        return `<figure class="rich-${type}"><div class="media-group">[${type}]</div>${captionObj ? `<figcaption>${captionObj}</figcaption>` : ''}</figure>`;
      }

      default: {
        if (block.text !== undefined) {
          return `<p>${RichTextParser.toHTML(block.text, options)}</p>`;
        }
        return '';
      }
    }
  }

  /**
   * Internal Block Markdown Renderer
   */
  _renderBlockMarkdown(block, options) {
    if (!block) return '';
    const type = normalizeType(block);

    switch (type) {
      case 'paragraph':
        return RichTextParser.toMarkdown(block.text, options);

      case 'section_heading':
      case 'heading': {
        const level = block.level || 2;
        const prefix = '#'.repeat(Math.min(Math.max(level, 1), 6));
        return `${prefix} ${RichTextParser.toMarkdown(block.text, options)}`;
      }

      case 'subhead':
      case 'subtitle':
        return `### ${RichTextParser.toMarkdown(block.text, options)}`;

      case 'preformatted':
      case 'code_block': {
        const lang = block.language || '';
        const rawCode = RichTextParser.toPlainText(block.text);
        return `\`\`\`${lang}\n${rawCode}\n\`\`\``;
      }

      case 'mathematical_expression': {
        const expr = block.expression || block.math || '';
        return `\`\`\`math\n${expr}\n\`\`\``;
      }

      case 'anchor':
        return '';

      case 'footer':
        return `_${RichTextParser.toMarkdown(block.text, options)}_`;

      case 'divider':
      case 'separator':
        return '---';

      case 'block_quotation':
      case 'blockquote': {
        const mdText = RichTextParser.toMarkdown(block.text, options);
        const lines = mdText.split('\n').map(l => `> ${l}`).join('\n');
        let credit = '';
        if (block.credit) {
          credit = `\n> — _${RichTextParser.toMarkdown(block.credit, options)}_`;
        }
        return `${lines}${credit}`;
      }

      case 'expandable_block_quotation':
      case 'expandable_blockquote': {
        const mdText = RichTextParser.toMarkdown(block.text, options);
        const lines = mdText.split('\n').map(l => `**> ${l}`).join('\n');
        let credit = '';
        if (block.credit) {
          credit = `\n**> — _${RichTextParser.toMarkdown(block.credit, options)}_`;
        }
        return `${lines}${credit}`;
      }

      case 'pull_quotation': {
        const mdText = RichTextParser.toMarkdown(block.text, options);
        return `> **${mdText}**`;
      }

      case 'list': {
        const items = Array.isArray(block.items) ? block.items : [];
        let startNum = (block.is_ordered && block.start_number) ? Number(block.start_number) : 1;
        return items.map((item, idx) => {
          if (!item) return '';
          const prefix = block.is_ordered ? `${startNum + idx}. ` : '- ';
          const text = RichTextParser.toMarkdown(item.text ?? item, options);
          let subList = '';
          if (item.list) {
            const subMd = this._renderBlockMarkdown(item.list, options);
            subList = '\n' + subMd.split('\n').map(l => `  ${l}`).join('\n');
          }
          return `${prefix}${text}${subList}`;
        }).join('\n');
      }

      case 'table': {
        const rows = Array.isArray(block.rows) ? block.rows : [];
        if (!rows.length) return '';

        const mdRows = rows.map(row => {
          const cells = Array.isArray(row) ? row : (row.cells || []);
          return '| ' + cells.map(c => {
            const txt = c?.text !== undefined ? RichTextParser.toMarkdown(c.text, options) : RichTextParser.toMarkdown(c, options);
            return txt.replace(/\|/g, '\\|');
          }).join(' | ') + ' |';
        });

        const firstRowCells = Array.isArray(rows[0]) ? rows[0] : (rows[0].cells || []);
        const colCount = firstRowCells.length;
        const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';

        let tableMd = mdRows[0] + '\n' + separator;
        if (mdRows.length > 1) {
          tableMd += '\n' + mdRows.slice(1).join('\n');
        }

        if (block.caption) {
          tableMd = `*${RichTextParser.toMarkdown(block.caption, options)}*\n` + tableMd;
        }
        return tableMd;
      }

      case 'details': {
        const title = RichTextParser.toMarkdown(block.title, options) || 'Details';
        const content = Array.isArray(block.content) ? block.content : (block.blocks || []);
        const innerMd = content.map(b => this._renderBlockMarkdown(b, options)).join('\n\n');
        const indented = innerMd.split('\n').map(l => `> ${l}`).join('\n');
        return `> **${title}**\n${indented}`;
      }

      case 'thinking': {
        const text = RichTextParser.toMarkdown(block.text, options);
        return `_Thinking: ${text}_`;
      }

      case 'photo':
      case 'video':
      case 'audio':
      case 'animation':
      case 'voice_note':
      case 'document': {
        const caption = block.caption ? `\n_${RichTextParser.toMarkdown(block.caption.text || block.caption, options)}_` : '';
        return `[Media: ${type}]${caption}`;
      }

      default: {
        if (block.text !== undefined) {
          return RichTextParser.toMarkdown(block.text, options);
        }
        return '';
      }
    }
  }

  /**
   * Internal Block Plain Text Renderer
   */
  _renderBlockPlainText(block) {
    if (!block) return '';
    const type = normalizeType(block);

    switch (type) {
      case 'paragraph':
      case 'section_heading':
      case 'heading':
      case 'subhead':
      case 'subtitle':
      case 'mathematical_expression':
        return block.expression || block.math || '';
      case 'anchor':
        return '';
      case 'footer':
      case 'thinking':
        return RichTextParser.toPlainText(block.text);

      case 'preformatted':
      case 'code_block':
        return RichTextParser.toPlainText(block.text);

      case 'divider':
      case 'separator':
        return '---';

      case 'block_quotation':
      case 'expandable_block_quotation':
      case 'pull_quotation':
      case 'blockquote': {
        const txt = RichTextParser.toPlainText(block.text);
        const credit = block.credit ? ` — ${RichTextParser.toPlainText(block.credit)}` : '';
        return txt + credit;
      }

      case 'list': {
        const items = Array.isArray(block.items) ? block.items : [];
        let startNum = (block.is_ordered && block.start_number) ? Number(block.start_number) : 1;
        return items.map((item, idx) => {
          if (!item) return '';
          const prefix = block.is_ordered ? `${startNum + idx}. ` : '• ';
          const text = RichTextParser.toPlainText(item.text ?? item);
          let subList = '';
          if (item.list) {
            const subText = this._renderBlockPlainText(item.list);
            subList = '\n' + subText.split('\n').map(l => `  ${l}`).join('\n');
          }
          return `${prefix}${text}${subList}`;
        }).join('\n');
      }

      case 'table': {
        const rows = Array.isArray(block.rows) ? block.rows : [];
        return rows.map(row => {
          const cells = Array.isArray(row) ? row : (row.cells || []);
          return cells.map(c => RichTextParser.toPlainText(c?.text ?? c)).join('\t');
        }).join('\n');
      }

      case 'details': {
        const title = RichTextParser.toPlainText(block.title);
        const content = Array.isArray(block.content) ? block.content : (block.blocks || []);
        const body = content.map(b => this._renderBlockPlainText(b)).join('\n');
        return `${title}\n${body}`;
      }

      default: {
        if (block.text !== undefined) {
          return RichTextParser.toPlainText(block.text);
        }
        return '';
      }
    }
  }

  /**
   * Normalize node into AST
   */
  _normalizeASTNode(node) {
    if (!node || typeof node !== 'object') return node;
    const type = normalizeType(node);
    const ast = { type, ...node };

    if (ast.text && typeof ast.text === 'object') {
      ast.text = Array.isArray(ast.text)
        ? ast.text.map(t => this._normalizeASTNode(t))
        : this._normalizeASTNode(ast.text);
    }
    if (Array.isArray(ast.content)) {
      ast.content = ast.content.map(c => this._normalizeASTNode(c));
    }
    if (Array.isArray(ast.items)) {
      ast.items = ast.items.map(item => ({
        ...item,
        text: typeof item.text === 'object' ? this._normalizeASTNode(item.text) : item.text,
        list: item.list ? this._normalizeASTNode(item.list) : undefined
      }));
    }
    return ast;
  }
}

/**
 * HTML & Markdown to RichBlocks Parser
 */

class StringParser {
  /**
   * Parse HTML string adhering to Telegram Rich Message Formatting Options into { blocks, is_rtl }
   * @param {string} html
   * @returns {{ blocks: Array<Object>, is_rtl?: boolean }}
   */
  static fromHTML(html) {
    if (!html || typeof html !== 'string') return { blocks: [] };

    let isRtl = false;
    let cleanHtml = html.trim();

    if (/<div[^>]*dir=["']rtl["'][^>]*>/i.test(cleanHtml)) {
      isRtl = true;
      cleanHtml = cleanHtml.replace(/<\/?div[^>]*>/gi, '').trim();
    }

    const blocks = [];

    // Regex match block level tags: h1-h6, p, pre, blockquote, hr, ul, ol, table, details, footer
    const blockRegex = /<(h[1-6]|p|pre|blockquote|hr|ul|ol|table|details|footer)([^>]*)>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
    let match;
    let lastIndex = 0;

    while ((match = blockRegex.exec(cleanHtml)) !== null) {
      // Catch any orphan text before this block
      const orphan = cleanHtml.slice(lastIndex, match.index).trim();
      if (orphan) {
        blocks.push({
          type: 'paragraph',
          text: StringParser.parseInlineHTML(orphan)
        });
      }

      if (!match[1] && match[0].toLowerCase().startsWith('<hr')) {
        blocks.push({ type: 'divider' });
        lastIndex = blockRegex.lastIndex;
        continue;
      }

      const tag = (match[1] || '').toLowerCase();
      const attrs = match[2] || '';
      const body = match[3] || '';

      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag.charAt(1), 10);
        blocks.push({
          type: 'section_heading',
          level,
          text: StringParser.parseInlineHTML(body)
        });
      } else if (tag === 'p') {
        blocks.push({
          type: 'paragraph',
          text: StringParser.parseInlineHTML(body)
        });
      } else if (tag === 'pre') {
        let lang = '';
        let codeBody = body;
        const codeMatch = /<code([^>]*)>([\s\S]*?)<\/code>/i.exec(body);
        if (codeMatch) {
          const langMatch = /class=["']language-([^"']+)["']/i.exec(codeMatch[1]);
          if (langMatch) lang = langMatch[1];
          codeBody = codeMatch[2];
        }
        blocks.push({
          type: 'preformatted',
          language: lang,
          text: { type: 'plain', text: StringParser.unescapeHtml(codeBody) }
        });
      } else if (tag === 'blockquote') {
        const isExpandable = /\bexpandable\b/i.test(attrs);
        let quoteText = body;
        let credit = undefined;
        const citeMatch = /<cite>([\s\S]*?)<\/cite>/i.exec(body);
        if (citeMatch) {
          credit = StringParser.parseInlineHTML(citeMatch[1]);
          quoteText = quoteText.replace(/<cite>[\s\S]*?<\/cite>/i, '').replace(/<br\s*\/?>\s*$/i, '');
        }
        const block = {
          type: isExpandable ? 'expandable_block_quotation' : 'block_quotation',
          text: StringParser.parseInlineHTML(quoteText)
        };
        if (credit) block.credit = credit;
        blocks.push(block);
      } else if (tag === 'hr') {
        blocks.push({ type: 'divider' });
      } else if (tag === 'footer') {
        blocks.push({
          type: 'footer',
          text: StringParser.parseInlineHTML(body.replace(/<\/?small>/gi, ''))
        });
      } else if (tag === 'ul' || tag === 'ol') {
        const isOrdered = tag === 'ol';
        const startMatch = /start=["'](\d+)["']/i.exec(attrs);
        const startNumber = startMatch ? parseInt(startMatch[1], 10) : 1;
        const items = [];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch;
        while ((liMatch = liRegex.exec(body)) !== null) {
          items.push({ text: StringParser.parseInlineHTML(liMatch[1]) });
        }
        blocks.push({
          type: 'list',
          is_ordered: isOrdered,
          start_number: startNumber,
          items
        });
      } else if (tag === 'table') {
        const isStriped = /\bstriped\b/i.test(attrs);
        const isBordered = /\bbordered\b/i.test(attrs);
        const isCompact = /\bcompact\b/i.test(attrs);

        let caption = undefined;
        const capMatch = /<caption>([\s\S]*?)<\/caption>/i.exec(body);
        if (capMatch) {
          caption = StringParser.parseInlineHTML(capMatch[1]);
        }

        const rows = [];
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(body)) !== null) {
          const cells = [];
          const cellRegex = /<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi;
          let cellMatch;
          while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
            const isHeader = cellMatch[1].toLowerCase() === 'th';
            cells.push({
              is_header: isHeader,
              text: StringParser.parseInlineHTML(cellMatch[3])
            });
          }
          if (cells.length) rows.push(cells);
        }

        const tableBlock = {
          type: 'table',
          rows,
          is_striped: isStriped,
          is_bordered: isBordered,
          is_compact: isCompact
        };
        if (caption) tableBlock.caption = caption;
        blocks.push(tableBlock);
      } else if (tag === 'details') {
        const isOpen = /\bopen\b/i.test(attrs);
        let title = 'Details';
        let contentHtml = body;
        const sumMatch = /<summary>([\s\S]*?)<\/summary>/i.exec(body);
        if (sumMatch) {
          title = sumMatch[1];
          contentHtml = contentHtml.replace(/<summary>[\s\S]*?<\/summary>/i, '');
        }
        const innerResult = StringParser.fromHTML(contentHtml);
        blocks.push({
          type: 'details',
          title: StringParser.parseInlineHTML(title),
          content: innerResult.blocks,
          is_open: isOpen
        });
      }

      lastIndex = blockRegex.lastIndex;
    }

    // Trailing orphan text
    const remainder = cleanHtml.slice(lastIndex).trim();
    if (remainder) {
      blocks.push({
        type: 'paragraph',
        text: StringParser.parseInlineHTML(remainder)
      });
    }

    const res = { blocks };
    if (isRtl) res.is_rtl = true;
    return res;
  }

  /**
   * Parse inline HTML formatting tags (b, i, u, s, spoiler, code, a, tg-emoji, time, mark, sub, sup)
   * @param {string} str
   * @returns {Object} RichText node
   */
  static parseInlineHTML(str) {
    if (!str || typeof str !== 'string') return '';
    const unesc = (s) => StringParser.unescapeHtml(s);

    // If there are no HTML tags, return plain string
    if (!/<[^>]+>/.test(str)) {
      return unesc(str);
    }

    const tagRegex = /<([a-z0-9-]+)([^>]*)>([\s\S]*?)<\/\1>/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        const plainPiece = str.slice(lastIndex, match.index);
        if (plainPiece) parts.push({ type: 'plain', text: unesc(plainPiece) });
      }

      const tag = match[1].toLowerCase();
      const attrs = match[2] || '';
      const inner = match[3] || '';
      const parsedInner = StringParser.parseInlineHTML(inner);

      switch (tag) {
        case 'b':
        case 'strong':
          parts.push({ type: 'bold', text: parsedInner });
          break;
        case 'i':
        case 'em':
          parts.push({ type: 'italic', text: parsedInner });
          break;
        case 'u':
        case 'ins':
          parts.push({ type: 'underline', text: parsedInner });
          break;
        case 's':
        case 'strike':
        case 'del':
          parts.push({ type: 'strikethrough', text: parsedInner });
          break;
        case 'tg-spoiler':
          parts.push({ type: 'spoiler', text: parsedInner });
          break;
        case 'span': {
          if (/class=["']tg-spoiler["']/i.test(attrs)) {
            parts.push({ type: 'spoiler', text: parsedInner });
          } else if (/class=["']tg-icon["']/i.test(attrs)) {
            const emojiId = (/emoji-id=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
            parts.push({ type: 'custom_emoji', document_id: emojiId, text: parsedInner });
          } else {
            parts.push(parsedInner);
          }
          break;
        }
        case 'code':
          parts.push({ type: 'code', text: parsedInner });
          break;
        case 'tg-emoji': {
          const emojiId = (/emoji-id=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
          parts.push({ type: 'custom_emoji', document_id: emojiId, text: parsedInner });
          break;
        }
        case 'time': {
          const dt = (/datetime=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
          parts.push({ type: 'datetime', date_time: dt, text: parsedInner });
          break;
        }
        case 'a': {
          const href = (/href=["']([^"']+)["']/i.exec(attrs) || [])[1] || '#';
          if (href.startsWith('tg://user?id=')) {
            const userId = href.replace('tg://user?id=', '');
            parts.push({ type: 'text_mention', user_id: parseInt(userId, 10) || userId, text: parsedInner });
          } else {
            parts.push({ type: 'url', url: href, text: parsedInner });
          }
          break;
        }
        case 'mark':
          parts.push({ type: 'marked', text: parsedInner });
          break;
        case 'sub':
          parts.push({ type: 'subscript', text: parsedInner });
          break;
        case 'sup':
          parts.push({ type: 'superscript', text: parsedInner });
          break;
        default:
          parts.push(parsedInner);
          break;
      }

      lastIndex = tagRegex.lastIndex;
    }

    if (lastIndex < str.length) {
      const trailing = str.slice(lastIndex);
      if (trailing) parts.push({ type: 'plain', text: unesc(trailing) });
    }

    if (parts.length === 1) return parts[0];
    return { type: 'texts', texts: parts };
  }

  /**
   * Parse Markdown string into { blocks }
   * @param {string} md
   * @returns {{ blocks: Array<Object> }}
   */
  static fromMarkdown(md) {
    if (!md || typeof md !== 'string') return { blocks: [] };

    const lines = md.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Heading (# Heading)
      const headMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (headMatch) {
        blocks.push({
          type: 'section_heading',
          level: headMatch[1].length,
          text: StringParser.parseInlineMarkdown(headMatch[2])
        });
        i++;
        continue;
      }

      // 2. Divider (--- or ***)
      if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
        blocks.push({ type: 'divider' });
        i++;
        continue;
      }

      // 3. Code block (```lang ... ```)
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push({
          type: 'preformatted',
          language: lang,
          text: { type: 'plain', text: codeLines.join('\n') }
        });
        continue;
      }

      // 4. Blockquote (> or **>)
      if (trimmed.startsWith('> ') || trimmed.startsWith('**> ')) {
        const isExpandable = trimmed.startsWith('**> ');
        const quoteLines = [];
        while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim().startsWith('**> '))) {
          quoteLines.push(lines[i].trim().replace(/^(\*\*>|>)\s?/, ''));
          i++;
        }
        blocks.push({
          type: isExpandable ? 'expandable_block_quotation' : 'block_quotation',
          text: StringParser.parseInlineMarkdown(quoteLines.join('\n'))
        });
        continue;
      }

      // 5. List items (1. Item or - Item)
      const listMatch = /^(\d+\.|\-|\*)\s+(.*)$/.exec(trimmed);
      if (listMatch) {
        const isOrdered = /^\d+\./.test(listMatch[1]);
        const startNumber = isOrdered ? parseInt(listMatch[1], 10) : 1;
        const items = [];
        while (i < lines.length) {
          const lTrim = lines[i].trim();
          const itemMatch = /^(\d+\.|\-|\*)\s+(.*)$/.exec(lTrim);
          if (!itemMatch) break;
          items.push({ text: StringParser.parseInlineMarkdown(itemMatch[2]) });
          i++;
        }
        blocks.push({
          type: 'list',
          is_ordered: isOrdered,
          start_number: startNumber,
          items
        });
        continue;
      }

      // 6. Table (| Col 1 | Col 2 |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const rows = [];
        for (const tLine of tableLines) {
          if (/^\|\s*[-:]+[-| :]*\|$/.test(tLine)) continue; // skip separator row
          const cellTexts = tLine.split('|').slice(1, -1).map(c => c.trim());
          const cells = cellTexts.map((txt, cIdx) => ({
            is_header: rows.length === 0,
            text: StringParser.parseInlineMarkdown(txt)
          }));
          if (cells.length) rows.push(cells);
        }
        blocks.push({
          type: 'table',
          rows,
          is_striped: false,
          is_bordered: true
        });
        continue;
      }

      // Default: Paragraph
      const pLines = [];
      while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('>')) {
        pLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'paragraph',
        text: StringParser.parseInlineMarkdown(pLines.join(' '))
      });
    }

    return { blocks };
  }

  /**
   * Parse inline Markdown styles (*bold*, _italic_, `code`, [url](link), ||spoiler||)
   * @param {string} str
   * @returns {Object} RichText node
   */
  static parseInlineMarkdown(str) {
    if (!str || typeof str !== 'string') return '';

    // Handle basic inline patterns
    if (/^\*([^*]+)\*$/.test(str)) {
      return { type: 'bold', text: str.slice(1, -1) };
    }
    if (/^_([^_]+)_$/.test(str)) {
      return { type: 'italic', text: str.slice(1, -1) };
    }
    if (/^`([^`]+)`$/.test(str)) {
      return { type: 'code', text: str.slice(1, -1) };
    }
    if (/^\|\|([^|]+)\|\|$/.test(str)) {
      return { type: 'spoiler', text: str.slice(2, -2) };
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(str);
    if (linkMatch) {
      const url = linkMatch[2];
      if (url.startsWith('tg://user?id=')) {
        return { type: 'text_mention', user_id: url.replace('tg://user?id=', ''), text: linkMatch[1] };
      }
      return { type: 'url', url, text: linkMatch[1] };
    }

    return str;
  }

  static unescapeHtml(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }
}

/**
 * RichText Builder
 */

class RichTextBuilder {
  constructor() {
    this.nodes = [];
  }

  text(str) {
    this.nodes.push(typeof str === 'string' ? { type: 'plain', text: str } : str);
    return this;
  }

  bold(content) {
    this.nodes.push({ type: 'bold', text: this._wrap(content) });
    return this;
  }

  italic(content) {
    this.nodes.push({ type: 'italic', text: this._wrap(content) });
    return this;
  }

  underline(content) {
    this.nodes.push({ type: 'underline', text: this._wrap(content) });
    return this;
  }

  strikethrough(content) {
    this.nodes.push({ type: 'strikethrough', text: this._wrap(content) });
    return this;
  }

  spoiler(content) {
    this.nodes.push({ type: 'spoiler', text: this._wrap(content) });
    return this;
  }

  code(content) {
    this.nodes.push({ type: 'code', text: this._wrap(content) });
    return this;
  }

  url(linkUrl, content) {
    this.nodes.push({
      type: 'url',
      url: linkUrl,
      text: content !== undefined ? this._wrap(content) : linkUrl
    });
    return this;
  }

  mention(username, content) {
    this.nodes.push({
      type: 'mention',
      username,
      text: content !== undefined ? this._wrap(content) : (username.startsWith('@') ? username : '@' + username)
    });
    return this;
  }

  textMention(userId, content) {
    this.nodes.push({
      type: 'text_mention',
      user_id: userId,
      text: this._wrap(content)
    });
    return this;
  }

  customEmoji(documentId, fallbackText) {
    this.nodes.push({
      type: 'custom_emoji',
      document_id: String(documentId),
      text: this._wrap(fallbackText || '⭐')
    });
    return this;
  }

  marked(content) {
    this.nodes.push({ type: 'marked', text: this._wrap(content) });
    return this;
  }

  subscript(content) {
    this.nodes.push({ type: 'subscript', text: this._wrap(content) });
    return this;
  }

  superscript(content) {
    this.nodes.push({ type: 'superscript', text: this._wrap(content) });
    return this;
  }

  math(expression) {
    this.nodes.push({
      type: 'mathematical_expression',
      expression,
      text: expression
    });
    return this;
  }

  dateTime(timestamp, fallbackText) {
    this.nodes.push({
      type: 'datetime',
      date_time: timestamp,
      text: fallbackText || String(timestamp)
    });
    return this;
  }

  _wrap(val) {
    if (typeof val === 'function') {
      const sub = new RichTextBuilder();
      val(sub);
      return sub.build();
    }
    return val;
  }

  bankCardNumber(content) {
    this.nodes.push({ type: 'bank_card_number', text: this._wrap(content) });
    return this;
  }

  hashtag(content) {
    this.nodes.push({ type: 'hashtag', text: this._wrap(content) });
    return this;
  }

  cashtag(content) {
    this.nodes.push({ type: 'cashtag', text: this._wrap(content) });
    return this;
  }

  botCommand(content) {
    this.nodes.push({ type: 'bot_command', text: this._wrap(content) });
    return this;
  }

  reference(refName, content) {
    this.nodes.push({ type: 'reference', reference_name: String(refName), text: this._wrap(content) });
    return this;
  }

  referenceLink(refName, content) {
    this.nodes.push({ type: 'reference_link', reference_name: String(refName), text: this._wrap(content) });
    return this;
  }

  build() {
    if (this.nodes.length === 0) return '';
    if (this.nodes.length === 1) return this.nodes[0];
    return { type: 'texts', texts: this.nodes };
  }
}

/**
 * RichMessage & Block Builder
 */

class RichBuilder {
  constructor() {
    this.blocks = [];
    this.isRtl = false;
  }

  setRTL(rtl = true) {
    this.isRtl = Boolean(rtl);
    return this;
  }

  _resolveText(textOrFn) {
    if (typeof textOrFn === 'function') {
      const tb = new RichTextBuilder();
      textOrFn(tb);
      return tb.build();
    }
    return textOrFn;
  }

  heading(textOrFn, level = 2) {
    this.blocks.push({
      type: 'section_heading',
      level,
      text: this._resolveText(textOrFn)
    });
    return this;
  }

  paragraph(textOrFn) {
    this.blocks.push({
      type: 'paragraph',
      text: this._resolveText(textOrFn)
    });
    return this;
  }

  quote(textOrFn, options = {}) {
    const isExpandable = options.expandable === true;
    const isPull = options.pull === true;
    const type = isExpandable
      ? 'expandable_block_quotation'
      : (isPull ? 'pull_quotation' : 'block_quotation');

    const block = {
      type,
      text: this._resolveText(textOrFn)
    };
    if (options.credit) {
      block.credit = this._resolveText(options.credit);
    }
    this.blocks.push(block);
    return this;
  }

  code(codeText, language = '') {
    this.blocks.push({
      type: 'preformatted',
      language,
      text: typeof codeText === 'string' ? { type: 'plain', text: codeText } : this._resolveText(codeText)
    });
    return this;
  }

  divider() {
    this.blocks.push({ type: 'divider' });
    return this;
  }

  footer(textOrFn) {
    this.blocks.push({
      type: 'footer',
      text: this._resolveText(textOrFn)
    });
    return this;
  }

  list(items, options = {}) {
    const formattedItems = (items || []).map(it => {
      if (typeof it === 'object' && it !== null && (it.text !== undefined || it.list !== undefined)) {
        return {
          text: this._resolveText(it.text),
          list: it.list ? this._resolveList(it.list) : undefined
        };
      }
      return { text: this._resolveText(it) };
    });

    this.blocks.push({
      type: 'list',
      is_ordered: Boolean(options.ordered),
      start_number: options.startNumber || 1,
      items: formattedItems
    });
    return this;
  }

  _resolveList(listObj) {
    if (!listObj) return undefined;
    if (listObj.type === 'list') return listObj;
    return {
      type: 'list',
      is_ordered: Boolean(listObj.ordered),
      start_number: listObj.startNumber || 1,
      items: (listObj.items || []).map(it => ({ text: this._resolveText(it) }))
    };
  }

  table(rows, options = {}) {
    const formattedRows = (rows || []).map((row, rIdx) => {
      const cells = Array.isArray(row) ? row : (row.cells || []);
      return cells.map(c => {
        if (typeof c === 'object' && c !== null && c.text !== undefined) {
          return {
            ...c,
            text: this._resolveText(c.text)
          };
        }
        return {
          text: this._resolveText(c),
          is_header: Boolean(options.hasHeader && rIdx === 0)
        };
      });
    });

    const block = {
      type: 'table',
      rows: formattedRows,
      is_striped: Boolean(options.striped),
      is_bordered: Boolean(options.bordered),
      is_compact: Boolean(options.compact)
    };
    if (options.caption) {
      block.caption = this._resolveText(options.caption);
    }
    this.blocks.push(block);
    return this;
  }

  details(titleOrFn, contentFn, options = {}) {
    let contentBlocks = [];
    if (typeof contentFn === 'function') {
      const subBuilder = new RichBuilder();
      contentFn(subBuilder);
      contentBlocks = subBuilder.blocks;
    } else if (Array.isArray(contentFn)) {
      contentBlocks = contentFn;
    }

    this.blocks.push({
      type: 'details',
      title: this._resolveText(titleOrFn),
      content: contentBlocks,
      is_open: Boolean(options.isOpen)
    });
    return this;
  }

  buttons(buttonGrid) {
    const rows = (buttonGrid || []).map(row => {
      if (!Array.isArray(row)) row = [row];
      return row.map(btn => ({
        text: this._resolveText(btn?.text ?? btn),
        url: btn?.url,
        data: btn?.data
      }));
    });

    this.blocks.push({
      type: 'buttons',
      buttons: rows
    });
    return this;
  }

  thinking(textOrFn) {
    this.blocks.push({
      type: 'thinking',
      text: this._resolveText(textOrFn)
    });
    return this;
  }

  customBlock(blockObj) {
    if (blockObj && typeof blockObj === 'object') {
      this.blocks.push(blockObj);
    }
    return this;
  }

  mathematicalExpression(expr) {
    this.blocks.push({
      type: 'mathematical_expression',
      expression: String(expr)
    });
    return this;
  }

  anchor(name) {
    this.blocks.push({
      type: 'anchor',
      name: String(name)
    });
    return this;
  }

  build() {
    const payload = {
      blocks: this.blocks
    };
    if (this.isRtl) {
      payload.is_rtl = true;
    }
    return payload;
  }
}

/**
 * Main RichUtil Export Suite
 */

class RichUtil {
  /**
   * Parse a rich message or blocks array into BlocksParser instance
   * @param {Object|Array} blocksOrMessage
   * @param {Object} [options]
   * @returns {BlocksParser}
   */
  static parse(blocksOrMessage, options = {}) {
    return new BlocksParser(blocksOrMessage, options);
  }

  /**
   * Convert rich message or blocks into HTML complying with Telegram Rich Message Formatting Options
   * @param {Object|Array} blocksOrMessage
   * @param {Object} [options]
   * @returns {string}
   */
  static toHTML(blocksOrMessage, options = {}) {
    return new BlocksParser(blocksOrMessage, options).toHTML(options);
  }

  /**
   * Convert rich message or blocks into Markdown
   * @param {Object|Array} blocksOrMessage
   * @param {Object} [options]
   * @returns {string}
   */
  static toMarkdown(blocksOrMessage, options = {}) {
    return new BlocksParser(blocksOrMessage, options).toMarkdown(options);
  }

  /**
   * Convert rich message or blocks into MarkdownV2
   * @param {Object|Array} blocksOrMessage
   * @param {Object} [options]
   * @returns {string}
   */
  static toMarkdownV2(blocksOrMessage, options = {}) {
    return new BlocksParser(blocksOrMessage, options).toMarkdownV2(options);
  }

  /**
   * Convert rich message or blocks into plain text
   * @param {Object|Array} blocksOrMessage
   * @returns {string}
   */
  static toPlainText(blocksOrMessage) {
    return new BlocksParser(blocksOrMessage).toPlainText();
  }

  /**
   * Convert rich message or blocks to AST
   * @param {Object|Array} blocksOrMessage
   * @returns {Array<Object>}
   */
  static toAST(blocksOrMessage) {
    return new BlocksParser(blocksOrMessage).toAST();
  }

  /**
   * Parse an HTML formatted string into { blocks, is_rtl }
   * @param {string} html
   * @returns {{ blocks: Array<Object>, is_rtl?: boolean }}
   */
  static fromHTML(html) {
    return StringParser.fromHTML(html);
  }

  /**
   * Parse a Markdown formatted string into { blocks }
   * @param {string} md
   * @returns {{ blocks: Array<Object> }}
   */
  static fromMarkdown(md) {
    return StringParser.fromMarkdown(md);
  }

  /**
   * Create a new fluent RichBuilder instance
   * @returns {RichBuilder}
   */
  static builder() {
    return new RichBuilder();
  }

  /**
   * Create a new fluent RichTextBuilder instance
   * @returns {RichTextBuilder}
   */
  static textBuilder() {
    return new RichTextBuilder();
  }

  /**
   * Helper to escape HTML
   */
  static escapeHtml(str) {
    return escapeHtml(str);
  }

  /**
   * Helper to escape Markdown
   */
  static escapeMarkdown(str, version = 'v1') {
    return version === 'v2' ? escapeMarkdownV2(str) : escapeMarkdown(str);
  }
}

// Expose classes on RichUtil
RichUtil.BlocksParser = BlocksParser;
RichUtil.RichTextParser = RichTextParser;
RichUtil.StringParser = StringParser;
RichUtil.RichBuilder = RichBuilder;
RichUtil.RichTextBuilder = RichTextBuilder;

module.exports = RichUtil;

// last updated: 01/09/26
// _v: 1.0.0
// type: synchronous


// not tested, written by ai.
//report issuess honestly please.