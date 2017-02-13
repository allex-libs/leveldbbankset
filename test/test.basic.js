var _banknames = ['001', '002', '003'],
  _usernames = ['peter', 'paul', 'mary'];
 
loadMochaIntegration('allex_leveldblib');

function ctorsetter(banklib) {
  Bank = banklib.Bank;
  return q(true);
}

function all(num) {
  var i, j, ret = [], r;
  for (i=0; i<_banknames.length; i++) {
    r = [];
    for (j=0; j<_usernames.length; j++) {
      r.push(num);
    }
    ret.push(r);
  }
  return ret;
}

function popper1 () {
  return {pop:1};
}

function itemprinter (item) {
  //console.log('item', item);
}

function accountfiller (bankset, bankname, accountname) {
  return bankset.charge(bankname, accountname, -(1000+(~~(Math.round()*500))), ['fill']);
}

function bankfiller (bankset, bankname) {
  return q.all(_usernames.map(accountfiller.bind(null, bankset, bankname)));
}

function randomAmount (min, max) {
  return min + (~~(Math.random() * (max-min)));
}

function args4apply (bankname, banknameindex, accountname, accountnameindex, args) {
  var ret = [bankname, accountname], i, arg, j, dopush;
  for (i=1; i<args.length; i++) {
    dopush = true;
    arg = args[i];
    if (arg.hasOwnProperty('_evaluate') && lib.isFunction(arg._evaluate)) {
      arg = arg._evaluate(bankname, banknameindex, accountname, accountnameindex);
    }
    if (arg && arg.hasOwnProperty('pop')) {
      for (j=0; j<arg.pop; j++) {
        ret.pop();
      }
    }
    if (arg && arg.hasOwnProperty('should_expand') && lib.isArray(arg.should_expand)) {
      while(arg.should_expand.length) {
        ret.push(arg.should_expand.shift());
      }
      dopush = false;
    }
    if (arg && arg.hasOwnProperty('_value')) {
      arg = arg._value;
    }
    if (dopush) {
      ret.push (arg);
    }
  }
  return ret;
}

function accountapplier (bankset, bankname, banknameindex, args, accountname, accountnameindex) {
  var methodname = args[0], method = bankset[methodname];
  if (!lib.isFunction(method)) {
    throw new Error (methodname+' is not a method of BankSet');
  }
  return method.apply(bankset, args4apply(bankname, banknameindex, accountname, accountnameindex, args));
}

function bankapplier (bankset, args, bankname, banknameindex) {
  return q.all(_usernames.map(accountapplier.bind(null, bankset, bankname, banknameindex, args)));
}

function applytobankset (bankset, args) {
  return q.all(_banknames.map(bankapplier.bind(null, bankset, args)));
}

function filler001 (kva) {
  var key = kva[0], value = kva[1];
  console.log('filler001', key, value);
  States001[key[1]] = value;
}

