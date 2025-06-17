function hi() {
  const userId = user.id;

  return Api.getChatMember({
    chat_id: "@channel1", // Replace with real one
    user_id: userId
  }).then(res => {
    Bot.sendMessage("✅ Status: " + res.status);
  }).catch(e => {
    Bot.sendMessage("❌ Error: " + (e.message || "Unknown error"));
  });
}

module.exports = { hi };
