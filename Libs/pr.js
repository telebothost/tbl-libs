let text = "Hii"
let hi = () => await Promise.all([
    
    Api.sendMessage({text}),
    Api.sendMessage({text})
])