describe('Basic tests', function () {
  var _reservations;
  function reservationsetter(reservations) {
    _reservations = reservations;
    return q(reservations);
  }
  function reservation4use (bankname, banknameindex, accountname, accountnameindex) {
    var r = _reservations[banknameindex][accountnameindex];
    return {pop:1, should_expand: [r[0], r[1]]};
  }
  /*
  it('Load library', function () {
    return execlib.loadDependencies('client', ['allex:leveldbbank:lib'], ctorsetter);
  });
  */
  loadClientSide(['allex:leveldbbankset:lib', 'allex:leveldbbank:lib', 'allex:leveldb:lib']);
  it('Set internal variables', function () {
    return setGlobal('BankSet', leveldbbanksetlib.BankSet).then(
      setGlobal.bind(null, 'States001', {})
    ).then(
      setGlobal.bind(null, 'Bank', leveldbbanklib.Bank)
    );
  });
  it('new BankSet has to throw if no prophash given', function () {
    expect(function (){new BankSet()}).to.throw(/hash in its ctor/);
  });
  it('new BankSet has to throw if no path specified', function () {
    expect(function (){new BankSet({})}).to.throw(/has to have a path/);
  });
  it('Instantiate BankSet', function () {
    var d = q.defer(), p = d.promise;
    new BankSet({
      path: 'bankset.db',
      bankctor: Bank,
      starteddefer: d
    })
    return setGlobal('bankset', p);
  });
  it('Read accounts with default', function () {
    this.timeout(150000);
    return applytobankset(bankset, ['readAccountWDefault', 0]);
  });
  it('Read accounts safe', function () {
    return applytobankset(bankset, ['readAccountSafe', 0]);
  });
  it('Fill some accounts with random money', function () {
    return applytobankset(bankset, ['charge', {_evaluate: randomAmount.bind(null, -2000, -1000)}, ['fill']]);
  });
  it('Close accounts', function () {
    return applytobankset(bankset, ['closeAccount']);
  });
  it('Read non-existing accounts should throw', function () {
    expect(applytobankset(bankset, ['readAccount'])).to.be.rejectedWith(/not found in database/);
  });
  it('Read accounts safe', function () {
    return applytobankset(bankset, ['readAccountSafe', 0]);
  });
  it('Fill some accounts with 1000', function () {
    return applytobankset(bankset, ['charge', -1000, ['fill']]);
  });
  it('Reserve 300 on accounts', function () {
    return applytobankset(bankset, ['reserve', 300, ['reserve']]).then(reservationsetter);
  });
  it('Commit reservations on accounts', function () {
    return applytobankset(bankset, ['commitReservation', {_evaluate: reservation4use}, ['commit']]).then(reservationsetter);
  });
  it('Read accounts', function () {
    expect(applytobankset(bankset, ['readAccount'])).to.eventually.deep.equal(all(700));
  });
  it('Reserve 300 on accounts', function () {
    return applytobankset(bankset, ['reserve', 300, ['reserve']]).then(reservationsetter);
  });
  it('Cancel reservations on accounts', function () {
    return applytobankset(bankset, ['cancelReservation', {_evaluate: reservation4use}, ['cancel']]).then(reservationsetter);
  });
  it('Read accounts', function () {
    expect(applytobankset(bankset, ['readAccount'])).to.eventually.deep.equal(all(700));
  });
  it('Reserve 300 on accounts', function () {
    return applytobankset(bankset, ['reserve', 300, ['reserve']]).then(reservationsetter);
  });
  it('Partially commit 100 on accounts', function () {
    return applytobankset(bankset, ['partiallyCommitReservation', {_evaluate: reservation4use}, 100, ['cancel']]).then(reservationsetter);
  });
  it('Read accounts', function () {
    expect(applytobankset(bankset, ['readAccount'])).to.eventually.deep.equal(all(600));
  });
  it('Traverse storage', function () {
    return (applytobankset(bankset, ['traverseKVStorage', {pop:1, _value: itemprinter}, {}]));
  });
  it('Traverse log', function () {
    return (applytobankset(bankset, ['traverseLog', {pop:1, _value: itemprinter}, {}]));
  });
  it('Traverse reservations', function () {
    return (applytobankset(bankset, ['traverseReservations', {pop:1, _value: itemprinter}, {}]));
  });
  it('Traverse resets', function () {
    return (applytobankset(bankset, ['traverseResets', {pop:1, _value: itemprinter}, {}]));
  });
  createLevelDBQueryIt({
    instancename: 'Query001',
    leveldb: 'bankset',
    filter: {bankname: '001'},
    cb: filler001
  });
  createLevelDBQueryIt({
    instancename: 'QueryPeter',
    leveldb: 'bankset',
    filter: {bankname: '001', keys: {op: 'eq', field: null, value: 'peter'}}
  });
  createLevelDBQueryIt({
    instancename: 'QueryFilter',
    leveldb: 'bankset',
    filter: {
      values: {
        op: 'eq',
        field: 1,
        value: 100
      }
    },
    cb: console.log.bind(console, 'peter filter:')
  });
  createLevelDBQueryIt({
    instancename: 'Query12',
    leveldb: 'bankset',
    filter: {
      bankname: ['001', '002']
    },
    cb: console.log.bind(console, '001002 filter:')
  });
  createLevelDBQueryIt({
    instancename: 'QueryLogPeter',
    leveldb: 'bankset',
    queryMethodName: 'queryLog',
    filter: {
      bankname: ['001', '002'],
      values: {
        op: 'eq',
        field: 0,
        value: 'peter'
      }
    },
    cb: function (kva) {
      if (!(kva && kva.length && kva.length>1 && kva[1] && kva[1].length && kva[1][0] === 'peter')) {
        console.error('this is not good', kva);
        process.exit(1);
      }
    }
  });
  it('Write and expect Query001 to get it', function () {
    var ret001 = Query001.wait(), retpeter = QueryPeter.wait(), ret12 = Query12.wait();
    bankset.charge('001', 'peter', -100, ['test charge']);
    qlib.promise2console(ret001, 'ret001');
    qlib.promise2console(retpeter, 'retpeter');
    qlib.promise2console(ret12, 'ret12');
    return Promise.all([
      expect(ret001).to.eventually.deep.equal([['001','peter'], States001['peter']+100]),
      expect(retpeter).to.eventually.deep.equal([['001', 'peter'], States001['peter']+100]),
      expect(ret12).to.eventually.deep.equal([['001', 'peter'], States001['peter']+100])
    ]);
  });
});


