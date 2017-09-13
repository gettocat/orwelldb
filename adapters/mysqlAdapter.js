//this adapter is just for test only, if you need use mysql to link with blockchain - make own mysqlAdapter with full-implemented type mehanism
var orm = require("orm");
var crypto = require('crypto')

//also need privileges to database keystore
var types = {
    "posts": "post",
    "pem": "pem"
}

var nosqlAdapter = function (path, options) {
    this.path = path || ""
    this.options = options
}

nosqlAdapter.prototype.initDatabase = function (name) {
    var f = this;
    return new Promise(function (resolve, reject) {

        orm.connect("mysql://" + f.options.dbuser + ":" + f.options.dbpass + "@localhost/" + name, function (err, db) {
            if (err)
                reject(err);

            db.load(f.options.modelspath, function (err) {
                if (err)
                    reject(err);

                db.sync(function (err) {
                    if (err)
                        reject(err);

                    f.db = db;
                    resolve(db);

                })


            });


        });

    });

}

nosqlAdapter.prototype.addCollection = function (name) {
    var f = this;

    //in this db specific - you need define table schema first. so need link name->schema in code
    var type;
    if (name.indexOf("_settings") >= 0) {
        type = 'settings'//special type for dataset settings
    } else
        type = types[name];

    return new Promise(function (resolve, reject) {
        resolve(new nosqlDataSet(f.db.models[type]));
    });
}

nosqlAdapter.prototype.getCollection = function (name) {
    var f = this;

    var type;
    if (name.indexOf("_settings") >= 0) {
        type = 'settings'//special type for dataset settings
    } else
        type = types[name];

    return new Promise(function (resolve, reject) {
        var set = f.db.models[type];
        if (set == null)
            resolve(null)
        else
            resolve(new nosqlDataSet(set))
    });

}

nosqlAdapter.prototype.save = function () {
    //need before process exit
    var f = this;
    return new Promise(function (resolve, reject) {

        f.db.sync(function (err) {

            if (err)
                reject(err);

            resolve();

        });

    });
}


var nosqlDataSet = function (dbcollection) {
    this.collection = dbcollection;
}

nosqlDataSet.prototype.raw = function () {
    return this.collection;
}

nosqlDataSet.prototype.insertItem = function (data) {

    var f = this;
    return new Promise(function (resolve, reject) {

        var uid = crypto.randomBytes(6); //281 474 976 710 656 max. Enough?
        if (!data.oid)
            data.oid = uid.toString('hex')

        f.raw().create(data, function (err, results) {
            if (err)
                throw err;
            
            if (err)
                resolve({
                    data: data,
                    operation: 'insert',
                    status: 'dberror',
                    error: err
                })
            else
                resolve({
                    data: results,
                    operation: 'insert',
                    status: 0, //no errors
                })



        });

    });
}

nosqlDataSet.prototype.updateItem = function (data) {

    var f = this;
    return new Promise(function (resolve, reject) {

        f.raw().find({oid: data.oid}, function (err, res) {

            if (err)
                throw err;

            if (res[0]) {
                for (var i in data) {
                    res[0][i] = data[i];
                }

                res[0].save(function (err) {

                    if (err) {
                        resolve({
                            data: data,
                            operation: 'update',
                            status: 'dberror',
                            error: err
                        })
                    } else {
                        resolve({
                            data: data,
                            operation: 'update',
                            status: 0, //no errors
                        })
                    }


                });
            } else
                resolve({
                    data: data,
                    operation: 'update',
                    status: 'notFound',
                })

        });

    });
}

nosqlDataSet.prototype.deleteItem = function (id) {
    var f = this;
    return new Promise(function (resolve) {
        f.raw().find({oid: id}, function (err, res) {
            if (res[0])
                res[0].remove(function (err) {
                    if (err) {
                        resolve({
                            data: res[0],
                            operation: 'update',
                            status: 'dberror',
                            error: err
                        })
                    } else {
                        resolve({
                            data: res[0],
                            operation: 'update',
                            status: 0, //no errors
                        })
                    }
                });
        });
    })
}

nosqlDataSet.prototype.deleteItems = function (fields) {
    var f = this;
    return new Promise(function (resolve) {
        f.raw().find(fields).remove(function (err, res) {
            if (res[0])
                res[0].remove(function (err) {
                    resolve()
                });
        });
    })
}

nosqlDataSet.prototype.getItem = function (id) {

    var f = this;
    return new Promise(function (resolve, reject) {
        f.raw().find({oid: id}, function (err, res) {
            resolve(res[0]||{})
        });
    });
}

nosqlDataSet.prototype.findItem = function (fields, order) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var o = [];
        if (order) {
            for (var i in order) {
                o.push([order[i].name, order[i].order == "DESC" ? "Z" : "A"])
            }
        }

        f.raw().find(fields, {order: o}, function (err, res) {
            resolve(res[0]||{})
        });
    });
}

nosqlDataSet.prototype.createMetaDataItem = function (item) {

    var f = this;
    return new Promise(function (resolve, reject) {
        //delete item.meta
        //delete item.$loki
        var a = JSON.parse(JSON.stringify(item))
        resolve(a)
    });
}

nosqlDataSet.prototype.findItems = function (fields, limit, order) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var rs = f.raw();
        var l = [];
        if (limit) {
            if (limit instanceof Array && limit.length == 2) {
               l = limit;
            } else if (limit instanceof Array && limit.length == 1) {
                l = limit;
            } else if (limit instanceof Number) {
                rs = rs.limit(limit);
            } else if (limit instanceof Object) {
                if (limit.limit)
                    l[0] = limit.limit;
                if (limit.offset)
                    l[1] = limit.offset;
            }
        }

        var o = [];
        if (order) {
            for (var i in order) {
                o.push([order[i].name, order[i].order == "DESC" ? "Z" : "A"])
            }

            rs = rs.order(o)
        }

        rs.find(fields,{limit: l, order: o},function (err, data) {
            resolve(data)
        })
    });
}

nosqlDataSet.prototype.count = function (fields) {

    var f = this;
    return new Promise(function (resolve, reject) {
        f.count(fields, function (err, cnt) {
            resolve(cnt)
        })
    });
}

module.exports = {
    db: nosqlAdapter,
    dataset: nosqlDataSet
}