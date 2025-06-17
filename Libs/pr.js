let text = "Hii"
const hi = () => await Promise.all([
    
    Api.sendMessage({text}),
    Api.sendMessage({text})
])
module.exports = {hi}
