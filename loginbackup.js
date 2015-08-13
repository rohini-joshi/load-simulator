var fs           = require('fs');
var cluster      = require('cluster');
var when         = require('when');
var sequence     = require('when/sequence');
var program      = require('commander');
var AppMasterKey = require('./sdk');
var Users        = require('./users.json');

var numUser      = Users.length;
var workers      = [];

program
  .version('0.0.2')
  .usage('[options]')
  .option('-c, --canChirp <n>', 'Specify the number of users hwo can chirp')
  .option('-r, --repeat <n>', 'Specify the number of times a user should chirp')
  .parse(process.argv)

program.canChirp = typeof program.canChirp === 'undefined' ? 1 : program.canChirp;
program.repeat   = typeof program.repeat === 'undefined' ? 1 : program.repeat;

// Get the user logged in and make his/her presence public
function loginUser(user){
  return AppMasterKey.User().login(user.email,user.password)
  .then(function(data){
     AppMasterKey.User.getPresence()
    .then(function(presence){
      presence
      .setPublic(true)
      .save();
      return data;
    });
    return data;
  })
}

function createChirp(timeInt){
  setTimeout(function() { //to send chirps from dummy user after a random time interval
    var requestBody = {
      content: "dummy chirp",
      images: []
    }
    AppMasterKey.Extension.execute('createTweet',requestBody)
    .then(function(chirp){
      console.log("chirp created");
    })
  },timeInt);
}

function likeChirp(chirp,timeInt,userUid){
  setTimeout(function() { //to like chirps after a random time interval
    if(chirp.get('upvotes') && chirp.get('upvotes').indexOf(userUid)>=0){
      AppMasterKey.Extension
      .execute('unlike', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        console.log("chirp after unlike");
      })
    }else{
      AppMasterKey.Extension
      .execute('like', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        console.log("chirp after like");
      })
    }
  },timeInt);
}

function comment(chirp,timeInt){
  setTimeout(function() { //to comment on chirp after a random time interval
    console.log("in comment");
    AppMasterKey.Extension.execute('addComment',{
      content: "dummy comment",
      chirp_uid: chirp.get('uid')
    })
    .then(function(){
      console.log("commented");
    })
  },timeInt + 10000);
}

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numUser; i++) {
    cluster.fork();
  }
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else{
    var userId     = cluster.worker.id - 1;
    var chirpCount = program.canChirp; 
    var repeat     = program.repeat;

    //Create dummy chirps
    loginUser(Users[userId])
    .then(function(user){
      AppMasterKey.Class('tweet').Object
      .on('create',function(chirp){
        console.log("on chirp create",userId);
        if(Users[userId].canAct === 1){
          console.log("after create chirp can act");
          sequence([likeChirp,comment],chirp,Math.floor(Math.random() * (9000 - 1000 + 1) + 1000),user.get('uid'));
        }
      });
      
      if(cluster.worker.id <= chirpCount){
        for(var i=0;i<repeat;i++){
          createChirp(Math.floor(Math.random() * (9000 - 1000 + 1) + 1000));
        }
      }
		})
	}