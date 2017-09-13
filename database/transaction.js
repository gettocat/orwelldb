var bitPony = require('bitpony')
var transaction = {
    list: [],
    enabled: 0
};

transaction.start = function () {
    transaction.list = [];
    transaction.enabled = 1;
}

transaction.add = function (hex) {
    transaction.list.push(hex);
}

transaction.commit = function () {

    var cnt = transaction.list.length;
    var writer = new bitPony.writer(new Buffer([0xef]));
    writer.var_int(cnt, true);
    for (var i in transaction.list) {

        writer.string(new Buffer(transaction.list[i], 'hex'), true);

    }

    return writer.getBuffer().toString('hex');

}

transaction.rollback = function () {
    transaction.list = [];
    transaction.enabled = 0;
}

module.exports = transaction;