var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var downloader = require('./downloader');
var transformer = require('./transformer');
var fileMaker = require('./file-maker');
var eraseFilesFromDir = require('./file-deleter');
var zipper = require('./file-zipper');
var app = express();
var percent = require('./percent');
var fs = require('fs');

var isFetching = false;
var isTransforming = false;
var isReady = false;
var hasError = false;
var errorMsg = null;

var zipFile;

var zipFileName = function () {
  var d = new Date();
  return 'IAT_export_' +
    d.getFullYear().toString() +
    d.getMonth().toString() +
    d.getDate().toString() + '_' +
    d.getHours().toString() +
    d.getMinutes().toString() +
    d.getSeconds().toString();
}

app.use('/static', express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.engine('.html', require('ejs').renderFile)

app.get('/', function (req, res) {
  res.render('index.html');
});

app.post('/fetch', jsonParser, function (req, res) {
  csvFileLinks = null;
  isFetching = true;
  eraseFilesFromDir(__dirname + '/public/downloadables/');

  downloader(req.body.uri)
    .then(function (data) {
      return data.promise;
    })
    .then(function (pathToFile) {
      percent(0, true);
      isFetching = false;
      isTransforming = true;
      return Promise.resolve(pathToFile);
    })
    .then(function (pathToFile) {
      return transformer(pathToFile);
    })
    .then(function (results) {
      isTransforming = false;
      return fileMaker(results, true);
    })
    .then(function (links) {
      csvFileLinks = links;
      eraseFilesFromDir(__dirname + '/public/');
      return Promise.resolve(true);
    })
    .then(function () {
      return zipper(__dirname + '/public/downloadables/', zipFileName());
    })
    .then(function (fileName) {
      zipFile = fileName;
      isReady = true;

      try {
        fs.unlink(__dirname + csvFileLinks.meta);
        fs.unlink(__dirname + csvFileLinks.errors);
        fs.unlink(__dirname + csvFileLinks.results);
        csvFileLinks = null;
      } catch (err) {
        console.log(err);
      }

      return Promise.resolve(zipFile);
    })
    .catch(function (err) {
      hasError = true;
      errorMsg = err.message;
    });

  res.status(200).send({status: 'Fetching data from database...', progress: percent()});
});

app.get('/status', function (req, res) {
  if (isFetching) {
    return res.status(200).send({status: 'Fetching data from database...', progress: percent()});
  } else if (isTransforming) {
    return res.status(200).send({status: 'Transforming into CSV', progress: 100});
  } else if (isReady) {
    return res.status(200).send({status: 'ready', payload: 'static/downloadables/' + zipFile});
  } else if (hasError) {
    return res.status(500).send({status: 'error', message: errorMsg});
  } else {
    res.status(500);
  }
});

app.listen(process.env.PORT || 3000, function () {
  console.log('Serving on port ' + (process.env.PORT || 3000) + '...');
});
