function checkChannels(userId) {
  const channelIds = ["@channel1", "@channel2"]; // Replace with actual channel usernames or IDs

  return Promise.all(channelIds.map(chatId =>
    Api.getChatMember({
      chat_id: chatId,
      user_id: userId
    }).then(res => {
      const status = res.status;
      const isMember = status === "member" || status === "administrator" || status === "creator";

      return {
        chat: chatId,
        joined: isMember,
        status: status
      };
    }).catch(err => ({
      chat: chatId,
      joined: false,
      status: "error",
      error: err.message
    }))
  ));
}

function hi() {
  const userId = user.id;

  return checkChannels(userId).then(results => {
    const allJoined = results.every(r => r.joined);

    if (allJoined) {
      Bot.sendMessage("✅ You joined all channels!");
    } else {
      const notJoined = results.filter(r => !r.joined).map(r => r.chat).join(", ");
      Bot.sendMessage("❌ Please join: " + notJoined);
    }
  });
}

module.exports = { hi };
