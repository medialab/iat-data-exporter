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
        return Promise.resolve(pathToFile);
      })
      .then(function (pathToFile) {
        transformer(pathToFile)
          .then(function (results) {
            percent(0);

            isTransforming = false;

            fileMaker(results, true)
              .then(function (links) {
                console.log(links);
                eraseFilesFromDir(__dirname + '/public/');
                return Promise.resolve(links);
              })
              .then(function (links) {
                zipper(__dirname + '/public/downloadables/')
                  .then(function (file) {
                    zipFile = file;
                    isReady = true;
                    return Promise.resolve(zipFile);
                  })
                  .catch(function(err) {
                    return Promise.reject(err);
                  })
              })
              .catch(function (err) {
                return Promise.reject(err);
              });

          })
          .catch(function (err) {
            return Promise.reject(err);
          });
      })
      .catch(function (err) {
        return Promise.reject(err);
      });
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
    return res.status(200).send({status: 'Transforming into CSV', progress: percent()});
  } else if (isReady) {
    return res.status(200).send({status: 'ready', payload: zipFile});
  } else if (hasError) {
    return res.status(500).send({status: 'error', message: errorMsg});
  } else {
    res.status(500);
  }
});

app.listen(3000, function () {
  console.log('Serving on port 3000...');
});
