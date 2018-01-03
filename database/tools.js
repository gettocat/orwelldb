var hash = require('hash.js');
var crypto = require('crypto');

module.exports = {
    sha256: function (message, output) {
        if (!output)
            output = '';
        return crypto.createHash('sha256').update(message).digest(output);
    },
    ripemd160: function (message, output) {
        if (!output)
            output = '';
        return hash.ripemd160().update(message).digest(output)
    },
    generateAddressHash: function (pubHex) {
        return module.exports.ripemd160(module.exports.sha256(new Buffer(pubHex, 'hex')), 'hex');
    }
}