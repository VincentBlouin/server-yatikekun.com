let config = {}
module.exports = {
  setEnvironment: function (environment) {
    config = require('./' + environment + '.json')
  },
  getConfig: function () {
    return config
  }
}
