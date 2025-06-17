async function hi() {
  let userId = user.id;
    let result =  Api.sendMessage({
      chat_id: userId, // Replace with real public channel
      text: userId
    });

    Bot.inspect(result.status);
}

module.exports = { hi };
