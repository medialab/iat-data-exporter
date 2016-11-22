var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var downloader = require('./downloader');
var transformer = require('./transformer');
var app = express();
var isFetching = false;
var isTransforming = false;
var isReady = false;
var percent = require('./percent');

app.use('/static', express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.engine('.html', require('ejs').renderFile)

app.get('/', function (req, res) {
  res.render('index.html');
});

app.post('/fetch', jsonParser, function (req, res) {
  isFetching = true;
  downloader(req.body.uri)
    .then(function (data) {
      data.promise.then(function (pathToFile) {
        isFetching = false;
        isTransforming = true;
      })
      .then(function () {
        transformer(pathToFile)
          .then(function (data) {
            isTransforming = false;
            isReady = true;
          });
      })
    });

  res.status(200).send('Fetching...');
});

app.get('/status', function (req, res) {
  if (isFetching) {
    return res.status(200).send({status: 'fetching', progress: percent()});
  } else if (isTransforming) {
    return res.status(200).send({status: 'transforming'});
  } else if (isReady) {
    return res.status(200).send({status: 'ready'});
  } else {
    res.status(500);
  }
});

app.listen(3000, function () {
  console.log('Serving on port 3000...');
});
