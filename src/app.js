const config = require('./config')
const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const fileUpload = require('express-fileupload')
app.use(fileUpload())
const compress = require('compression')
const bodyParser = require('body-parser')
const logger = require('morgan')
config.setEnvironment(app.get('env'))
if (!config.getConfig().noCompress) {
  app.use(compress())
}

const {sequelize} = require('./model')

const cors = require('cors')
app.use(cors())
app.use(bodyParser({limit: '50mb'}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

require('passport')

const routes = require('./routes/index')
app.use('/api', routes)

app.get('/status', (req, res) => {
  res.send({
    message: 'hello world'
  })
})

app.use(logger('dev'))
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  console.log(res)
  let err = new Error('Not Found')
  err.status = 404
  next(err)
})

const port = config.getConfig().port || 4105
sequelize.sync()
  .then(() => {
    server.listen(port, function () {
      console.log('partageheure.com app listening on environment', app.get('env'))
    })
  })

module.exports = app
