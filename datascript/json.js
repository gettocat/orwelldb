var bitPony = require('bitpony');


bitPony.extend('json', function () {

    var VERSION = 0xf0f001f, FUNC = 0xf5, OBJ = 0xf4, STR = 0xf1, NUMBER = 0xf2, FLOAT = 0xf6, ARR = 0xf3, NULL = 0xf0;
    //first byte - type:
    //0xf4 - json object
    //0xf1 - string next
    //0xf2 - var_int (integer)
    //0xf3 - Array
    //0xf0 - NULL
    //0xf5 - js function callback
    //sort by keysname asc
    //format typebyte-(string)-key-val

    return {
        read: function (buffer) {
            if (typeof buffer == 'string')
                buffer = new Buffer(buffer, 'hex')

            if (buffer.length == 0 || !buffer)
                buffer = new Buffer([NULL, 0]);

            var stream = new bitPony.reader(buffer);

            var unserializePrimitive = function (stream, offset) {

                var item = {};
                var res = stream.uint8(offset);
                item.type = res.result;
                offset = res.offset;

                res = stream.string(offset);
                item.key = res.result.toString();
                offset = res.offset;
                if (item.type == NUMBER)
                    res = stream.var_int(offset);
                else//str
                    res = stream.string(offset);

                if (item.type == NULL)
                    item.value = null;
                else if (item.type == NUMBER)
                    item.value = res.result;
                else if (item.type == FLOAT)
                    item.value = parseFloat(res.result);
                else if (item.type == FUNC) {
                    item.value = new Function("return " + res.result.toString())()
                } else {
                    item.value = res.result.toString();
                }
                offset = res.offset;


                return {
                    offset: offset,
                    item: item
                };
            }

            var unserializeArray = function (stream, offset) {

                var item = {value: [], count: 0};
                var res = stream.uint8(offset);//array flag
                item.type = res.result;
                offset = res.offset;

                res = stream.string(offset);
                item.key = res.result.toString();
                offset = res.offset;

                res = stream.var_int(offset);
                item.count = res.result;
                offset = res.offset;

                for (var i = 0; i < item.count; i++) {

                    var type = stream.uint8(offset);

                    offset = type.offset;
                    if (type.result == OBJ) {
                        res = unserializeObject(stream, offset - 1);
                    } else if (type.result == ARR) {
                        res = unserializeArray(stream, offset - 1);
                    } else {
                        res = unserializePrimitive(stream, offset - 1);
                    }

                    offset = res.offset;
                    item.value.push(res.item.value);//keys is null
                }

                return {
                    offset: offset,
                    item: item
                };
            }

            var unserializeObject = function (stream, offset) {
                var item = {value: {}, count: 0};
                var res = stream.uint8(offset);
                item.type = res.result;
                offset = res.offset;

                res = stream.string(offset);
                item.key = res.result.toString();
                offset = res.offset;

                res = stream.var_int(offset);
                item.count = res.result;
                offset = res.offset;

                for (var i = 0; i < item.count; i++) {

                    var type = stream.uint8(offset);
                    offset = type.offset;
                    if (type.result == OBJ) {
                        res = unserializeObject(stream, offset - 1);
                    } else if (type.result == ARR) {
                        res = unserializeArray(stream, offset - 1);
                    } else {
                        res = unserializePrimitive(stream, offset - 1);
                    }

                    offset = res.offset;
                    item.value[res.item.key] = res.item.value;
                }

                return {
                    offset: offset,
                    item: item
                };
            }


            var version, sign;
            var res = stream.uint32(0);
            version = res.result;
            res = stream.uint32(res.offset)
            sign = res.result;

            var mysign = parseInt(bitPony.tool.sha256(bitPony.tool.sha256(buffer.slice(res.offset, buffer.length))).slice(0, 4).toString('hex'), 16);

            //another version its ok
            //if (version != VERSION)
            //throw new Error('binay json package is not valid version recived');

            if (mysign != sign)
                throw new Error('binay json package is not valid');

            res = unserializeObject(stream, res.offset).item.value;
            return res;

        },
        write: function (obj) {

            var b = new Buffer("");
            var stream = new bitPony.writer(b);

            var serializePrimitive = function (stream, type, key, val) {

                stream.uint8(type, true);
                stream.string(key, true)
                if (type == NULL) {
                    stream.var_int(0, true);
                } else if (type == NUMBER)
                    stream.var_int(val, true);
                else {

                    if (val.toString() != "") {
                        stream.string(val.toString() || "", true)
                    } else {
                        stream.uint8(0, true)
                    }
                }

            }

            var serializeArray = function (stream, key, arr, sort) {


                stream.uint8(ARR, true);
                stream.string(key, true);
                stream.var_int(arr.length, true);

                if (sort)
                    arr.sort(function (a, b) {
                        return  a > b;
                    });

                for (var i in arr) {

                    var t = STR;
                    if (arr[i] instanceof Function) {
                        t = FUNC;
                    } else if (arr[i] instanceof Array) {
                        serializeArray(stream, "", arr[i], sort);
                        continue;
                    } else if (arr[i] instanceof Object) {
                        serializeObject(stream, "", arr[i], sort);
                        continue;
                    } else if (arr[i] == null) {
                        t = NULL;
                        arr[i] = 0;
                    } else if (arr[i] === true) {
                        t = NUMBER;
                        arr[i] = 1;
                    } else if (arr[i] === false) {
                        t = NUMBER;
                        arr[i] = 0;
                    } else if (arr[i] !== "" && /^\d+$/.test(arr[i]) && isFinite(arr[i]))
                        t = NUMBER;

                    serializePrimitive(stream, t, "", arr[i]);

                }

            }

            var serializeObject = function (stream, key, obj, sort) {

                var keys = Object.keys(obj);
                stream.uint8(OBJ, true);
                stream.string("" + key, true);
                stream.var_int(keys.length, true);

                if (sort)
                    keys.sort(function (a, b) {
                        return  a > b;
                    });

                for (var i in keys) {
                    var o = obj[keys[i]];
                    var t = STR;//functions and others

                    if (o instanceof Function) {
                        t = FUNC;
                    } else if (o instanceof Array) {
                        t = ARR;
                        serializeArray(stream, keys[i], o, sort);
                        continue;
                    } else if (o instanceof Object) {
                        t = OBJ;
                        serializeObject(stream, keys[i], o, sort);
                        continue;
                    } else if (o == null) {
                        t = NULL;
                        o = 0;
                    } else if (o === true) {
                        o = 1;
                        t = NUMBER;
                    } else if (o === false) {
                        o = 0;
                        t = NUMBER;
                    } else if (o !== "" && /^\d+$/.test(o) && isFinite(o)) {
                        t = NUMBER;
                    }

                    //for numbers and string
                    serializePrimitive(stream, t, keys[i], o);

                }
            }

            serializeObject(stream, "", obj);
            var buff = stream.getBuffer();
            var sign = bitPony.tool.sha256(bitPony.tool.sha256(buff))
            var stream2 = new bitPony.writer(new Buffer(""));

            stream2.uint32(VERSION, true)//version
            stream2.uint32(parseInt(sign.slice(0, 4).toString('hex'), 16), true);//digest

            return Buffer.concat([
                stream2.getBuffer(),
                buff
            ])

        }
    }

});
