var nativeAdapter = require('../adapters/nativeAdapter')

var native = function (options, onloaded) {

    this.name = options.name;
    this.options = options;
    this.init(onloaded);

}

native.prototype.init = function (onloaded) {
    var f = this;
    if (typeof this.options.adapter == 'string') {

        try {
            var a = require('../adapters/' + this.options.adapter)
        } catch (e) {
            a = null
        }

        if (!a)
            throw new Error('cant find database adapter ' + this.options.adapter + " send object to use manual adapter or stay this field empty to use native adapter");

    }

    this.adapter = new (this.options.adapter || nativeAdapter).db(this.options.path, this.options.options);
    this.adapter.initDatabase(f.name)
            .then(function (db) {
                if (onloaded instanceof Function)
                    onloaded.apply(f, [])
            })

}


native.prototype.getCollection = function (name) {
    var f = this;
    return this.adapter.getCollection(name)
            .then(function (col) {

                if (col == null) {
                    return f.adapter.addCollection(name);
                } else
                    return new Promise(function (resolve) {
                        resolve(col)
                    })

            })
}


native.prototype.deleteItem = function (datasetname, id) {
    var f = this;
    return this.getCollection(datasetname)
            .then(function (collection) {

                return new Promise(function (resolve) {
                    resolve(collection.deleteItem(id))
                })

            })
            .then(function (args) {
                return f.save()
                        .then(function () {
                            return new Promise(function (resolve) {
                                resolve(args)
                            })
                        })
            })
}

native.prototype.insertItem = function (datasetname, data, unclear) {
    var _args, _collection, f = this
    return this.getCollection(datasetname)
            .then(function (collection) {
                _collection = collection
                return new Promise(function (resolve) {
                    collection.insertItem(data)
                            .then(function (newdata) {
                                resolve(newdata)
                            })
                })

            })
            .then(function (args) {
                _args = args;
                if (unclear)
                    return new Promise(function (resolve) {
                        resolve(args.data)
                    })
                else
                    return _collection.createMetaDataItem(args.data)
            })
            .then(function (item) {
                return new Promise(function (resolve) {

                    _args.data = item;
                    resolve(_args)

                })
            })
            .then(function (args) {
                return f.save()
                        .then(function () {
                            return new Promise(function (resolve) {
                                resolve(args)
                            })
                        })
            })

}

native.prototype.updateItem = function (datasetname, data, unclear) {
    var _args, _collection, f = this
    return this.getCollection(datasetname)
            .then(function (collection) {
                _collection = collection
                return new Promise(function (resolve) {
                    collection.updateItem(data)
                            .then(function (newdata) {
                                resolve(newdata)
                            })
                })

            })
            .then(function (args) {
                _args = args;
                if (unclear)
                    return new Promise(function (resolve) {
                        resolve(args.data)
                    })
                else
                    return _collection.createMetaDataItem(args.data)
            })
            .then(function (item) {
                return new Promise(function (resolve) {

                    _args.data = item;
                    resolve(_args)

                })
            })
            .then(function (args) {
                return f.save()
                        .then(function () {
                            return new Promise(function (resolve) {
                                resolve(args)
                            })
                        })
            })

}

native.prototype.deleteItems = function (datasetname, fields) {
    var f = this;
    return this.getCollection(datasetname)
            .then(function (collection) {

                return new Promise(function (resolve) {
                    resolve(collection.deleteItems(fields))
                })

            })
            .then(function (args) {
                return f.save()
                        .then(function () {
                            return new Promise(function (resolve) {
                                resolve(args)
                            })
                        })
            })

}

native.prototype.getItem = function (datasetname, id) {
    var f = this;
    return this.getCollection(datasetname)
            .then(function (collection) {

                return collection.getItem(id)

            })


}

native.prototype.clearItem = function (datasetname, data) {
    return this.getCollection(datasetname)
            .then(function (collection) {

                return collection.createMetaDataItem(data)

            })


}

native.prototype.findItem = function (datasetname, fields, order) {
    return this.getCollection(datasetname)
            .then(function (collection) {

                return collection.findItem(fields, order)

            })
}

native.prototype.findItems = function (datasetname, fields, limit, order) {
    return this.getCollection(datasetname)
            .then(function (collection) {

                return collection.findItems(fields, limit, order)

            })
}

native.prototype.count = function (datasetname, fields) {
    return this.getCollection(datasetname)
            .then(function (collection) {

                return collection.count(fields)

            })
}

native.prototype.save = function () {
    //need before process exit
    return this.adapter.save();
}


module.exports = native