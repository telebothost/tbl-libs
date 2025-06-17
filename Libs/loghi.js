//Just a test Lib for logging 
const hi = () => Promise.all([
    Bot.sendMessage("Hii"),
    Bot.sendMessage("hii1")
]);
module.exports = { hi }
