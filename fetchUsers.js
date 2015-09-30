var when          = require('when');
var sequence      = require('when/sequence');
var fs 					  = require('fs');
var masterKey     = require('./sdk_localhost').masterKey
var AppMasterKey  = require('./sdk_localhost').App;
		AppMasterKey = AppMasterKey
									 .setMasterKey(masterKey);
var Users = []

var fetchUsers = module.exports.fetchUsers = function(){
	AppMasterKey.Class('built_io_application_user').Query()
	.matches('username','^dummyuser')
	.exec()
	.then(function(dummyUsers){
		dummyUsers.map(function(user){
			console.log("users ",user.get('username'))
			var localUser = {
				"email"           : user.get('email'),
				"password"        : "passdummy",
				"password_confirm": "passdummy",
				"extra_fields"    :{
					"username": user.get('username')
				}
			}
			Users.push(localUser)
		})
	})
	.then(function(){ 
	//Write all the dummy users into the user.json file
		fs.writeFileSync('users.json', JSON.stringify(Users,'\t',2))
	})
}

fetchUsers();
