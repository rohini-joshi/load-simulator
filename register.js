var when          = require('when');
var sequence      = require('when/sequence');
var AppMasterKey  = require('./sdk_localhost');

//Register the Users
module.exports = registerUser = function (Users){
	return Users.map(function(user){
		return AppMasterKey.User().register(user.email,user.password,user.password_confirm,user.extra_fields);
	})
}

