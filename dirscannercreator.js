var Path = require('path'),
  fs = require('fs'),
  fsstat = fs.stat.bind(fs),
  readdir = fs.readdir.bind(fs);

function createDirScanner (execlib) {

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib;

  function isDir (path) {
    return q.nfcall(fsstat, path).then(qlib.methodinvoker('isDirectory'));
  }

  function subdirtester(d, path, subdir) {
    var ret = qlib.promise2decision(hasAccountsSubDirectory(Path.join(path, subdir)), function (hasaccsd) {
      if (hasaccsd) {
        d.notify(subdir);
      }
      d = null;
      return hasaccsd;
    });
    path = null;
    return ret;
  }

  function scanner(d, path, list) {
    if (!(lib.isArray(list) && list.length>0)) {
      return q(true);
    }
    return q.all(list.map(subdirtester.bind(null, d, path)));
  }

  function reallyScanDir (path) {
    var d = q.defer();
    qlib.promise2defer(
      q.nfcall(readdir, path).then(scanner.bind(null, d, path)),
      d
    );
    return d.promise;
  }

  function decideOnReallyDir (path, isdir) {
    return isdir ? reallyScanDir(path) : false;
  }

  function hasSubDirectory (subdirname, dirpath) {
    return isDir(Path.join(dirpath, subdirname));
  }

  function hasAccountsSubDirectory (dirpath) {
    return hasSubDirectory('accounts.db', dirpath);
  }

  function scanDir (path) {
    var d = q.defer();
    qlib.promise2defer(qlib.promise2decision(isDir(path), decideOnReallyDir.bind(null, path)), d);
    return d.promise;
  }

  return scanDir;
}

module.exports = createDirScanner;
