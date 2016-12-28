function createBankSet (execlib) {
  //return require('./creator')(execlib);
  return execlib.loadDependencies('client', ['allex:leveldb:lib'], createLib.bind(null, execlib));
}

function createLib (execlib, leveldblib) {
  return execlib.lib.q({
    BankSet: require('./creator')(execlib),
    Hook: require('./hookcreator')(execlib, leveldblib)
  });
}


module.exports = createBankSet;
