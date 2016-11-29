module.exports = () => {
  const express = require('express');
  const bodyParser = require('body-parser');
  const jsonParser = bodyParser.json();
  const downloader = require(__dirname + '/downloader');
  const transformer = require(__dirname + '/transformer');
  const fileMaker = require(__dirname + '/file-maker');
  const eraseFilesFromDir = require(__dirname + '/file-deleter');
  const zipper = require(__dirname + '/file-zipper');
  const app = express();
  const percent = require(__dirname + '/percent');
  const fs = require('fs');

  let isFetching = false;
  let isTransforming = false;
  let isReady = false;
  let hasError = false;
  let errorMsg = null;

  let finalZipFile;

  const createZipFileName = () => {
    const d = new Date();
    return 'IAT_export_' +
      d.getFullYear().toString() +
      d.getMonth().toString() +
      d.getDate().toString() + '_' +
      d.getHours().toString() +
      d.getMinutes().toString() +
      d.getSeconds().toString();
  }

  const triggerFetch = uri => {
    csvFileLinks = null;
    isFetching = true;
    eraseFilesFromDir(__dirname + '/public/dump/');
    eraseFilesFromDir(__dirname + '/public/downloads/');

    downloader(uri)
      .then(data => {
        return data.promise;
      })
      .then(pathToFile => {
        percent(0, true);
        isFetching = false;
        isTransforming = true;
        return Promise.resolve(pathToFile);
      })
      .then(pathToFile => {
        return transformer(pathToFile);
      })
      .then(results => {
        isTransforming = false;
        return fileMaker(results, true);
      })
      .then(links => {
        csvFileLinks = links;
        eraseFilesFromDir(__dirname + '/public/dump/');
        return Promise.resolve(true);
      })
      .then(() => {
        return zipper(__dirname + '/public/downloads/', createZipFileName());
      })
      .then(fileName => {
        finalZipFile = fileName;
        isReady = true;

        try {
          fs.unlink(__dirname + csvFileLinks.meta);
          fs.unlink(__dirname + csvFileLinks.errors);
          fs.unlink(__dirname + csvFileLinks.results);
          csvFileLinks = null;
        } catch (err) {
          console.log(err);
        }

        return Promise.resolve(finalZipFile);
      })
      .catch(err => {
        hasError = true;
        errorMsg = err.message;
      });
  };

  app.use('/static', express.static(__dirname + '/public'));

  app.set('views', __dirname + '/views');
  app.engine('.html', require('ejs').renderFile)

  app.get('/', function (req, res) {
    res.render('index.html');
  });

  app.post('/fetch', jsonParser, function (req, res) {
    res.status(200).send({status: 'Fetching data from database...', progress: percent()});
    triggerFetch(req.body.uri);
  });

  app.get('/status', function (req, res) {
    if (isFetching) {
      return res.status(200).send({status: 'Fetching data from database...', progress: percent()});
    } else if (isTransforming) {
      return res.status(200).send({status: 'Transforming into CSV', progress: 100});
    } else if (isReady) {
      return res.status(200).send({status: 'ready', payload: 'static/downloads/' + finalZipFile});
    } else if (hasError) {
      return res.status(500).send({status: 'error', message: errorMsg});
    } else {
      res.status(500);
    }
  });

  const server = app.listen(process.env.PORT || 3000, function () {
    console.log('Serving on port ' + (process.env.PORT || 3000) + '...');
  });

  return function closeServer () {
    console.log('Closing server...');
    server.close();
    process.exit();
  }
};
