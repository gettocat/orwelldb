var datascript = require('./datascript_build');
var datascript_parser = require('./datascript_parse')
var bitPony = require('bitpony')

var dscript = function (options, pem, algorithm) {

    if (typeof options == 'string' || options instanceof Buffer) {
        this.type = 'hex';
        this.hex = options == 'string' ? new Buffer(options, 'hex') : options;
        this.pem = pem;
        this.algorithm = algorithm || 'rsa';
        this.hex.toString('hex');
    } else if (options instanceof Object) {
        this.type = 'json';
        this.data = options.content;
        this.dataset = options.dataset;
        this.operation = options.operation;
        this.pem = pem;
        this.algorithm = options.algorithm;
        this.canRead = this.success = true;
    }

}

dscript.prototype._inc = function (dataset, data) {
    this.dataset = dataset;
    this.data = data;
    return this.toHEX();
}

dscript.prototype.write = function (dataset, data) {
    this.operation = 'write';
    return  this._inc(dataset, data)
}

dscript.prototype.create = function (dataset, data) {
    this.operation = 'create';
    return  this._inc(dataset, data)
}

dscript.prototype.settings = function (dataset, data) {
    this.operation = 'settings';
    return  this._inc(dataset, data)
}

dscript.prototype.toHEX = function () {
    if (!this.hex) {

        var enc = {};

        if (this.pem)
            enc = {
                encrypt: this.algorithm,
                pem: this.pem
            };

        var dscript = new datascript(enc)
                .setOp(this.operation)
                .setDataSet(this.dataset)
                .setJson(this.data);

        this.hex = dscript.build().toString('hex')
    }

    if (this.hex instanceof Buffer)
        this.hex = this.hex.toString('hex');//so much hex at one line, lol

    return this.hex;

}

dscript.prototype.toBuffer = function () {
    if (!this.hex) {

        var enc = {};

        if (this.pem)
            enc = {
                encrypt: this.algorithm,
                pem: this.pem
            };

        var dscript = new datascript(enc)
                .setOp(this.operation)
                .setDataSet(this.dataset)
                .setJson(this.data);

        this.hex = dscript.build().toString('hex')
    }
    return new Buffer(this.hex, 'hex');
}

dscript.prototype.toJSON = function () {
    if (!this.data) {
        var enc = {};

        if (this.pem)
            enc = {
                encrypt: this.algorithm,
                pem: this.pem
            };

        var dparse = new datascript_parser(this.hex, {
            pem: this.pem
        });

        try {
            this.data = dparse.getContent();
        } catch (e) {
            if (!dparse.isReadable())
                this.data = null;
        }
        this.dataset = dparse.getDataSet();
        this.operation = dparse.getOperator();
        this.canRead = dparse.isReadable();
        this.success = dparse.isSuccessfully()
    }
    return {
        dataset: this.dataset,
        operator: this.operation,
        content: this.data,
        canRead: this.canRead,
        success: this.success
    }
}

dscript.writeArray = function (arr) {//arr its array of dscript hex

    var buffer = new Buffer([0xef]);
    var writer = new bitPony.writer(buffer);

    writer.var_int(arr.length, true);
    for (var i in arr) {

        writer.string(new Buffer(arr[i], 'hex'), true);

    }

    return writer.getBuffer().toString('hex')

}

dscript.readArray = function (script) {
    var arr = [];
    //protocol rules:
    //if first byte is 0xef - its vector of var_str
    //if 0xee or another - its just one script
    var b = new Buffer(script, 'hex');
    var offset = 0;
    if (b[0] == 0xef) {
        offset = 1;

        var reader = new bitPony.reader(b);
        var res = reader.var_int(offset);
        var cnt = res.result;
        offset = res.offset;

        for (var i = 0; i < cnt; i++) {

            res = reader.string(offset)
            offset = res.offset;
            arr.push(res.result.toString('hex'))

        }

        return arr;

    } else if (b[0] == 0xee) {
        offset = 1;
        arr.push(b.slice(offset).toString('hex'))
        return arr;
    }


    arr.push(script)
    return arr;
}


module.exports = dscript;