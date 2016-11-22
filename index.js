var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
var app = express();

app.set('views', __dirname + '/views');
app.engine('.html', require('ejs').renderFile)

app.get('/', function (req, res) {
  res.render('index.html');
});

app.post('/fetch', jsonParser, function (req, res) {

  res.status(200).send('hello world')
});

app.listen(3000, function () {
  console.log('Serving on port 3000...');
});
