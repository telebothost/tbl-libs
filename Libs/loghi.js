//Just a test lib to test thing's time to Time 

async function hi() {
  const userId = user.id;

  // Replace these with your actual channel usernames or IDs
  const channels = ["@DemoChannel1", "@DemoChannel2"];

  const checks = await Promise.all(channels.map(async (channel) => {
    try {
      const member = await Api.getChatMember({
        chat_id: channel,
        user_id: userId
      });

      if (member.status === "left") {
        return { channel, joined: false };
      }

      return { channel, joined: true };
    } catch (err) {
      return { channel, joined: false, error: err.message };
    }
  }));

  const notJoined = checks.filter(c => !c.joined);

  if (notJoined.length > 0) {
    const message = "🚫 Please join all required channels:\n" +
      notJoined.map(c => c.channel).join("\n");

    return Bot.sendMessage(message);
  }

  return Bot.sendMessage("✅ You have joined all required channels!");
}

module.exports = {
  hi
};
