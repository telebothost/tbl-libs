//Just a test lib to test thing's time to Time

//Testing cross lib access 
function hi() {
  let u = Libs.random.randomString(4)
  return u
}

module.exports = {
  hi
};
