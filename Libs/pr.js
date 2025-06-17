let text = "Hii";

const hi = async () => {
  await Promise.all([
    Api.sendMessage({ text }),
    Api.sendMessage({ text })
  ]);
};

module.exports = { hi };
