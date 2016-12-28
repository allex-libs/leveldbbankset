function createBankSetHook (execlib, leveldblib) {

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    Hook = leveldblib.Hook;

  function SubHook (prophash) {
    this.bankname = prophash.bankname;
    this.cb = prophash.cb;
    this.bankDefer = q.defer();
    prophash.bankset.getOrCreateBank(prophash.bankname).then(
      this.onBank.bind(this)
    );
  }
  SubHook.prototype.destroy = function () {
    if (this.bankDefer && this.bankDefer.promise && this.bankDefer.promise.value) {
      //console.log('got hook to destroy', this.bankDefer.promise.value);
      this.bankDefer.promise.value.destroy();
    }
    this.bankDefer = null;
    this.cb = null;
    this.bankname = null;
  };
  SubHook.prototype.onBank = function (bank) {
    //console.log('onBank');
    this.bankDefer.resolve(new Hook({
      leveldb: bank.kvstorage,
      cb: this.triggerCB.bind(this)
    }));
  };
  SubHook.prototype.hook = function (hookobj) {
    return this.bankDefer.promise.then(
      function (hook) {
        var ret = hook.hook(hookobj);
        keys = null;
        return ret;
      }
    );
  };
  SubHook.prototype.unhook = function (dbkeys) {
    return this.bankDefer.promise.then(
      function (hook) {
        var ret = hook.unhook(dbkeys);
        dbkeys = null;
        return ret;
      }
    );
  };
  SubHook.prototype.triggerCB = function (key, value) {
    if (this.cb) {
      this.cb([this.bankname, key], value);
    }
  };
  
  function SuperHook (prophash) {
    this.cb = prophash.cb;
    this.hookobjs = [];
    this.hooks = new lib.DIContainer();
    prophash.bankset.banks.traverse(this.onBank.bind(this));
    this.listener = prophash.bankset.newBank.attach(this.onBank.bind(this));
  }
  SuperHook.prototype.destroy = function () {
    if (this.listener) {
      this.listener.destroy();
    }
    this.listener = null;
    if (this.hooks) {
      this.hooks.destroyDestroyables();
      this.hooks.destroy();
    }
    this.hooks = null;
    this.hookobjs = null;
    this.cb = null;
  };
  SuperHook.prototype.hook = function (hookobj) {
    var ps = [], _ps = ps, ex = lib.extend;
    this.hookobjs.push(hookobj);
    this.hooks.traverse(function (hook) {
      _ps.push(hook.hook(ex({}, hookobj)));
    });
    _ps = null;
    hookobj = null;
    ex = null;
    return q.all(ps);
  };
  SuperHook.prototype.unhook = function (dbkeys) {
    var ps = [], _ps = ps;
    this.clearHookObjFrom(dbkeys);
    this.hooks.traverse(function (h) {
      _ps.push(h.unhook(dbkeys));
    });
    _ps = null;
    dbkeys = null;
    return q.all(ps);
  };
  SuperHook.prototype.onBank = function (bank, bankname) {
    var h = new Hook({
      leveldb: bank.kvstorage,
      cb: this.triggerCB.bind(this, bankname)
    });
    this.hooks.register(bankname, h);
    this.hookobjs.forEach(function (ho) {
      h.hook(ho);
    });
    h = null;
  };
  SuperHook.prototype.triggerCB = function (bankname, key, value) {
    if (this.cb) {
      this.cb([bankname, key], value);
    }
  };


  function BankSetHook (prophash) {
    this.bankset = prophash.leveldb;
    this.cb = prophash.cb;
    this.subhooks = new lib.DIContainer();
  }
  BankSetHook.prototype.destroy = function () {
    if (this.subhooks) {
      this.subhooks.destroyDestroyables();
      this.subhooks.destroy();
    }
    this.subhooks = null;
    this.cb = null;
    this.bankset = null;
  };
  BankSetHook.prototype.getOrCreateSubHook = function (name) {
    var sh = this.subhooks.get(name), ret;
    if (sh) {
      return q(sh);
    }
    if (this.subhooks.busy(name)) {
      return this.subhooks.waitFor(name);
    }
    ret = this.subhooks.waitFor(name);
    if (name === Hook.ALL_KEYS) {
      this.subhooks.register(name, new SuperHook({
        bankset: this.bankset,
        cb: this.cb
      }));
    } else {
      this.subhooks.register(name, new SubHook({
        bankname: name,
        bankset: this.bankset,
        cb: this.cb
      }));
    }
    return ret;
  };
  BankSetHook.prototype.hook = function (hookobj, defer) {
    var keys = hookobj.keys, bankname, bankkeys, bankhookobj;
    defer = defer || q.defer();
    if (!lib.isArray(keys)) {
      defer.reject(new lib.Error('KEYS_NOT_AN_ARRAY', 'hookobj provided to hook has to have `keys` property'));
    } else if (keys.length != 2) {
      defer.reject(new lib.Error('KEYS_NOT_A_TWO_ELEMENT_ARRAY', 'keys in the hookobj provided to hook have to have 2 elements'));
    } else {
      bankname = keys[0];
      bankkeys = [keys[1]];
      bankhookobj = lib.extend({}, hookobj, {keys: bankkeys});
      qlib.promise2defer(this.getOrCreateSubHook(bankname).then(
        function(hook) {
          //console.log('hooking with', bankhookobj);
          var ret = hook.hook(bankhookobj);
          bankhookobj = null;
          return ret;
        }
      ), defer);
    }
    return defer.promise;
  };
  BankSetHook.prototype.unhook = function (dbkeys, defer) {
    var bankname, bankdbkeys;
    defer = defer || q.defer();
    if (!lib.isArray(dbkeys)) {
      defer.reject(new lib.Error('KEYS_NOT_AN_ARRAY', 'dbkeys provided to `unhook` have to be an Array'));
    } else if (dbkeys.length != 2) {
      defer.reject(new lib.Error('KEYS_NOT_A_TWO_ELEMENT_ARRAY', 'dbkeys provided to `unhook` have to have 2 elements'));
    } else {
      bankname = dbkeys[0];
      bankdbkeys = dbkeys[1];
      qlib.promise2defer(this.getOrCreateSubHook(bankname).then(
        function (hook) {
          var ret = hook.unhook(bankdbkeys);
          bankdbkeys = null;
          return ret;
        }
      ), defer);
    }
    return defer.promise;
  };

  BankSetHook.addMethods = function (klass) {
    lib.inheritMethods(klass, BankSetHook,
      'hook',
      'unhook',
      'getOrCreateSubHook'
    );
  };

  return BankSetHook;
}

module.exports = createBankSetHook;
