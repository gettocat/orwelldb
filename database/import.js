var dscript = require('../datascript/index')
var $db = require('./crypto').createDB

var imprt = function (script, dboptions, cb) {
    var f = this;
    $db(dboptions).then(function (db) {
        f.databasename = dboptions.name;
        f.dboptions = dboptions;
        f.public_key = dboptions.public_key;
        f.onEnd = cb;
        f.result = [];
        f._db = db;
        var scriptlist = [];
        if (script instanceof Array) {

            for (var i in script) {
                var a;
                if (script[i] instanceof Buffer)
                    a = script[i].toString('hex');
                else
                    a = script[i]
                scriptlist = f.checkHex(a, scriptlist)
            }

        } else if (script instanceof Buffer) {
            scriptlist = f.checkHex(script.toString('hex'), scriptlist)
        } else
            scriptlist = f.checkHex(script, scriptlist)

        f.list = scriptlist;
        f.init();
    })


}

imprt.prototype.checkHex = function (script, oldarray) {

    //protocol rules:
    //if first byte is 0xef - its vector of var_str
    //if 0xee or another - its just one script
    var list = dscript.readArray(script)
    for (var i in list)
        oldarray.push(list[i])

    return oldarray;
}

imprt.prototype.init = function () {

    var f = this;
    this.list.forEach(function (data, i) {
        var d = new dscript(data);
        var res = d.toJSON();
        if (!res.canRead) {//encrypted, try to find pem in db

            f._db.getPem(res.dataset)
                    .then(function (item) {
                        if (item.pem) {//try to parse one more time
                            d = new dscript(data, item.pem, item.algorithm || 'rsa');
                            res = d.toJSON();
                        }

                        f.result[i] = f.make(res)
                                .then(function (args) {
                                    f.result[i] = args;
                                    f.resultListener(i);
                                })

                    })
                    .catch(function (err) {
                        console.log(err)
                    })

        } else
            f.make(res)
                    .then(function (args) {
                        f.result[i] = args;
                        f.resultListener(i);
                    })
                    .catch(function (err) {
                        console.log(err)
                    })
    })


}

imprt.prototype.make = function (command) {
    if (!command.canRead || !command.success)//do not save encrypted entries
        return new Promise(function (resolve) {
            resolve({
                operation: command.operator,
                status: 'cantRead',
                error: 'you cant read this entryes, without keys'
            })
        })
    return this._db[command.operator](command.dataset, command.content)

}

imprt.prototype.resultListener = function (num) {

    if (!this.count)
        this.count = 1;
    else
        this.count++;

    if (this.count >= this.list.length) {
        this.onEnd(this.result);

    }

}

module.exports = imprt