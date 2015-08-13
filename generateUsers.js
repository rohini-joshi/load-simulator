var fs 					 = require('fs');
var program      = require('commander');
var registerUser = require('./register')

var Users 		   = [];

program
	.version('0.0.2')
  .usage('[options]')
  .option('-u, --users <n>', 'Specify number of users to generate', parseInt)
  .option('-n, --name <n>', 'Speicfy a string to append to the username')
  .option('-a, --actors <n>', 'Specify the number of users who can comment/like', parseInt)
  .parse(process.argv);

// Set default values if not entered through terminal
program.users   = typeof program.users === 'undefined' ? 1 : program.users;
program.name    = typeof program.name === 'function' ? 'raw' : program.name;
program.actors  = typeof program.actors === 'undefined' ? 1 : program.actors;

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
	if(i < program.actors){
		user['canAct'] = 1;
	}
	Users.push(user)
}

//Write the user objects into the json file
if(i == program.users){
	fs.writeFileSync('users.json', JSON.stringify(Users,'\t',2))
	registerUser(Users)
}
