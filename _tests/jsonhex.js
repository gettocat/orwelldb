var assert = require('assert');
var bitPony = require('bitpony');
require('../datascript/json');
//d182d0b5d181d182 utf8
//d182d0b5d181d182
/*encodeUtf8 = function (str) {
 return unescape(encodeURIComponent(str));
 };
 
 
 decodeUtf8 = function (str) {
 return decodeURIComponent(escape(str));
 };
 var str = 'тестid',
 encoded = encodeUtf8(str),
 enc  =new Buffer(encoded).toString('hex'),res=decodeUtf8(new Buffer(enc,'hex').toString())
 console.log(enc,res == str);*/
var tests = [
    {name: 'ordinary', args: {id: 1, type: 'post', title: 'test', text: 'qweqwe123'}},
    {name: 'multibyte codepage', args: {id: '12выа', arr: [{id: 'тест', 'русский ключ': 'русское значение'}, 'элемент 2', 0, 0, 1, 0x55555], 'text': 'большой замудренный текст на русском язычке'}},
    {
        name: 'deep_nesting',
        args: {
            null: null,
            id: '12выа',
            'arr': [
                '\n',
                [0,
                    [
                        1,
                        2,
                        3,
                        [1, 2, 3, 4, {a: 'b', 'ы': '1'}]
                    ],
                    2,
                    {a: [
                            5, 5, 5, 5, 'orwell'
                        ]},
                ]
            ],
        }
    },
    {name: 'true-false-null', args: {id: null, values: [true, false, true, false, false, null]}},
    {name: 'empty-array', args: {arr: []}},
    {name: 'empty-str', args: {str: ""}},
    {name: 'empty-int', args: {i: 0}},
    {name: 'empty-obj', args: {obj: {}}},
    {name: 'char test', args: {a: '\n', c: '\r', d: '', e: 'o', b: 'test', i: 127, o: 0xf}},
]

var obj = {id: 1, type: 'post', title: 'test', text: 'qweqwe123'};
describe('datascript build/parse script no encryption', function () {

    tests.forEach(function (test) {
        it('jsonhex serialize/unserialize test ' + test.name, function () {
            var obj = test.args
            var hex = bitPony.json.write(obj)
            var obj_res = bitPony.json.read(hex)

            if (test.name == 'true-false-null') {
                assert.equal(obj.id, obj_res.id)//json store bool values and null values in array like a 0 and 1
                assert.equal(obj.values.length, obj_res.values.length)
                assert.equal(!!obj.values[0], !!obj_res.values[0])
                assert.equal(!!obj.values[1], !!obj_res.values[1])
                assert.equal(!!obj.values[2], !!obj_res.values[2])
                assert.equal(!!obj.values[3], !!obj_res.values[3])
                assert.equal(!!obj.values[4], !!obj_res.values[4])
                assert.equal(!!obj.values[5], !!obj_res.values[5])
                assert.equal(obj.values[6], obj_res.values[6])
            } else
                assert.equal(JSON.stringify(obj), JSON.stringify(obj_res))

        });
    });

});