function hi() {
  const userId = user.id;
  const channels = ["@channel1", "@channel2"]; // Replace with real channels

  return Promise.all(channels.map(chatId =>
    Api.getChatMember({
      chat_id: chatId,
      user_id: userId
    }).then(res => ({
      chat: chatId,
      status: res.status
    })).catch(err => ({
      chat: chatId,
      status: "error",
      error: err.message
    }))
  )).then(results => {
    Bot.inspect(results); // Show raw results for debugging
  });
}

module.exports = { hi };
