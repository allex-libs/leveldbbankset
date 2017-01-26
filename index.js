function createBankSet (execlib) {
  //return require('./creator')(execlib);
  return execlib.loadDependencies('client', ['allex:leveldb:lib', 'allex:leveldbbank:lib'], createLib.bind(null, execlib));
}

function createLib (execlib, leveldblib, banklib) {
  return execlib.lib.q({
    BankSet: require('./creator')(execlib),
    Hook: require('./hookcreator')(execlib, leveldblib, banklib)
  });
}


module.exports = createBankSet;
