var bitPony = require('bitpony');
require('./json');

var stackConst = require('./const').const
var scriptOps = require('./const').ops

var datascript_build = function (options) {
    if (!options)
        options = {};

    if (options.encrypt) {
        this.encryption = true;
        this.database_pem = options.pem;
        this.encryption_algorithm = (options.encrypt == 'rsa' || options.encrypt == 0x1) ? 0x1 : '';//rsa
        if (!this.database_pem)
            throw new Error('you can encrypt orwell datascript only if have a valid database_pem');

    } else
        this.encryption = false;

}


datascript_build.prototype = {
    setOp: function (op) {

        if (op == 'write' || op == scriptOps.OP_WRITE) {

            this.op = scriptOps.OP_WRITE;

        }

        if (op == 'create' || op == scriptOps.OP_CREATE) {

            this.op = scriptOps.OP_CREATE;

        }

        if (op == 'settings' || op == scriptOps.OP_CHANGESETTINGS) {

            this.op = scriptOps.OP_CHANGESETTINGS;

        }

        if (!this.op)
            throw new Error('unsupported data operation');

        return this;

    },
    setDataSet: function (datasetname) {

        if (!datasetname)
            throw new Error('datasetname must exist');

        this.dataset = datasetname;
        return this;

    },
    setJson: function (data) {

        this.data = data;

        if (typeof data == 'string' || typeof data == 'number' || data instanceof Array)
            throw new Error('data must be a js object only');

        this.data_raw = bitPony.json.write(this.data)
        return this;

    },
    build: function () {
        var buff;
        if (!this.result) {
            var buffer = Buffer.concat([
                new Buffer([this.op]),
                bitPony.string.write(this.dataset),
            ])

            if (!this.encryption) {
                //PUSHDATA_DATA
                //PUSHDATA_HEXJSON
                var script = Buffer.concat([
                    new Buffer([stackConst['DATA_HEXJSON']]),
                    bitPony.string.write(this.data_raw)
                ])

                buff = Buffer.concat([
                    buffer,
                    bitPony.string.write(script)
                ])
            } else {

                //encrypto data
                //PUSHDATA_HEXJSONENCRYPTED
                //PUSHDATA_DBREADPRIVATEKEY
                //OP_DECRYPT
                //OP_EQUAL
                var encdata = this.encrypt();
                var script = Buffer.concat([
                    new Buffer([stackConst['DATA_HEXJSONENCRYPTED']]),
                    bitPony.string.write(encdata),
                    new Buffer([stackConst['PUSHDATA_DBREADPRIVATEKEY']]),
                    bitPony.uint8.write(this.encryption_algorithm),
                    new Buffer([stackConst['OP_DECRYPT']]),
                    new Buffer([stackConst['OP_HASH256']]),
                    new Buffer([stackConst['DATA_HASH']]),
                    bitPony.hash.write(bitPony.tool.sha256(bitPony.tool.sha256(this.data_raw))),
                    new Buffer([stackConst['OP_EQUAL']]),
                ])

                buff = Buffer.concat([
                    buffer,
                    bitPony.string.write(script)
                ])
            }

            this.result = buff;
        }

        return this.result;

    },
    encrypt: function () {
        var b = bitPony.json.write(this.data);

        if (this.encryption_algorithm == 0x1) {//rsa

            var NodeRSA = require('node-rsa');
            var key = new NodeRSA(this.database_pem);
            if (key.isEmpty())
                throw new Error('PEM is empty, can not encrypt data script content');

            if (key.isPrivate()) {

                return key.encrypt(b);

            } else {
                throw new Error('PEM is not private RSA key, can not encrypt data script content');
            }


        }

        throw new Error('Not implemented encryption algorithm ' + this.encryption_algorithm);

        //return buffer;
    }
}

module.exports = datascript_build;