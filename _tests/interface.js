var assert = require('assert');
var orwell = require('../orwelldb')
var datascript = orwell.datascript
var $ = orwell.$;
var fs = require('fs')
var pem = fs.readFileSync('./_tests/pem').toString();

describe('orwelldb', function () {

    it('add Pem', function (done) {

        $({
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        })
                .then(function (db) {
                    return db.addPem(pem)
                })
                .then(function (args) {
                    assert(args.data.oid && args.data.pem)
                    done();
                })

    });

    it('remove Pem', function (done) {
        var id, _ks;
        $({
            name: 'test1',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        })
                .then(function (db) {
                    return db.addPem(pem)
                })
                .then(function (args) {
                    id = args.data.oid;
                    assert(args.data.oid && args.data.pem)

                    return $({name: 'test1', public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"})

                })
                .then(function (db) {
                    return db.keyStoreAccess()
                })
                .then(function (keystore) {
                    _ks = keystore;
                    return keystore.deleteItem('pem', id)
                })
                .then(function (res) {

                    assert.equal(res.data.oid, id);
                    return new Promise(function (resolve) {
                        resolve()
                    })
                })
                .then(function () {
                    return _ks.getItem('pem', id);
                })
                .then(function (item) {

                    assert.equal(item.oid, undefined);
                    done();
                })

    });


});


describe('datascriptArray test', function () {

    it('read/write', function () {


        var hex1 = new datascript({
            operation: 'create',
            dataset: 'posts',
            content: {privileges: [], writeScript: "", owner_key: '047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb'}
        }).toHEX();

        var hex2 = new datascript({
            operation: 'write',
            dataset: 'posts',
            content: {oid: 'c5e5b7f54d2f', test: 6436, act: 3}
        }).toHEX();

        var hex3 = new datascript({
            operation: 'write',
            dataset: 'posts',
            content: {oid: '34a858ec44ab', test: 12125, act: 4}
        }).toHEX()

        var hex = datascript.writeArray([
            hex1,
            hex2,
            hex3
        ]);

        var arr = datascript.readArray(hex)
        assert.equal(arr[0], hex1)
        assert.equal(arr[1], hex2)
        assert.equal(arr[2], hex3)
        assert.equal(new Buffer(hex, 'hex')[0], 0xef)

    })

})


describe('orwelldb', function () {

    it('import without encryption', function (done) {

        orwell.import({//create db community, add collection, update settings and import 1 entry.
            name: 'community1',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        },
                'ef023e1905706f73747336543401f0f000873b5bebf40003f1096f776e65725f6b657900f20b7772697465536372697074fdb815f30a70726976696c6567657300412005706f73747339543701f0f000b5d523d2f40003f1036f69640c376635616561326666393766f1057469746c65057465737431f1047465787406776861743f21'
                )
                .then(function (results) {
                    assert.equal(results.length, 2)

                    assert.equal(results[0].status, 0)//status
                    assert.equal(results[0].data.oid, 1)//object
                    assert.equal(results[0].operation, 'update')//operation

                    assert.equal(results[1].status, 0)
                    assert.equal(results[1].data.oid, '7f5aea2ff97f')//object
                    assert(results[1].operation == 'update' || results[1].operation == 'insert')//operation
                    done();

                })
                .catch(function (e) {
                    done(e)
                })

    });


    it('export without encryption', function (done) {

        orwell.export({
            name: 'community1',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
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


describe('orwelldb encryption', function () {


    it('import', function (done) {

        orwell.import({//create db community, add collection, update settings and import 1 entry.
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        },
                'ef02fd34011905706f737473fd2a0153fd00019b76ff3429cc75249c8d0e1c3b96b62f143ad7f50cacb135513d89adbbd76aeb7ed3d54a035017a1a9d7ba5ef3f68bd29dfc241aa452b48a97232a4cc8bf80cd86fbb26078d1512eed5b40f520c7bc2f8f32abfe936f062255e32458a0eb747771ddcc7d43938d377ebb1e0c2c000b154fa9de0c00a80535c91c04dc0898d342b1006dbaf97af0eb941cad4e4ca1189c7e6c84be366ea085ca47ee6ff5a298d21b0d897de426c46b59d23fe5a5f29500e5c7557ce2cfe8d6ea6a694614928132ea68b095c99a95a274df928ee3100319db3e8b018bb85f3ba8245f96b9fc48586cbe14cbd6238656d468e6570d7202b0f425e6432b6e3b7accacdf8ebd58ba5856015759585e929b496e255e3e8ec6f826523292ddb35ec05e90163559e0819c6ffc4d228787fd34012005706f737473fd2a0153fd000146254e9c7d0b93130f69cc2d2c29d367ae4b8db7a9188bd2d2127d2fa846cf6e084515d1206c23358d40826e0133b8be15de8186f586e4fe6fffb54ca6e746c8f9da91aa1c7320c2dc1f88fcd276fa644a4daafdd37a9dd178a1953281e7dfe4f795da750490a9eb5d12bcc65508382c6d872428ac11b300e5e639605b754f0a54c8142c2255dcefcac2ccade40866e0f58c2567bf8303932270c9126f5da8773722482e2bebb00de1224a60fb10aa12059a96c49ccc2143f8ef8ddd526f35c3019a352c7c3b636fd8c8574e6b532151ace3117512b27959658cee9b3ab747a360d42d931c91bba8d98eff8f7f45fd0737efbec4ae586028ad6cd890a74f3c255601575958bf5d04e52da1ba417707e6c0dfd44e3cee32a0992825cb8a62d48321eb8ac44987'
                )
                .then(function (results) {
                    console.log(results);
                    assert.equal(results.length, 2)

                    assert.equal(results[0].status, 0)//status
                    assert.equal(results[0].data.oid, 1)//object
                    assert.equal(results[0].operation, 'update')//operation

                    assert.equal(results[1].status, 0)
                    assert.equal(results[1].data.oid, '7f5aea2ff97f')//object
                    assert(results[1].operation == 'update' || results[1].operation == 'insert')//operation
                    done();

                })
                .catch(function (e) {
                    done(e)
                })

    });

    it('import no key - can not read data, not saving', function (done) {

        orwell.import({//create db community, add collection, update settings and import 1 entry.
            name: 'community1', //try to sync to another database, wich no have keys in keystore
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        },
                'ef02fd34011905706f737473fd2a0153fd00019b76ff3429cc75249c8d0e1c3b96b62f143ad7f50cacb135513d89adbbd76aeb7ed3d54a035017a1a9d7ba5ef3f68bd29dfc241aa452b48a97232a4cc8bf80cd86fbb26078d1512eed5b40f520c7bc2f8f32abfe936f062255e32458a0eb747771ddcc7d43938d377ebb1e0c2c000b154fa9de0c00a80535c91c04dc0898d342b1006dbaf97af0eb941cad4e4ca1189c7e6c84be366ea085ca47ee6ff5a298d21b0d897de426c46b59d23fe5a5f29500e5c7557ce2cfe8d6ea6a694614928132ea68b095c99a95a274df928ee3100319db3e8b018bb85f3ba8245f96b9fc48586cbe14cbd6238656d468e6570d7202b0f425e6432b6e3b7accacdf8ebd58ba5856015759585e929b496e255e3e8ec6f826523292ddb35ec05e90163559e0819c6ffc4d228787fd34012005706f737473fd2a0153fd000146254e9c7d0b93130f69cc2d2c29d367ae4b8db7a9188bd2d2127d2fa846cf6e084515d1206c23358d40826e0133b8be15de8186f586e4fe6fffb54ca6e746c8f9da91aa1c7320c2dc1f88fcd276fa644a4daafdd37a9dd178a1953281e7dfe4f795da750490a9eb5d12bcc65508382c6d872428ac11b300e5e639605b754f0a54c8142c2255dcefcac2ccade40866e0f58c2567bf8303932270c9126f5da8773722482e2bebb00de1224a60fb10aa12059a96c49ccc2143f8ef8ddd526f35c3019a352c7c3b636fd8c8574e6b532151ace3117512b27959658cee9b3ab747a360d42d931c91bba8d98eff8f7f45fd0737efbec4ae586028ad6cd890a74f3c255601575958bf5d04e52da1ba417707e6c0dfd44e3cee32a0992825cb8a62d48321eb8ac44987'
                )
                .then(function (results) {
                    assert.equal(results.length, 2)
                    assert.equal(results[0].status, 'cantRead')//status
                    assert.equal(results[1].status, 'cantRead')

                    assert.equal(results[0].operation, 'create')
                    assert.equal(results[1].operation, 'write')
                    done();

                })
                .catch(function (e) {
                    done(e)
                })

    });


    it('export', function (done) {

        orwell.export({
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        }, function (db) {

            return db.create('posts', {privileges: [], writeScript: ''})
                    .then(function (res) {
                        return db.write("posts", {oid: '7f5aea2ff97f', title: 'test1', 'text': 'what?!'})
                    })
        })
                .then(function (hex) {

                    //try read encrypted content without keys. CanRead must be false
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

                    done();

                })
                .catch(function (e) {
                    done(e)
                })
    });

});

describe('orwelldb manual', function () {


    it('list', function (done) {


        $({
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        })
                .then(function (db) {
                    return db.getCollection("posts")
                })
                .then(function (dataset) {//first time may be throwned, but second and next - okay
                    return dataset.findItems()
                })
                .then(function (lst) {
                    assert.equal(lst.length, 1);
                    done()
                })
                .catch(function (err) {
                    console.log(err)
                })

    })

    it('cnt', function (done) {


        $({
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        })
                .then(function (db) {
                    return db.getCollection("posts")
                })
                .then(function (dataset) {//first time may be throwned, but second and next - okay
                    return dataset.count()
                })
                .then(function (cnt) {
                    assert.equal(cnt, 1);
                    done()
                })
                .catch(function (err) {
                    console.log(err)
                })

    })

    it('cnt', function (done) {


        $({
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        })
                .then(function (db) {
                    return db.getCollection("posts")
                })
                .then(function (dataset) {
                    return dataset.getItem('7f5aea2ff97f')
                })
                .then(function (itm) {
                    assert.equal('7f5aea2ff97f', itm.oid)
                    assert.equal('test1', itm.title)
                    done()
                })
                .catch(function (err) {
                    console.log(err)
                })

    })


    it('settings', function (done) {


        $({
            name: 'community',
            public_key: "047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb"
        })
                .then(function (db) {
                    return db.getSettings("posts")
                })
                .then(function (settings) {
                    assert.equal(settings.oid, 1)
                    assert.equal(settings.owner_key, '047f3cd8b44caccd0af9b05ea31f7151520df30c2f2c3b8c451180f9632bc3604e9b77abfa3232f1247ae44fdf380404851211135012b3caf2fca22a7795e95fdb')
                    assert.equal(settings.writeScript, '5560') //0x55 0x60
                    done()
                })
                .catch(function (err) {
                    console.log(err)
                })

    })

})
