var when         = require('when');
var sequence     = require('when/sequence');
var users        = require('./users.json');

var masterKey    = require('./sdk_localhost').masterKey
var AppMasterKey = require('./sdk_localhost').App;
		AppMasterKey = AppMasterKey
									 .setMasterKey(masterKey);

AppMasterKey.Class('built_io_application_user').Query()
.matches('username','^dummyuser')
.exec()
.then(function(dummyUsers){
	users.map(function(user,i){
		var uidArr = dummyUsers.filter(function(dummyUser){
			return dummyUser.get('username') !== user.extra_fields.username;
		}).map(function(filtereduser){
			return filtereduser.get('uid')
		})
		AppMasterKey.Class('built_io_application_user').Query()
		.where('username',user.extra_fields.username)
		.exec()
		.then(function(user){
			user[0]
			.pushValue('follows', uidArr)
			.timeless()
			.save()
			.then(function(){
				console.log("followed",i);
			})
		})
	})
})
