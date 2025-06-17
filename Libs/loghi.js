function hi() {
  const text = "Hii";

  return Promise.all([
    Api.sendMessage({ text }),
    Api.sendMessage({ text })
  ]).then(results => {
    Bot.inspect(results); // View the result of each sendMessage
  }).catch(err => {
    Bot.sendMessage("❌ Error: " + err.message);
  });
}

module.exports = { hi };
