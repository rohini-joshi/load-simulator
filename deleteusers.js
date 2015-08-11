var when          = require('when');
var fs            = require('fs');
var sequence      = require('when/sequence');
var AppMasterKey  = require('./sdk');


function deleteUsers(){
	AppMasterKey.Class('built_io_application_user')
	.Query()
	.matches('username','^dummyuser')
	.exec()
	.then(function(dummyUsers){
		dummyUsers.map(function(user){
			AppMasterKey.Class('tweet').Query()
			.where('app_user_object_uid',user.get('uid'))
			.exec()
			.then(function(chirps){      //Delete the chirps of the user along with the comments
				return chirps.map(function(chirp){
					var chirp_uid = chirp.get('uid');
					chirp.delete()
					.then(function(){       //Delete the comments 
						return AppMasterKey.Class('comment').Query()
						.where('chirp_uid', chirp_uid)
						.delete()
					})
				})
			})
			.then(function(){
				AppMasterKey.Class('built_io_application_user').Query()
				.where('follows',user.get('uid'))
				.exec()
				.then(function(otherUsers){
					var arr =  otherUsers.map(function(otherUser){
						console.log("other user ",otherUser.get('uid'));
						return function(){
							return AppMasterKey.Class('built_io_application_user') //Remove the users from the follows
							.Object(otherUser.get('uid'))
							.pullValue('follows', user.get('uid'))
							.timeless()
							.save()
						}
					})
					return sequence(arr);
			  })
			})
    .then(function(){ //Delete the users
	    console.log("successfully deleted");
			user.delete()
		})
  })
})
}

deleteUsers()