async function hi() {
    let userId = user.id; 
    let result = await Api.sendMessage({
        chat_id: userId,
        text: userId
    });
    return Bot.sendMessage(result);
}

module.exports = {
    hi
};
