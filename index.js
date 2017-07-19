function createBankSet (execlib) {
  //return require('./creator')(execlib);
  return execlib.loadDependencies('client', ['allex_leveldblib', 'allex_leveldbbanklib'], createLib.bind(null, execlib));
}

function createLib (execlib, leveldblib, banklib) {
  return execlib.lib.q({
    BankSet: require('./creator')(execlib),
    Hook: require('./hookcreator')(execlib, leveldblib, banklib)
  });
}


module.exports = createBankSet;
