module.exports = function (db, cb) {
    
    
    db.define('pem', {
        oid: String,
        keyfingerprint: String,
        pem: String,
        dbname: String,
        dataset: String,
        algorithm: String,
    });


    return cb();
};