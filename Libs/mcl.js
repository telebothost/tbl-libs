const check = async (userId, channels) => {
  if (!Array.isArray(channels) || channels.length > 10) {
    return { error: "Max 10 channels allowed" };
  }

  const results = {
    all_joined: true,
    valid: [],
    left: [],
    invalid: [],
    details: []
  };

  const checks = await Promise.all(channels.map(async chat => {
    try {
      const res = await Api.getChatMember({ chat_id: chat, user_id: userId });

      // Ensure response is valid and status is defined
      if (!res || typeof res.status !== "string") {
        return { chat, status: "invalid", valid: false };
      }

      return { chat, status: res.status, valid: true };
    } catch {
      return { chat, status: "invalid", valid: false };
    }
  }));

  checks.forEach(item => {
    if (!item.valid) {
      results.invalid.push(item.chat);
      results.all_joined = false;
    } else if (item.status === "left") {
      results.left.push(item.chat);
      results.all_joined = false;
    } else {
      results.valid.push(item.chat);
      results.details.push({
        chat: item.chat,
        role: item.status,
        since: new Date().toISOString()
      });
    }
  });

  return results;
};

const quick = async (userId, channels) => {
  const { all_joined } = await check(userId, channels);
  return all_joined;
};

const format = (result) => {
  if (result.error) return result.error;

  let msg = "🔍 Channel Verification\n\n";
  msg += `Status: ${result.all_joined ? "✅ All joined" : "❌ Missing channels"}\n\n`;

  if (result.details.length) {
    msg += "Joined Channels:\n";
    result.details.forEach(c => {
      msg += `- ${c.chat} (${c.role})\n`;
    });
  }

  if (result.left.length) {
    msg += `\nMissing: ${result.left.join(", ")}\n`;
  }

  if (result.invalid.length) {
    msg += `\nInvalid: ${result.invalid.join(", ")}`;
  }

  return msg;
};

const buttons = (result) => {
  const btns = [];
  if (result.left.length) {
    result.left.forEach(chat => {
      btns.push([{ text: `Join ${chat}`, url: `https://t.me/${chat.replace("@", "")}` }]);
    });
  }
  return btns;
};

module.exports = { check, quick, format, buttons };
