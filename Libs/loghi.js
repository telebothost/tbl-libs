 async function hi() {
  let userId = user.id;
    let result =  await Api.sendMessage({
      chat_id: userId, // Replace with real public channel
      text: userId
    });

    Bot.sendMessage(result);
}

module.exports = { hi };
