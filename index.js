var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var downloader = require('./downloader');
var app = express();
var isFetching = false;
var currentPercent = 0;

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
      data.promise.then(function (data) {
        console.log('Done');
        console.log(data);
        isFetching = false;
      });
    });

  res.status(200).send('Fetching...');
});

app.listen(3000, function () {
  console.log('Serving on port 3000...');
});
