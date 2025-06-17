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
let hi = async()=>{
const channels = ["@demo_channel1", "@demo_channel2"];

let data = await check(user.id, channels)
Bot.inspect(data)
}

module.exports = { hi }
