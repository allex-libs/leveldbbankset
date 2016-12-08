var Path = require('path');

function createBankSet (execlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q;

  function BankSet (prophash) {
    if (!(prophash)) {
      throw new lib.Error('NO_PROPHASH', 'BankSet needs a property hash in its ctor');
    }
    if (!prophash.path) {
      throw new lib.JSONizingError('NO_PATH', 'Property hash for BankSet has to have a path');
    }
    this.path = prophash.path;
    this.bankctor = lib.isFunction(prophash.bankctor) ? prophash.bankctor : null;
    this.bankprophash = prophash.bankprophash || {};
    this.banks = new DIContainer();
  }

  BankSet.prototype.destroy = function () {
    if (this.banks) {
      this.banks.destroy();
    }
    this.banks = null;
    this.bankprophash = null;
    this.bankctor = null;
    this.path = null;
  };

  BankSet.prototype.setBankCtor = function (bankctor) {
    this.bankctor = bankctor;
  };

  BankSet.prototype.getOrCreateBank = function (bankname) {
    var ret = this.banks.get(bankname), sd, bs, ph;
    if (ret) {
      return q(ret);
    }
    if (!this.bankctor) {
      return q.reject(new lib.Error('NO_BANK_CONSTRUCTOR', 'BankSet needs a bank constructor'));
    }
    if (!this.banks.busy(bankname)) {
      sd = q.defer();
      bs = this.banks;
      ph = lib.extend({}, this.bankprophash, {
        path: Path.join(this.path, bankname)
      });
      ph.starteddefer = sd;
      new this.bankctor(ph);
      sd.promise.then(function (b) {
        bs.register(bankname, b);
        bs = null;
        bankname = null;
      },function (reason) {
        bs = null;
        username = null;
      });
    }
    ret = this.banks.waitFor(bankname);
    return ret;
  };

  function bankapplier (methodname, args, bank) {
    var method = bank[methodname], ret;
    if (!lib.isFunction(method)) {
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

  BankSet.addMethods = function (klass) {
    lib.inheritMethods(klass, BankSet,
      'setBankCtor',
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
      'traverseReservations'
    );
  };

  return BankSet;
}

module.exports = createBankSet;
