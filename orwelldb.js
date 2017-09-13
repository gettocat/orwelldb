var transaction = require('./database/transaction')
var $ = require('./database/crypto').createDB
var imp = require('./database/import')
var datascript = require('./datascript/index')
var orwell = {};


orwell.export = function (options, cb) {

    transaction.start();
    return $(options)
            .then(function (db) {
                return cb(db)
            })
            .then(function () {
                return new Promise(function (resolve) {
                    resolve(transaction.commit())
                })
            })
            .catch(function (err) {
                console.log(err)
            })

}

orwell.import = function (options, script) {
    return new Promise(function (resolve) {
        new imp(script, options, function (results) {
            resolve(results)
        })
    })
}

orwell.$ = $;

orwell.datascript = datascript;

module.exports = orwell