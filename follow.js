var when         = require('when');
var program      = require('commander');
var sequence     = require('when/sequence');

var masterKey    = 'blt73275122067fbf70';
var AppMasterKey = require('./sdk_localhost');
		AppMasterKey = AppMasterKey
									 .setMasterKey(masterKey);
program
  .version('0.0.2')
  .usage('[options]')
  .option('-u, --username <n>', 'Specify your chirp username')
  .parse(process.argv);

AppMasterKey.Class('built_io_application_user').Query()
.matches('username','^dummyuser')
.exec()
.then(function(dummyUsers){
	var uidArr = dummyUsers.map(function(dummyUser){
		return dummyUser.get('uid');
	});

	AppMasterKey.Class('built_io_application_user').Query()
	.where('username',program.username)
	.exec()
	.then(function(user){
		user[0]
		.pushValue('follows', uidArr)
		.timeless()
		.save()
		.then(function(){
			console.log("followed");
			process.exit();
		})
	})
})
