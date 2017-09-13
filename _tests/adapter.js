var assert = require('assert');
var orwell = require('../orwelldb')
var mysqlAdapter = require('../adapters/mysqlAdapter')
var datascript = orwell.datascript
var $ = orwell.$;
var fs = require('fs')
var pem = fs.readFileSync('./_tests/pem').toString();

describe('orwelldb', function () {

    it('add Pem', function (done) {

        $({
            adapter: mysqlAdapter,
            name: 'orwelldb2',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb",
            keystore: {//for example can use another user to keystore, or another adapter
                adapter: mysqlAdapter,
                name: 'keystore',
                options: {
                    dbuser: 'orwelldb',
                    dbpass: '',
                    modelspath: '../_tests/models/keystore'
                }
            },
            options: {
                dbuser: 'orwelldb',
                dbpass: '',
                modelspath: '../_tests/models/index'
            }
        })
                .then(function (db) {
                    return db.addPem(pem)
                })
                .then(function (args) {
                    assert(args.data.oid && args.data.pem)
                    done();
                })
                .catch(function (err) {
                    done(err)
                })

    });

});

//check mysql adapter. One interface - many databases
describe('orwelldb', function () {

    it('mysql adapter no encryption', function (done) {


        orwell.export({
            adapter: mysqlAdapter,
            name: 'orwelldb',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb",
            keystore: {//for example can use another user to keystore, or another adapter
                adapter: mysqlAdapter,
                name: 'keystore',
                options: {
                    dbuser: 'orwelldb',
                    dbpass: '',
                    modelspath: '../_tests/models/index'
                }
            },
            options: {
                dbuser: 'orwelldb',
                dbpass: '',
                modelspath: '../_tests/models/index'
            }
        }, function (db) {

            return db.create('posts', {privileges: [], writeScript: ''})
                    .then(function (res) {
                        return db.write("posts", {oid: '7f5aea2ff97f', title: 'test1', 'text': 'what?!'})
                    })
        })
                .then(function (hex) {

                    var l = datascript.readArray(hex)
                    assert.equal(l.length, 2);
                    var arr = [];
                    for (var i in l) {
                        var res = new datascript(l[i]);
                        arr.push(res.toJSON())
                    }

                    assert.equal(arr[0].dataset, 'posts')
                    assert.equal(arr[0].operator, 'create')
                    assert.equal(arr[0].canRead, true)
                    assert.equal(arr[0].success, true)


                    assert.equal(arr[1].dataset, 'posts')
                    assert.equal(arr[1].operator, 'write')
                    assert.equal(arr[1].content.oid, '7f5aea2ff97f')
                    assert.equal(arr[1].canRead, true)
                    assert.equal(arr[1].success, true)

                    done();
                })
                .catch(function (e) {
                    done(e)
                })
    });


});


describe('orwelldb', function () {

    it('mysql adapter with rsa', function (done) {
        var opts = {
            adapter: mysqlAdapter,
            name: 'orwelldb2', //orwelldb2 with encryption, orwelldb without
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb",
            keystore: {//for example can use another user to keystore, or another adapter
                adapter: mysqlAdapter,
                name: 'keystore',
                options: {
                    dbuser: 'orwelldb',
                    dbpass: '',
                    modelspath: '../_tests/models/keystore'
                }
            },
            options: {
                dbuser: 'orwelldb',
                dbpass: '',
                modelspath: '../_tests/models/index'
            }
        }

        orwell.export(opts, function (db) {

            return db.create('posts', {privileges: [], writeScript: ''})
                    .then(function (res) {
                        return db.write("posts", {oid: '7f5aea2ff97f', title: 'test1', 'text': 'what?!'})
                    })
        })
                .then(function (hex) {

                    var l = datascript.readArray(hex)
                    assert.equal(l.length, 2);
                    var arr = [];
                    for (var i in l) {
                        var res = new datascript(l[i]);
                        arr.push(res.toJSON())
                    }

                    assert.equal(arr[0].dataset, 'posts')
                    assert.equal(arr[0].operator, 'create')
                    assert.equal(arr[0].canRead, false)
                    assert.equal(arr[0].success, true)


                    assert.equal(arr[1].dataset, 'posts')
                    assert.equal(arr[1].operator, 'write')
                    assert.equal(arr[1].content, null)
                    assert.equal(arr[1].canRead, false)
                    assert.equal(arr[1].success, true)

                    //but then we read with keystore:
                    orwell.import(opts, hex)
                            .then(function (results) {
                                assert.equal(2, results.length)

                                assert.equal(results[0].scenario.dataset, 'posts')
                                assert.equal(results[0].scenario.operation, 'create')
                                assert.equal(results[0].data.writeScript, '5560')
                                assert.equal(results[0].data.owner_key, '047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb')
                                assert.equal(results[0].status, 0)//ok

                                assert.equal(results[1].scenario.dataset, 'posts')
                                assert.equal(results[1].data.oid, '7f5aea2ff97f')
                                assert.equal(results[1].status, 0)//ok
                                done();
                            })
                })
                .catch(function (e) {
                    done(e)
                })
    });


});