async function hi() {
  let userId = user.id;

  let result;
  try {
    result = await Api.sendMessage({
      chat_id: userId, // Replace with real public channel
      text: userId
    });

    Bot.inspect(result.status);
  } catch (err) {
    Bot.sendMessage("❌ Error: " + (err.message || "Unknown error"));
  }
}

module.exports = { hi };
