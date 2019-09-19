var datascript_builder = require('../datascript/datascript_build');
var datascript_parser = require('../datascript/datascript_parse')
var datascript = require('../datascript/index')
var assert = require('assert');
var fs = require('fs');
var pem = fs.readFileSync('./_tests/pem').toString();

var obj = {id: 1, type: 'post', title: 'test', text: 'qweqwe123'};



//data without encryption
describe('datascript build/parse script no encryption', function () {

    it('should be okay build', function () {
        var dscript = new datascript_builder()
                .setOp('write')
                .setDataSet('posts')
                .setJson(obj);
        
        assert.equal(dscript.build().toString('hex'), "2005706f737473375435010093e78d54050004020269640104047479706504706f737404057469746c65047465737404047465787409717765717765313233")
    });

    it('should be okay parse', function () {

        var dparse = new datascript_parser(
                "2005706f737473375435010093e78d54050004020269640104047479706504706f737404057469746c65047465737404047465787409717765717765313233");

        assert.equal(JSON.stringify(dparse.getContent()), JSON.stringify(obj));
    });

});


//data with encryption
describe('datascript build script + encrypt with RSA', function () {

    it('should be okay', function () {
        var dscript = new datascript_builder({
            encrypt: 'rsa',
            pem: pem
        })
                .setOp('write')
                .setDataSet('posts')
                .setJson(obj);

        var dparse = new datascript_parser(dscript.build().toString('hex'), {
            pem: pem
        });

        assert.equal(dparse.isReadable(), true);
        assert.equal(dparse.isSuccessfully(), true);
        assert.equal(dparse.getOperator(), 'write');
        assert.equal(dparse.getDataSet(), 'posts');
        assert.equal(JSON.stringify(dparse.getContent()), JSON.stringify(obj));
    });

    it('unsupported operation', function () {


        assert.throws(function () {
            var dscript = new datascript_builder({
                encrypt: 'rsa',
                pem: pem
            })
                    .setOp('read')
                    .setDataSet('posts')
                    .setJson(obj);
            dscript.build();
        })

    });

    it('unsupported encryption', function () {


        assert.throws(function () {
            var dscript = new datascript_builder({
                encrypt: 'dsa',
                pem: pem
            })
                    .setOp('write')
                    .setDataSet('posts')
                    .setJson(obj);
            dscript.build();
        })

    });

    it('empty dataset name', function () {


        assert.throws(function () {
            var dscript = new datascript_builder({
                encrypt: 'rsa',
                pem: pem
            })
                    .setOp('write')
                    .setDataSet('')
                    .setJson(obj);
            dscript.build();
        })

    });

    it('invalid pem', function () {


        assert.throws(function () {
            var dscript = new datascript_builder({
                encrypt: 'rsa',
                pem: ''
            })
                    .setOp('write')
                    .setDataSet('posts')
                    .setJson(obj);
            dscript.build();
        })

    });

    it('data is not js object', function () {


        assert.throws(function () {
            var dscript = new datascript_builder({
                encrypt: 'rsa',
                pem: pem
            })
                    .setOp('write')
                    .setDataSet('posts')
                    .setJson([1, 2, 3, 4, 5]);
            dscript.build();
        })

    });
});




describe('datascript parsing encrypted RSA', function () {

    it('should be okay', function () {

        var dparse = new datascript_parser(
                "2005706f737473fd2a0153fd00013b6bf08e8922b9ebd0b5dd83e87147a49748a38785ca8774feda6b0977f41e6612f812951d5e36e9d1107d12deca236fdb817ab44c0fbc8c78f14a0bdaf231061a6a5a03af60c95107cec87f89e18546fe1d5d992d7cfef762ea6fbd08981d57a46313d7f04fd18ef0b6733ac7c32b73f88b8ee29378b43d05705019c9678e45b7e7fe3965dd22afdd9f7d45095e90c6725c112570bdaf36f3e489f26edb1f5f880db9aa828a2106142cf638e0b92ead01e80416fdb73551eed7e2e54c5aa09df31b49fc022cf0608b2f85fbcda9b717384daa214197bb513c32bc853187ed05f7cc9bf215d286b4fedb85a67276487977b4fc5f93bea2a361386ffb5b018a3456015759581f4c0a0280d5c5bf9972815fd36cc4287f66ca3976a2b25f349b1c7536a1e42d87",
                {
                    pem: pem
                });
        assert.equal(dparse.isReadable(), true);
        assert.equal(dparse.isSuccessfully(), true);
        assert.equal(dparse.getOperator(), 'write');
        assert.equal(dparse.getDataSet(), 'posts');
        assert.equal(JSON.stringify(dparse.getContent()), JSON.stringify(obj));
    });
})


describe('datascript interfac1e', function () {

    it('should be okay1', function () {

        var dscript = new datascript("2005706f737473fd2a0153fd00013b6bf08e8922b9ebd0b5dd83e87147a49748a38785ca8774feda6b0977f41e6612f812951d5e36e9d1107d12deca236fdb817ab44c0fbc8c78f14a0bdaf231061a6a5a03af60c95107cec87f89e18546fe1d5d992d7cfef762ea6fbd08981d57a46313d7f04fd18ef0b6733ac7c32b73f88b8ee29378b43d05705019c9678e45b7e7fe3965dd22afdd9f7d45095e90c6725c112570bdaf36f3e489f26edb1f5f880db9aa828a2106142cf638e0b92ead01e80416fdb73551eed7e2e54c5aa09df31b49fc022cf0608b2f85fbcda9b717384daa214197bb513c32bc853187ed05f7cc9bf215d286b4fedb85a67276487977b4fc5f93bea2a361386ffb5b018a3456015759581f4c0a0280d5c5bf9972815fd36cc4287f66ca3976a2b25f349b1c7536a1e42d87", pem)
        var i = dscript.toJSON();

        assert.equal(i.canRead, true);
        assert.equal(i.success, true);
        assert.equal(i.operator, 'write');
        assert.equal(i.dataset, 'posts');
        assert.equal(JSON.stringify(i.content), JSON.stringify(obj));
    });

    it('should be okay2', function () {

        var dscript = new datascript({
            operation: 'write',
            dataset: 'posts',
            content: obj,
            algorithm: 'rsa'
        }, pem)
        
        var hex = dscript.toHEX();
        
        var dscript = new datascript(hex, pem)
        var i = dscript.toJSON();


        assert.equal(i.canRead, true);
        assert.equal(i.success, true);
        assert.equal(i.operator, 'write');
        assert.equal(i.dataset, 'posts');
        assert.equal(JSON.stringify(i.content), JSON.stringify(obj));
    });
})
