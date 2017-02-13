var Path = require('path');

function createBankSet (execlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    dirScanner = require('./dirscannercreator')(execlib);


  function BankSet (prophash) {
    var sd, subbanks;
    if (!(prophash)) {
      throw new lib.Error('NO_PROPHASH', 'BankSet needs a property hash in its ctor');
    }
    if (!prophash.path) {
      throw new lib.JSONizingError('NO_PATH', 'Property hash for BankSet has to have a path');
    }
    this.path = prophash.path;
    this.bankctor = null; //lib.isFunction(prophash.bankctor) ? prophash.bankctor : null;
    this.bankprophash = prophash.bankprophash || {};
    this.banks = new lib.DIContainer();
    this.newBank = new lib.HookCollection();
    this.startDefer = prophash.starteddefer;
    if (lib.isFunction(prophash.bankctor)) {
      this.setBankCtor(prophash.bankctor);
    }
  }

  BankSet.prototype.destroy = function () {
    if (this.startDefer) {
      this.startDefer.reject(new lib.Error('DYING', 'BankSet is destroying'));
    }
    this.startDefer = null;
    if (this.newBank) {
      this.newBank.destroy();
    }
    this.newBank = null;
    if (this.banks) {
      this.banks.destroy();
    }
    this.banks = null;
    this.bankprophash = null;
    this.bankctor = null;
    this.path = null;
  };

  BankSet.prototype.setBankCtor = function (bankctor) {
    var subbanks = [], sd = this.startDefer;
    this.bankctor = bankctor;
    this.startDefer = null;
    if (sd) {
      dirScanner(this.path).then(
        this.onDirScanned.bind(this, sd, subbanks),
        sd ? sd.reject.bind(sd) : null,
        subbanks.push.bind(subbanks)
      );
    }
  };

  BankSet.prototype.onDirScanned = function (sd, subbanks) {
    var p;
    if (!lib.isArray(subbanks)) {
      if (sd) {
        sd.resolve(this);
      }
    } else {
      p = q.all(subbanks.map(this.getOrCreateBank.bind(this)));
      if (sd) {
        p.then(
          sd.resolve.bind(sd, this),
          sd.reject.bind(sd)
        );
      }
    }
  };

  BankSet.prototype.getOrCreateBank = function (bankname) {
    var ret = this.banks.get(bankname), sd, bs, nb, ph, bn;
    if (bankname === '***') {
      console.trace();
      console.log('bankname', bankname);
      process.exit(1);
      return;
    }
    if (ret) {
      return q(ret);
    }
    if (!this.bankctor) {
      return q.reject(new lib.Error('NO_BANK_CONSTRUCTOR', 'BankSet needs a bank constructor'));
    }
    if (!this.banks.busy(bankname)) {
      sd = q.defer();
      bs = this.banks;
      nb = this.newBank;
      ph = lib.extend({}, this.bankprophash, {
        path: Path.join(this.path, bankname)
      });
      ph.starteddefer = sd;
      bn = bankname;
      new this.bankctor(ph);
      sd.promise.then(function (b) {
        bs.register(bn, b);
        bs = null;
        nb.fire(b, bn);
        nb = null;
        bn = null;
      },function (reason) {
        bs = null;
        nb = null;
        bn = null;
      });
    }
    ret = this.banks.waitFor(bankname);
    return ret;
  };

  function bankapplier (methodname, args, bank) {
    var method = bank[methodname], ret;
    if (!lib.isFunction(method)) {
      console.log(methodname+' is not a method of Bank');
      return q.reject(new lib.Error('INVALID_METHODNAME', methodname+' is not a method of Bank'));
    }
    ret = method.apply(bank, args);
    methodname = null;
    args = null;
    return ret;
  }

  function bankelementapplier (elementname, methodname, args, bank) {
    var bankelement, method, ret;
    if (!(elementname in bank)) {
      return q.reject(new lib.Error('INVALID_ELEMENTNAME', elementname+' does not exist in Bank'));
    }
    bankelement = bank[elementname];
    method = bankelement[methodname];
    if (!lib.isFunction(method)) {
      return q.reject(new lib.Error('INVALID_METHODNAME', methodname+' is not a method of Bank element '+elementname));
    }
    ret = method.apply(bankelement, args);
    elementname = null;
    methodname = null;
    args = null;
    return ret;
  }

  BankSet.prototype.readAccount = function (bankname, username) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'readAccount', [username])
    );
  };

  BankSet.prototype.readAccountWDefault = function (bankname, username, dflt) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'readAccountWDefault', [username, dflt])
    );
  };

  BankSet.prototype.readAccountSafe = function (bankname, username, dflt) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'readAccountSafe', [username, dflt])
    );
  };

  BankSet.prototype.closeAccount = function (bankname, username) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'closeAccount', [username])
    );
  };

  BankSet.prototype.charge = function (bankname, username, amount, referencearry) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'charge', [username, amount, referencearry])
    );
  };

  BankSet.prototype.reserve = function (bankname, username, amount, referencearry) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'reserve', [username, amount, referencearry])
    );
  };

  BankSet.prototype.commitReservation = function (bankname, reservationid, controlcode, referencearry) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'commitReservation', [reservationid, controlcode, referencearry])
    );
  };

  BankSet.prototype.partiallyCommitReservation = function (bankname, reservationid, controlcode, commitamount, referencearry) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'partiallyCommitReservation', [reservationid, controlcode, commitamount, referencearry])
    );
  };

  BankSet.prototype.cancelReservation = function (bankname, reservationid, controlcode, referencearry) {
    return this.getOrCreateBank(bankname).then(
      bankapplier.bind(null, 'cancelReservation', [reservationid, controlcode, referencearry])
    );
  };

  BankSet.prototype.traverseKVStorage = function (bankname, cb, options) {
    return this.getOrCreateBank(bankname).then(
      bankelementapplier.bind(null, 'kvstorage', 'traverse', [cb, options])
    );
  };

  BankSet.prototype.traverseLog = function (bankname, cb, options) {
    return this.getOrCreateBank(bankname).then(
      bankelementapplier.bind(null, 'log', 'traverse', [cb, options])
    );
  };

  BankSet.prototype.traverseReservations = function (bankname, cb, options) {
    return this.getOrCreateBank(bankname).then(
      bankelementapplier.bind(null, 'reservations', 'traverse', [cb, options])
    );
  };

  BankSet.prototype.traverseResets = function (bankname, cb, options) {
    return this.getOrCreateBank(bankname).then(
      bankelementapplier.bind(null, 'resets', 'traverse', [cb, options])
    );
  };

  require('./queryextensioncreator')(execlib, BankSet, bankapplier);

  BankSet.addMethods = function (klass) {
    lib.inheritMethods(klass, BankSet,
      'setBankCtor',
      'onDirScanned',
      'getOrCreateBank',
      'readAccount',
      'readAccountWDefault',
      'readAccountSafe',
      'closeAccount',
      'charge',
      'reserve',
      'commitReservation',
      'partiallyCommitReservation',
      'cancelReservation',
      'traverseKVStorage',
      'traverseLog',
      'traverseReservations',
      'traverseResets',
      'query',
      'queryLog'
    );
  };

  return BankSet;
}

module.exports = createBankSet;
