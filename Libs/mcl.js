async function check(userId, channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error("[LibsError] InputError: Channels list must be a non-empty array");
  }

  if (channels.length > 10) {
    throw new Error("[LibsError] LimitError: Max 10 channels allowed");
  }

  const results = {
    all_joined: true,
    valid: [],
    left: [],
    invalid: [],
    details: []
  };

  await Promise.all(channels.map(async (channel) => {
    try {
      const member = await Api.getChatMember({
        chat_id: channel,
        user_id: userId
      });

      results.details.push({ channel, member });

      if (["left", "kicked"].includes(member.status)) {
        results.left.push(channel);
        results.valid.push(channel);
        results.all_joined = false;
      } else {
        results.valid.push(channel);
      }
    } catch (err) {
      results.invalid.push(channel);
      results.details.push({ channel, error: err.message });
      results.all_joined = false;
    }
  }));

  return results;
}

async function quick(userId, channels) {
  const result = await check(userId, channels);
  return result.all_joined;
}

async function getLeftChannels(userId, channels) {
  const result = await check(userId, channels);
  return result.left;
}

async function getInvalidChannels(userId, channels) {
  const result = await check(userId, channels);
  return result.invalid;
}

async function summaryText(userId, channels) {
  const result = await check(userId, channels);
  if (result.all_joined) return "✅ You have joined all required channels.";

  let msg = "🚫 You're missing some channel(s):\n";
  if (result.left.length > 0) {
    msg += `\n📤 Left:\n${result.left.map(c => "• " + c).join("\n")}`;
  }
  if (result.invalid.length > 0) {
    msg += `\n\n❌ Invalid:\n${result.invalid.map(c => "• " + c).join("\n")}`;
  }
  return msg;
}

module.exports = {
  check,             // detailed full result
  quick,             // true/false only
  getLeftChannels,   // list of channels the user left
  getInvalidChannels,// list of invalid/inaccessible channels
  summaryText        // returns a friendly formatted message
};
