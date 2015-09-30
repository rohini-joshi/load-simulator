var program      = require('commander')
var when         = require('when')
var fs           = require('fs')
var masterKey    = require('./sdk_localhost').masterKey
var AppMasterKey = require('./sdk_localhost').App
		AppMasterKey = AppMasterKey
									 .setMasterKey(masterKey)
var Users  = []

program
	.version('0.0.2')
  .usage('[options]')
  .option('-u, --users <n>', 'Specify number of users to generate', parseInt)
  .option('-n, --name <n>', 'Speicfy a string to append to the username')
  .parse(process.argv);

// Set default values if not entered through terminal
program.users  = typeof program.users === 'undefined' ? 1 : program.users
program.name   = typeof program.name === 'function' ? 'raw' : program.name

//Generate Dummy Users
for(i=0; i< program.users; i++){
	var user = {
		"email"           : "dummyuser"+ program.name + i + "@testraweng.com",
		"password"        : "passdummy",
		"password_confirm": "passdummy",
		"extra_fields"    :{
			"username": "dummyuser"+ program.name + i
		}
	};
	Users.push(user)
}
if(Users.length == program.users){
	//To register the user on built
	var array = Users.map(function(user){
		return AppMasterKey.User().register(user.email,user.password,user.password_confirm,user.extra_fields)
	})
	when.all(array).then(function(){
	  console.log("all users registerd")
	  //To make all dummy users follow each other
		dummyUserFollow()
	})
}

var dummyUserFollow = function(){
	AppMasterKey.Class('built_io_application_user').Query()
	.matches('username','^dummyuser')
	.exec()
	.then(function(users){
		Users.map(function(user,i){
			var uidArr = users.filter(function(dummyUser){
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
					console.log("followed",i)
				})
			})
		})
	})
}
