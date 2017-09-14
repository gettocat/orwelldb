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
        
        assert.equal(dscript.build().toString('hex'), "2005706f7374733954371f000f0fe660259ff40004f202696401f1047479706504706f7374f1057469746c650474657374f1047465787409717765717765313233")
    });

    it('should be okay parse', function () {

        var dparse = new datascript_parser(
                "2005706f73747339543701f0f000e660259ff40004f202696401f1047479706504706f7374f1057469746c650474657374f1047465787409717765717765313233");

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
                "2005706f737473fd2a0153fd0001e7cd835deef2bbd4b8fa82ee8673d92807a88b539f7e32bde0d740318b8806e2d5b0a967b266c4955155ba164e27c0af1c0bc0310b5c4128ad53a6f5948ab08b0643d097ac5d7e8dc8d41f9f3ac3a5dd9e1eb65ad5e206cecd8d1b1867aab1afa6ba400b1b24b082a11aa76ed2ccdb9abd4a80884141149baafa06491a5fed5c5b18c3eee3192d06dc51eb57126c9146f10121b6b8e184c2df92bd5b469699256331fce38b466a39fc47c2afe2e26cf4cedce80ec0119f273ea96dc88e2f1ef61e73dca2b536e087437e1f2f6c00c1a0128ada7e12f6df062887b3cb3a8477ff2d26b2c15c075748d55f2ec33d26774483303539db142cb0ba16b2ebdc8692405601575958ab51a41bca643c96f1d838e8f6618a28264848a08b592627bb0b4651a0b1752e87",
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


describe('datascript interface', function () {

    it('should be okay', function () {

        var dscript = new datascript("2005706f737473fd2a0153fd0001e7cd835deef2bbd4b8fa82ee8673d92807a88b539f7e32bde0d740318b8806e2d5b0a967b266c4955155ba164e27c0af1c0bc0310b5c4128ad53a6f5948ab08b0643d097ac5d7e8dc8d41f9f3ac3a5dd9e1eb65ad5e206cecd8d1b1867aab1afa6ba400b1b24b082a11aa76ed2ccdb9abd4a80884141149baafa06491a5fed5c5b18c3eee3192d06dc51eb57126c9146f10121b6b8e184c2df92bd5b469699256331fce38b466a39fc47c2afe2e26cf4cedce80ec0119f273ea96dc88e2f1ef61e73dca2b536e087437e1f2f6c00c1a0128ada7e12f6df062887b3cb3a8477ff2d26b2c15c075748d55f2ec33d26774483303539db142cb0ba16b2ebdc8692405601575958ab51a41bca643c96f1d838e8f6618a28264848a08b592627bb0b4651a0b1752e87", pem)
        var i = dscript.toJSON();


        assert.equal(i.canRead, true);
        assert.equal(i.success, true);
        assert.equal(i.operator, 'write');
        assert.equal(i.dataset, 'posts');
        assert.equal(JSON.stringify(i.content), JSON.stringify(obj));
    });

    it('should be okay', function () {

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
