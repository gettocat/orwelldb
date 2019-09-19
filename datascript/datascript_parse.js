const bitPony = require('bitpony');
const owl = require('bitowl');
//require('./json');

var stackConst = require('./const').const
var scriptOps = require('./const').ops

var datascript_parse = function (buffer, options) {

    if (typeof buffer == 'string')
        buffer = new Buffer(buffer, 'hex');

    this.raw = buffer;
    this.options = options || {};
    this.parse();

}

datascript_parse.prototype.parse = function () {

    //uint8 operator, var_str datasetname, var_str datascript
    var reader = new bitPony.reader(this.raw);
    var offset = 0;
    var res = reader.uint8(offset);
    offset = res.offset;
    this.operator = res.result;

    if (scriptOps.OP_WRITE == this.operator)
        this.operator = 'write';

    if (scriptOps.OP_CREATE == this.operator)
        this.operator = 'create';

    if (scriptOps.OP_CHANGESETTINGS == this.operator)
        this.operator = 'settings';

    res = reader.string(offset);
    offset = res.offset;
    this.dataset = res.result.toString();

    res = reader.string(offset);
    offset = res.offset;
    this.script = res.result;

    this.parseScript();

}

datascript_parse.prototype.parseScript = function () {

    var offset = 0;

    var values = Object.keys(stackConst).map(function (k) {
        return stackConst[k]
    }), getmethod = function (value) {
        for (var i in stackConst) {
            if (stackConst[i] == value)
                return i;
        }
    }, stack = [], data = {}, res;

    while (offset <= this.script.length) {

        if (values.indexOf(this.script[offset]) != -1) {

            res = this.methods[getmethod(this.script[offset])].apply(this, [offset, stack, data]);

            //console.log(getmethod(this.script[offset]), offset, res.offset)
            offset = res.offset;
            data = res.data;
            stack = res.stack;

        } else
            offset += 1;
    }

    if ((stack.length == 1 && stack[0] === true) || stack.length == 0) {
        this.executed = true;
        this.success = true;
        //this.json = bitPony.json.read(this.decrypted);//1
        this.json = owl.unpack(this.decrypted).value;
    } else if (!this.canRead) {
        this.executed = true;
        this.success = true;
    }



}

datascript_parse.prototype._decrypt = function (stack) {//stack order algo, pem, encrypted

    var algo = stack.shift(), pem = stack.shift(), data = stack.shift();

    if (algo == 0x1) {//rsa

        if (pem != null) {
            var NodeRSA = require('node-rsa');
            var key = new NodeRSA(pem), decrypted
            if (key.isEmpty())
                throw new Error('PEM is empty, can not decrypt data script content');

            if (key.isPrivate()) {

                decrypted = key.decrypt(data);

            } else {
                throw new Error('PEM is not private RSA key, can not decrypt data script content');
            }


            return {
                stack: stack,
                decrypted: decrypted,
            }
        } else {

            return {
                stack: stack,
                decrypted: null,
            }
        }

    }

    throw new Error('Not implemented encryption algorithm ' + algo);

}

datascript_parse.prototype.methods = {
    "DATA_HEXJSONENCRYPTED": function (offset, stack, data) {

        offset = offset + 1;
        data.encrypted = true;

        var read = new bitPony.reader(this.script);
        var res = read.string(offset);
        data.encrypted = res.result;
        offset = res.offset;
        stack.unshift(res.result);

        res = read.uint8(offset);//read key operator
        offset = res.offset;
        if (res.result != stackConst['PUSHDATA_DBREADPRIVATEKEY'])
            throw new Error('datascript stack read encrypted data invalid. var_str(data)+OP_READKEY+uint8(algorithm) need');

        if (this.options.pem)
            stack.unshift(this.options.pem);
        else
            stack.unshift(null);


        res = read.uint8(offset);//algorithm
        offset = res.offset;
        data.algorithm = res.result;

        stack.unshift(data.algorithm);


        return {
            stack: stack,
            data: data,
            offset: offset,
        }
    },
    "DATA_HEXJSON": function (offset, stack, data) {
        offset += 1;

        var read = new bitPony.reader(this.script);
        var res = read.string(offset);
        this.decrypted = res.result;
        this.canRead = true;

        return {
            stack: stack,
            data: data,
            offset: res.offset,
        }
    },
    "PUSHDATA_DBWRITEPUBLICKEY": 0x55,
    "PUSHDATA_DBREADPRIVATEKEY": 0x56,
    "OP_DECRYPT": function (offset, stack, data) {

        var res = this._decrypt(stack);
        this.decrypted = data.decrypted = res.decrypted;
        this.canRead = data.canRead = !!res.decrypted
        stack = res.stack;

        stack.unshift(this.decrypted);

        return {
            stack: stack,
            data: data,
            offset: offset + 1,
        }
    },
    "OP_EQUAL": function (offset, stack, data) {

        var hash1 = stack.shift();
        var hash2 = stack.shift();
        stack.unshift(hash1 == hash2);

        return {
            stack: stack,
            data: data,
            offset: offset + 1,
        }
    },
    "DATA_HASH": function (offset, stack, data) {

        offset = offset + 1;
        var read = new bitPony.reader(this.script);
        var res = read.hash(offset);

        offset = res.offset;
        var hash = res.result;
        stack.unshift(hash);

        data.recvhash = hash;

        return {
            stack: stack,
            data: data,
            offset: offset,
        }
    },
    "OP_HASH256": function (offset, stack, data) {

        if (this.canRead) {
            var decrypted = stack.shift();
            var hash = bitPony.tool.sha256(bitPony.tool.sha256(decrypted)).toString("hex");
            stack.unshift(hash);
        }

        data.myhash = hash;

        return {
            stack: stack,
            data: data,
            offset: offset + 1,
        }
    },
}

datascript_parse.prototype.isReadable = function () {
    return this.canRead;
}

datascript_parse.prototype.isSuccessfully = function () {
    return this.executed && this.success;
}

datascript_parse.prototype.getContent = function () {
    if (!this.isSuccessfully())
        throw new Error('datascript was parsed with errors, so can not get data content from script');

    if (!this.isReadable())
        throw new Error('datascript is not readable (encrypted) cant get content');

    return this.json;

}

datascript_parse.prototype.getDataSet = function () {
    return this.dataset;
}

datascript_parse.prototype.getOperator = function () {
    return this.operator;
}

module.exports = datascript_parse;