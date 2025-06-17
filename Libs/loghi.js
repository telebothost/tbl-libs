function hi() {
  const userId = user.id;
  const channels = ["@channel1", "@channel2"]; // Replace as needed

  return Promise.all(
    channels.map(chatId =>
      Api.getChatMember({
        chat_id: chatId,
        user_id: userId
      })
      .then(res => {
        return {
          chat: chatId,
          status: res.status
        };
      })
      .catch(e => {
        return {
          chat: chatId,
          status: "error",
          error: e.message || "Unknown error"
        };
      })
    )
  ).then(results => {
    Bot.inspect(results);
  });
}

module.exports = { hi };
