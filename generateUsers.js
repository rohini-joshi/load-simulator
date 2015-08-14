var when         = require('when');
var fs 					 = require('fs');
var program      = require('commander');
var registerUser = require('./register');

var Users 			 = [];

program
  .version('0.0.2')
  .usage('[options]')
  .option('-u, --users <n>', 'Specify no of users to be generated',parseInt)
  .option('-n, --name <n>', 'specify name for dummy user')
  .option('-a, --actors <n>', 'specify no of users who can comment and like i.e set flag canAct to 1',parseInt)
  .parse(process.argv);

program.users  = typeof program.users === 'undefined' ? 1 : program.users;
program.name   = typeof program.name === 'function' ? 'raw' : program.name;
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
	if(i<program.actors){
		user['canAct'] = 1;
	}
	Users.push(user)
}

//Write the user objects into the json file
if(i == program.users){
	fs.writeFileSync('users.json', JSON.stringify(Users,'\t',2))
	var array = registerUser(Users);
	when.all(array).then(function(){
		console.log("all users registerd");
		process.exit();
	})
	
}
