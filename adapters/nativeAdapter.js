var loki = require('lokijs')
var crypto = require('crypto')

var nosqlAdapter = function (path) {
    this.path = path || ""
}

nosqlAdapter.prototype.initDatabase = function (name) {
    var f = this;
    return new Promise(function (resolve, reject) {
        var dbp = new loki(f.path + "" + name, {
            autoload: true,
            autosave: false,
            autoloadCallback: function () {
                f.db = dbp;
                resolve(dbp);
            }
        });

    });

}

nosqlAdapter.prototype.addCollection = function (name) {
    var f = this;
    return new Promise(function (resolve, reject) {
        resolve(new nosqlDataSet(f.db.addCollection(name, {
            unique: ['oid'],
            clone: true
        })));
    });
}

nosqlAdapter.prototype.getCollection = function (name) {
    var f = this;
    return new Promise(function (resolve, reject) {
        var set = f.db.getCollection(name);
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

        f.db.saveDatabase(function () {
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
        var uid = crypto.randomBytes(6);//281 474 976 710 656 max. Enough?
        if (!data.oid)
            data.oid = uid.toString('hex')
        var newdata = f.raw().insert(data);
        try {
            resolve({
                data: newdata,
                operation: 'insert',
                status: 0, //no errors
            })
        } catch (e) {
            resolve({
                data: data,
                operation: 'insert',
                status: 'dberror',
                error: e
            })
        }
    });


}

nosqlDataSet.prototype.updateItem = function (data) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var newdata = f.raw().update(data);
        try {
            resolve({
                data: newdata,
                operation: 'update',
                status: 0, //no errors
            })
        } catch (e) {
            resolve({
                data: data,
                operation: 'update',
                status: 'dberror',
                error: e
            })
        }
    });

}

nosqlDataSet.prototype.deleteItem = function (id) {

    var data = this.raw().chain().findOne({oid: {$aeq: id}}).data();
    data.remove();

    return true;

}

nosqlDataSet.prototype.deleteItems = function (fields) {

    this.dataset.findAndRemove(fields);
    return true;

}

nosqlDataSet.prototype.getItem = function (id) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var data = f.raw().find({oid: {$aeq: id}});
        resolve(data[0])
    });


}

nosqlDataSet.prototype.findItem = function (fields, order) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var o = [], ch = f.raw().chain()
        if (order)
            for (var i in order) {
                ch = ch.simplesort(order[i].name, order[i].order == "DESC" ? true : false)
            }


        var data = ch.find(fields).limit(1).data();
        resolve(data[0] || {})
    });

}

nosqlDataSet.prototype.createMetaDataItem = function (item) {

    var f = this;
    return new Promise(function (resolve, reject) {
        delete item.meta
        delete item.$loki
        resolve(item)
    });

}

nosqlDataSet.prototype.findItems = function (fields, limit, order) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var rs = f.raw().chain().find(fields || {});
        if (limit) {
            if (limit instanceof Array && limit.length == 2) {
                rs = rs.limit(limit[1]);
                rs = rs.offset(limit[0]);
            } else if (limit instanceof Array && limit.length == 1) {
                rs = rs.limit(limit[1]);
            } else if (limit instanceof Number) {
                rs = rs.limit(limit);
            } else if (limit instanceof Object) {
                if (limit.limit)
                    rs = rs.limit(limit.limit);
                if (limit.offset)
                    rs = rs.offset(limit.offset);
            }
        }

        if (order) {
            var o = [];
            for (var i in order) {
                o.push([order[i].name, order[i].order == "DESC" ? "Z" : "A"])
            }

            rs = rs.order(o)
        }


        var data = rs.data()
        resolve(data)
    });

}

nosqlDataSet.prototype.count = function (fields) {

    var f = this;
    return new Promise(function (resolve, reject) {
        var cnt = f.raw().count(fields)
        resolve(cnt)
    });

}

module.exports = {
    db: nosqlAdapter,
    dataset: nosqlDataSet
}