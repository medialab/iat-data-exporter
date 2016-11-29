/**
 * Zip files in a directory.
 * @param  {strong} dir  Directory path.
 * @param  {strong} name Name of the zip file.
 * @return {Promise}     Resolve to the name of the zip file.
 */
module.exports = (dir, name) => {
  return new Promise((resolve, reject) => {
    require('child_process').exec('zip ' + dir + name + ' -j ' + dir + '*', (err, stdout, stderr) => {
      if (err) return reject(err);
      return resolve(name + '.zip');
    });
  });
}
