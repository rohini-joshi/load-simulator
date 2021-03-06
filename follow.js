var when         = require('when');
var program      = require('commander');
var sequence     = require('when/sequence');

var users        = require('./users.json');
var masterKey    = require('./sdk_localhost').masterKey
var AppMasterKey = require('./sdk_localhost').App;
		AppMasterKey = AppMasterKey
									 .setMasterKey(masterKey);
program
	.version('0.0.2')
  .usage('[options]')
  .option('-u, --username <n>', 'Specify your chirp username')
  .parse(process.argv)

AppMasterKey.Class('built_io_application_user').Query()
.matches('email','^dummyuser')
.exec()
.then(function(dummyUsers){
	//to follow all dummy users
	var dummyUidArr = dummyUsers.map(function(dummyUser){
		return dummyUser.get('uid');
	});

	AppMasterKey.Class('built_io_application_user').Query()
	.where('username',program.username)
	.exec()
	.then(function(user){
		user[0]
		.pushValue('follows', dummyUidArr)
		.timeless()
		.save()
		.then(function(){
			console.log("followed");
			process.exit();
		})
	})
})
