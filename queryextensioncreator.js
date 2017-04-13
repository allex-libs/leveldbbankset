function createQueryExtension (execlib, BankSet, bankapplier) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib;

  function queryaugmenter (bankname, defer, kva) {
    if (bankname === '004') {
      console.log('now what?', kva);
    }
    var key, mykva, i;
    if (!lib.isArray(kva)) {
      return;
    }
    key = kva[0];
    if (lib.isArray(key)){
      key.unshift(bankname);
    } else {
      key = [bankname, key];
    }
    mykva = [key];
    for (i=1; i<kva.length; i++) {
      mykva.push(kva[i]);
    }
    defer.notify(mykva);
  }

  function allQuerierForBankReal (methodname, filterdesc, mystarteddefer, defer, localdefer, bank, bankname) {
    var d = localdefer || q.defer();
    d.promise.then(null, null, queryaugmenter.bind(null, bankname, defer));
    bank[methodname](filterdesc, d, mystarteddefer);
  }

  function allQuerierForBank (methodname, ps, sps, filterdesc, defer, starteddefer, bank, bankname) {
    var d = q.defer(), mystarteddefer;
    if (starteddefer) {
      mystarteddefer = q.defer();
      //qlib.promise2defer(mystarteddefer.promise, starteddefer);
      sps.push(mystarteddefer.promise);
    }
    ps.push(d.promise);
    allQuerierForBankReal(methodname, filterdesc, mystarteddefer, defer, d, bank, bankname);
  }

  function queryAll(methodname, bs, filterdesc, defer, starteddefer) {
    var ps = [], sps = [], listener, listenerdestroyer;
    bs.banks.traverse(allQuerierForBank.bind(null, methodname, ps, sps, filterdesc, defer, starteddefer));
    listener = bs.newBank.attach(allQuerierForBankReal.bind(null, methodname, filterdesc, null, defer, null)); 
    listenerdestroyer = listener.destroy.bind(listener);
    defer.promise.then(listenerdestroyer, listenerdestroyer);
    qlib.promise2defer(q.all(ps), defer);
    if (starteddefer) {
      qlib.promise2defer(q.all(sps), starteddefer);
      return starteddefer.promise;
    }
    return q(true);
  }

  function arryQuerierForBank (methodname, ps, sps, bs, filterdesc, defer, starteddefer, bankname) {
    var d = q.defer(), mystarteddefer;
    if (starteddefer) {
      mystarteddefer = q.defer();
      qlib.promise2defer(mystarteddefer.promise, starteddefer);
      sps.push(mystarteddefer.promise);
    }
    d.promise.then(null, null, queryaugmenter.bind(null, bankname, defer));
    ps.push(d.promise);
    return bs.getOrCreateBank(bankname).then(
      bankapplier.bind(null, methodname, [filterdesc, d, mystarteddefer])
    );
    //bank[methodname](filterdesc, d, mystarteddefer);
  }

  function queryArry(methodname, bs, filterdesc, defer, starteddefer) {
    var ps = [], sps = [];
    filterdesc.bankname.forEach(arryQuerierForBank.bind(null, methodname, ps, sps, bs, filterdesc, defer, starteddefer));
    qlib.promise2defer(q.all(ps), defer);
    if (starteddefer) {
      qlib.promise2defer(q.all(sps), starteddefer);
      return starteddefer.promise;
    }
    return q(true);
  }

  function querySingle(methodname, bs, filterdesc, defer, starteddefer, bankname) {
    var myd = q.defer();
    myd.promise.then(
      defer.resolve.bind(defer),
      defer.reject.bind(defer),
      queryaugmenter.bind(null, bankname, defer)
    );
    return bs.getOrCreateBank(bankname).then(
      bankapplier.bind(null, methodname, [filterdesc, myd, starteddefer])
    );
  }

  function queryTemplate (methodname) {
    return function (filterdesc, defer, starteddefer) {
      var myd, bankname = filterdesc.bankname;
      if (!bankname) {
        return queryAll(methodname, this, filterdesc, defer, starteddefer);
      }
      if (lib.isArray(bankname)) {
        return queryArry(methodname, this, filterdesc, defer, starteddefer);
      }
      return querySingle(methodname, this, filterdesc, defer, starteddefer, bankname);
    };
  }

  BankSet.prototype.query = queryTemplate('query');
  BankSet.prototype.queryLog = queryTemplate('queryLog');

}

module.exports = createQueryExtension;
