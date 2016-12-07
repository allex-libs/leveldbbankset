function createBankSet (execlib) {
  return loader.bind(null, execlib);
}

function loader (execlib, banklibname) {
  return execlib.loadDependencies('client', [banklibname], require('./creator').bind(null, execlib));
}


module.exports = createBankSet;
