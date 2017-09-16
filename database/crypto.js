var protocol = require('./protocol')
var base = require('./native')
var $db = protocol.createDB;
var datascript = require('../datascript/index')
var transactionManager = require('./transaction')
var util = require('util');

var crypto = function (options, onloaded) {
    this.name = options.name;
    this.options = options;
    this.onInit = onloaded;

    if (!this.options.keystore) {
        this.options.keystore = {name: "keystore", path: this.options.path};
    }

    if (options.name == 'keystore')
        throw new Error('keystore database contains all your private keys, you cant send this database to blockchain');

    var f = this
    this.initKeyStore()
            .then(function () {
                //super class toggled when keystore loaded
                protocol.apply(f, [options, onloaded]);
                f.init(onloaded)
            })
            .catch(function (e) {
                console.log(e)
            })


}

util.inherits(crypto, protocol);

crypto.prototype.keyStoreAccess = function() {
    return $db(this.options.keystore.name || "keystore", this.options.keystore);
}

crypto.prototype.initKeyStore = function () {

    return this.keyStoreAccess()//its local database
            .then(function (dbp) {
                return dbp.getCollection('pem')
            })

}

crypto.prototype.getPem = function (datasetname) {
    var dname = this.name, _dataset
    return this.keyStoreAccess()//get key for db/dataset, if not exist - try search db key only
            .then(function (dbp) {
                return dbp.getCollection('pem')
            })
            .then(function (dataset) {
                _dataset = dataset;
                return dataset.findItem({dbname: dname, dataset: datasetname})
            })
            .then(function (item) {
                //todo: orwelldb/pem/behaviour for many pem to one database
                if (!item.pem)
                    return _dataset.findItem({dbname: dname})
                else
                    return new Promise(function (resolve) {
                        resolve(item || {})
                    })
            })
}

crypto.prototype.addPem = function (pem, datasetname, algorithm) {

    var f = this
    return this.getPem(datasetname)
            .then(function (item) {
                if (!item || !item.pem) {
                    var obj = {dbname: f.name, pem: pem, algorithm: algorithm || 'rsa'};
                    if (datasetname)
                        obj.dataset = datasetname;
                    return f.keyStoreAccess()
                            .then(function (db) {
                                return db.insertItem('pem', obj)
                            })
                } else
                    return {
                        operation: 'none',
                        data: item
                    }
            })

}

crypto.prototype.execCommand = function (datasetname, command, data) {
    var f = this;
    return f[command](datasetname, data)
            .then(function (args) {
                var scenario = args.scenario, newdata = args.data, type = args.operation, status = args.status;

                if (scenario) {

                    return f.getPem(datasetname)
                            .then(function (item) {
                                return new Promise(function (resolve) {
                                    var pem;
                                    if (item.pem) {//encrypt
                                        scenario.algorithm = item.algorithm || 'rsa';
                                        pem = item.pem
                                    }

                                    var dscript = new datascript(scenario, pem)
                                    var hex = dscript.toHEX();
                                    transactionManager.add(hex);
                                    resolve(args)
                                })
                            })

                } else
                    return new Promise(function (resolve) {
                        resolve(args)
                    })

            })
            .catch(function (e) {
                console.log(e)
            })
}

crypto.prototype.create = function (datasetname, data) {
    return this.execCommand(datasetname, 'createDataSet', data)
}

crypto.prototype.settings = function (datasetname, data) {
    return this.execCommand(datasetname, 'setSettings', data)
}

crypto.prototype.write = function (datasetname, data) {
    return this.execCommand(datasetname, 'writeData', data)
}

var dbcache = {};
crypto.createDB = function (options) {

    return new Promise(function (resolve, reject) {
        if (dbcache[options.name])
            resolve(dbcache[options.name])
        else {
            if (!options)
                options = {};

            new crypto(options, function () {
                dbcache[options.name] = this;
                resolve(this)
            });
        }
    })

}

module.exports = crypto