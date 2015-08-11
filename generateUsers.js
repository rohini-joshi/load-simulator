var fs 					 = require('fs');
var registerUser = require('./register')

//To take the number of users from command line
var numUsers 		 = process.argv[2] || 1;

//To take a random name to append to the users while creating the users
var initialName  = process.argv[3] || 'raw';
var count        = process.argv[4] || 2;

var Users 			 = [];

//Generate Dummy Users
for(i=0; i< numUsers; i++){
	var user = {
		"email"           : "dummyuser"+ initialName + i + "@testraweng.com",
		"password"        : "passdummy",
		"password_confirm": "passdummy",
		"extra_fields"    :{
			"username": "dummyuser"+ initialName + i
		}
	};
	if(i<count){
		user['canAct'] = 1;
	}
	Users.push(user)
}

//Write the user objects into the json file
if(i == numUsers){
	fs.writeFileSync('users.json', JSON.stringify(Users,'\t',2))
	registerUser(Users)
}
