var express = require('express')
var app = express()
var graph = require('fbgraph')
var _ = require('lodash')

var APP_ID = process.env.APP_ID
var APP_SECRET = process.env.APP_SECRET
var PAGE_ID = process.env.PAGE_ID

var CACHED_DATA = {time: null, data: null}

if (!APP_ID || !APP_SECRET || !PAGE_ID) {
  throw new 'Missing configurations'
}

app.set('port', (process.env.PORT || 5000))

app.get('/rest', function(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  if (cachedDataIsOk()) {
    response.setHeader('Cache-Control', 'public, max-age=300') // Cache for 5m in browser
    response.send(CACHED_DATA.data);
  } else {
    response.setHeader('Cache-Control', 'public, no-cache, no-store')
    response.status(503).send('Unavailable')
  }
})

app.get('/*', function(request, response) {
  response.status(404).send('Not found')
})

setInterval(refreshFacebookPosts, 5 * 60 * 1000) // Refresh FB cache every 5min
refreshFacebookPosts()

function cachedDataIsOk() {
  return CACHED_DATA.time 
    && CACHED_DATA.data && CACHED_DATA.data.length // Data available
    && (new Date()).getTime() - CACHED_DATA.time < 6 * 60 * 60 * 1000 // Cached data is less than an 6h old
}

function refreshFacebookPosts() {
  graph.get(PAGE_ID + "/posts", {limit: 10, access_token: APP_ID+"|"+APP_SECRET }, function(err, res) {
    if (res && res.data) {
      var data = _.map(res.data, function(entry) {
        return _.pick(entry, ['message', 'created_time', 'picture', 'link'])
      })
      CACHED_DATA.time = (new Date()).getTime()
      CACHED_DATA.data = data
    } else {
      console.log('Error fetching FB data:', err)
    }
  })
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})

