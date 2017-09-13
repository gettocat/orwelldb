module.exports = function (db, cb) {
    
    
    //its not good, but this orm create in each database this tables. So, keystore model is in another file. So, its look like a bug, but its feature. C: 
    db.define('settings', {
        oid: String,
        privileges: 'object',
        owner_key: String,
        writeScript: String,
    });

    db.define("post", {
        oid: String,
        added: Number,
        title: String,
        text: String,
        tags: String,
    })


    return cb();
};