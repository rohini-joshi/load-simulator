var when          = require('when');
var sequence      = require('when/sequence');
var AppMasterKey  = require('./sdk');

AppMasterKey.Class('built_io_application_user').Query()
.matches('username','^dummyuser')
.exec()
.then(function(dummyUsers){
	var uidArr = dummyUsers.map(function(dummyUser){
		return dummyUser.get('uid');
	});
	AppMasterKey.Class('built_io_application_user') //
	.Object('blt53e2d3f6874cdf6b')
	.pushValue('follows', uidArr)
	.timeless()
	.save()
	.then(function(){
		console.log("followed");
	})
})
