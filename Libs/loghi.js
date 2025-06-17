function hi() {
  let userId = user.id;

  let result;
  try {
    result = await Api.getChatMember({
      chat_id: "@telegram", // Replace with real public channel
      user_id: userId
    });

    Bot.sendMessage("✅ Status: " + result.status);
  } catch (err) {
    Bot.sendMessage("❌ Error: " + (err.message || "Unknown error"));
  }
}

module.exports = { hi };
