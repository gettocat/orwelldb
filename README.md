# orwelldb
Library wich syncronize data beetween blockchain and database

# Orwelldb usage

## install
```
npm install orwelldb
```

## add to app
```js
var orwelldb = require('orwelldb');
```

## interface
```js

orwelldb.import(orwell_params, 'script or array of script')//returns Promise object
orwelldb.export(orwell_params, execFunction)//returns Promise object
orwelldb.$(orwell_params) //access to db api. return Promise
orwelldb.datascript //datascript builder/parser

```

## orwell params

```js
{
	adapter: mysqlAdapter,//database adapter object or empty for using native (nosql lokijs)
	name: 'db1',//database name
	public_key: "", //writer or owner public key
	keystore: {//keystore settings, for example can be used another user to keystore, or another adapter
		adapter: mysqlAdapter, //keystore db adapter
		name: 'keystore', //keystore database name
		options: { //keystore adapter options (for mysql need auth data)
			dbuser: 'orwelldb',
			dbpass: '',
			modelspath: '../_tests/models/keystore' //node-orm2 use models file with shema defenition
		}
	},
	options: { //adapter options
		dbuser: 'orwelldb',
		dbpass: '',
		modelspath: '../_tests/models/index' 
	}
}
```

## import

```js
new orwellsb.import(orwell_params, 'ef....datascript hex...')
.then(function (results) {
    //results is array of import result
})
.catch(function (e) {
    //error if have
})

```

### import result
```js
{ 
    operation: 'update',//operation insert/update
    data: //data from database (with meta data)
     { oid: 1,
       writeScript: 5560,
       owner_key: '',
       privileges: [],
       meta: [Object],
       '$loki': 1 },
    scenario: //scenario, datascript generated from
     { operation: 'create', //datascript operation
       dataset: 'posts', //dataset name
       content: { oid: 1,
                  writeScript: 5560,
                  owner_key: '',
                  privileges: [], }, 
       algorithm: 'rsa' }, //if have keystore for this db\dataset - encryption is enabled
    status: 0  //0 = ok, another status from 0 or 'ok' its error, error description in error field.
 }
```


## export

```js
orwelldb.export(orwell_params, function (db) {

        //actions in this function create datascript after result.
        //must return promise!
        //operations generated datascript in version 0.0.1: write, create, setSettings
        //for example create dataset posts, after that write data {oid: '7f5aea2ff97f', title: 'test1', 'text': 'what?!'}
	return db.create('posts', {privileges: [], writeScript: ''})
			.then(function (res) {
				return db.write("posts", {oid: '7f5aea2ff97f', title: 'test1', 'text': 'what?!'})
			})
})
	.then(function (hex) {

		//hex - datascript, contains all operation in one transaction
                //ef....
                // create dataset posts then write data

	})
```

## database 
```js
var $ = orwelldb.$;

$(orwell_options)
.then(function (db) {
	return db.getCollection("posts")
})
.then(function (dataset) {//first time may be throwned, but second and next - okay
	return dataset.findItems()
})
.then(function (list) {
	
})
.catch(function (err) {
	console.log(err)
})
```

interface descriped in wiki.

## datascript
```js
var datascript = orwelldb.datascript;
```

### parse
```js
var obj = new datascript('hex or buffer', pem);
obj.toJSON();
```
return:
```js
{
        dataset: 'dataset name',
        operator: 'operation',//write, create, settings
        content: {},//data
        canRead: true, // if false - datascript encrypted, need pem
        success: true // if false - datascript is not valid
}
```

### build
```js
var obj = new datascript({
    operation: 'write',
    dataset: 'posts',
    content: obj, 
    algorithm: 'rsa' // rsa or ecdh
}, pem);
obj.toHEX(); //returns hex string of datascript buffer.
```

More information and examples you can read in orwelldb wiki: [wiki](https://github.com/gettocat/orwelldb/wiki)
