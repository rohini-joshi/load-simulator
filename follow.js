var when          = require('when');
var sequence      = require('when/sequence');
var program       = require('commander');
var AppMasterKey  = require('./sdk_localhost');

program
	.version('0.0.2')
  .usage('[options]')
  .option('-u, --username <n>', 'Specify your chirp username')
  .parse(process.argv)

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
		})
	})
})
