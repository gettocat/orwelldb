var util = require('util');
var base = require('./native')
var bitPony = require('bitpony')

function protocol(options, onloaded) {
    this.hash = bitPony.tool.sha256(new Buffer(options.public_key || "")).toString('hex')
    this.pubkey = options.public_key;
    this.options = options
    this.onInit = onloaded;
}

util.inherits(protocol, base);

protocol.prototype.createDataSet = function (datasetname, data) {
    var f = this, scenario = {
        operation: 'create',
        dataset: datasetname,
        content: {
            owner_key: data.owner_key || this.pubkey,
            writeScript: ((""+data.writeScript) == '5560' || !data.writeScript) ? data.writeScript : "",
            privileges: data.privileges || []
        }
    };

    return this.getCollection(datasetname)
            .then(function (collection) {

                return f.setSettings(datasetname, data)

            })
            .then(function (args) {

                return new Promise(function (resolve) {
                    if (args.status == 0 || args.status == 'ok')
                        args.scenario = scenario;
                    else
                        args.scenario = false;
                    resolve(args)
                })

            })
}

protocol.prototype.writeData = function (datasetname, data) {
    var f = this, _args = [], _dataset, scenario = {
        operation: 'write',
        dataset: datasetname,
        content: data
    }, _canWrite = false
    return this.getSettings(datasetname)
            .then(function (settings) {
                return new Promise(function (r) {
                    var script = settings.writeScript;
                    //now only two rules maked for write script:
                    //5560 mean check in privileges array and empty value, mean: read can every pusher
                    if (script == "5560") {//0x55 0x60 mean PUSHDATA_PRIVKEYWRITER OP_CHECKDBPRIVILEGES
                        var privileges = settings.privileges instanceof Array ? settings.privileges : [];

                        if (privileges.indexOf(f.pubkey) >= 0 || settings.owner_key == f.pubkey)
                            r(true);
                        else
                            r(false)
                    } else {
                        r(true);
                    }



                });
            })
            .then(function (canWrite) {
                _canWrite = canWrite
                return f.getItem(datasetname, data.oid);
            })
            .then(function (item) {
                if (_canWrite) {
                    var promise;

                    if (item && data.oid && item.oid == data.oid) {
                        for (var i in data) {
                            if (i == 'meta' || i == '$loki')
                                continue;
                            item[i] = data[i];
                        }

                        promise = f.updateItem(datasetname, item);
                    } else {
                        promise = f.insertItem(datasetname, data);
                    }

                    return promise;
                } else {
                    return new Promise(function (resolve) {
                        resolve({
                            operation: 'write',
                            data: data,
                            scenario: false,
                            status: 'cantWrite',
                            error: 'dataset settings do not accept writing for you key',
                        })
                    })
                }

            })
            .then(function (args) {
                _args = args;
                return f.save();

            })
            .then(function () {
                if (_args.status == 0 || _args.status == 'ok')
                    _args.scenario = scenario;
                else
                    _args.scenario = false;
                return new Promise(function (resolve) {
                    resolve(_args)
                })
            })

}

protocol.prototype.getSettings = function (datasetname) {
    var coll

    return this.getCollection(datasetname + "_settings")
            .then(function (collection) {
                coll = collection;
                return collection.getItem(1);

            })
            .then(function (item) {

                if (!item) {
                    var settings = {oid: 1, writeScript: '5560', owner_key: '', privileges: []};
                    item = coll.insertItem(settings);
                }

                return new Promise(function (resolve) {
                    resolve(item)
                })

            })

}

protocol.prototype.setSettings = function (datasetname, data) {
    var coll, _args = [], _settings, _act, scenario = {
        operation: 'settings',
        dataset: datasetname,
        content: {
            writeScript: data.writeScript,
            privileges: data.privileges
        }
    }, f = this;

    return this.getCollection(datasetname + "_settings")
            .then(function (collection) {
                coll = collection;
                return collection.getItem(1);

            })
            .then(function (item) {
                var act = 'settings', args = []
                if (!item) {
                    var settings = {oid: 1, writeScript: ((""+data.writeScript) == '5560' || !data.writeScript) ? data.writeScript : "", owner_key: data.owner_key || f.pubkey, privileges: data.privileges || []};
                    //item = coll.insertItem(settings);
                    args = {
                        operation: 'insert',
                        data: settings,
                        scenario: false,
                        status: 0,
                    }
                } else {
                    item.writeScript = ((""+data.writeScript) == '5560' || !data.writeScript) ? data.writeScript : "";
                    item.privileges = data.privileges || [];

                    if (!item.owner_key && data.owner_key)//only if not exist yet, cant be updated or changed
                        item.owner_key = data.owner_key;

                    args = {
                        operation: 'update',
                        data: item,
                        scenario: false,
                        status: 0,
                    }
                    //item = coll.updateItem(item)
                }

                return new Promise(function (resolve) {
                    resolve(args)
                })

            })
            .then(function (args) {
                _args = args
                return new Promise(function (r) {
                    if (!_args.data.owner_key)
                        r(0)
                    else if (_args.data.owner_key == f.pubkey || _args.data.owner_key == f.hash)
                        r(1);
                    else
                        r(-1);
                });
            })
            .then(function (canChange) {

                if (canChange == 0) {
                    //add owner in script
                    //init database at least
                    scenario.content.owner_key = _args.data.owner_key = f.pubkey;
                    if (_args.operation == 'insert')
                        return coll.insertItem(_args.data)
                    else {
                        return coll.updateItem(_args.data);
                    }
                }

                if (canChange == -1)
                    return new Promise(function (resolve) {
                        _args.status = 'cantChange';
                        _args.error = 'cant change settings for this dataset';
                        resolve(_args)
                    })

                if (canChange == 1)
                    if (_args.operation == 'insert')
                        return coll.insertItem(_args.data)
                    else {
                        return coll.updateItem(_args.data)
                    }

            })
            .then(function (args) {
                return f.save();
            })
            .then(function () {
                return new Promise(function (resolve) {
                    if (_args.status == 0 || _args.status == 'ok')
                        _args.scenario = scenario;
                    else
                        _args.scenario = false;
                    resolve(_args)
                })
            })

}


var dbcache = {};
protocol.createDB = function (name, options) {

    return new Promise(function (resolve, reject) {
        if (dbcache[name])
            resolve(dbcache[name])
        else {
            if (!options)
                options = {};

            options.name = name;
            new base(options, function () {
                dbcache[name] = this;
                resolve(this)
            });
        }
    })

}

module.exports = protocol