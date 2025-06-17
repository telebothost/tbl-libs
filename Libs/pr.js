let text = "Hii";

async function hi() {
  await Promise.all([
    Api.sendMessage({ text }),
    Api.sendMessage({ text })
  ]);
}

module.exports = { hi };
