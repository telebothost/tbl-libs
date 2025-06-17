let text = "Hii";

function hi() {
  return Promise.all([
    Api.sendMessage({ text }),
    Api.sendMessage({ text })
  ]);
}

module.exports = { hi };
