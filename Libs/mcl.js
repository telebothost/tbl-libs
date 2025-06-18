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

      const isErrorLike = member?.message || member?.ok === false;

      if (isErrorLike) {
        results.invalid.push(channel);
        return;
      }

      const status = member?.result?.status;

      if (["left", "kicked"].includes(status)) {
        results.left.push(channel);
        results.valid.push(channel);
        results.details.push({ channel, member });
        results.all_joined = false;
      } else {
        results.valid.push(channel);
        results.details.push({ channel, member });
      }

    } catch (_) {
      results.invalid.push(channel);
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

  let msg = "🚫 Please join the required channels:";
  if (result.left.length > 0) {
    msg += `\n\n📤 Left:\n${result.left.map(c => "• " + c).join("\n")}`;
  }
  if (result.invalid.length > 0) {
    msg += `\n\n❌ Invalid/Inaccessible:\n${result.invalid.map(c => "• " + c).join("\n")}`;
  }
  return msg;
}

module.exports = {
  check,
  quick,
  getLeftChannels,
  getInvalidChannels,
  summaryText
};
