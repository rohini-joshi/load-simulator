var fs           = require('fs');
var cluster      = require('cluster');
var when         = require('when');
var sequence     = require('when/sequence');
var program      = require('commander');
var AppMasterKey = require('./sdk_localhost');

var Users        = require('./users.json');
var numUser      = Users.length;
var workers      = [];

program
  .version('0.0.2')
  .usage('[options]')
  .option('-c, --canChirp <n>', 'Specify no of users who can post chirp',parseInt)
  .option('-r, --repeat <n>', 'specify number of times user should chirp',parseInt)
  .option('-s, --minChirp <n>', 'min delay in millisec for chirp creation',parseInt)
  .option('-l, --maxChirp <n>', 'max delay in millisec for chirp creation',parseInt)
  .option('-S, --minLikeCom <n>', 'min delay in millisec for chirp like and comment',parseInt)
  .option('-L, --maxLikeCom <n>', 'max delay in millisec for chirp like and comment',parseInt)
  .parse(process.argv);

program.canChirp   = typeof program.canChirp === 'undefined' ? 1 : program.canChirp;
program.repeat     = typeof program.repeat === 'undefined' ? 1 : program.repeat;
program.minChirp   = typeof program.minChirp === 'undefined' ? 1000 : program.minChirp;
program.maxChirp   = typeof program.maxChirp === 'undefined' ? 9000 : program.maxChirp;
program.minLikeCom = typeof program.minLikeCom === 'undefined' ? 10000 : program.minLikeCom;
program.maxLikeCom = typeof program.maxLikeCom === 'undefined' ? 90000 : program.maxLikeCom;

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
  console.log("in chirp");
  setTimeout(function() { //to send chirps from dummy user after a random time interval
  console.log("in chirp settim");
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
        console.log("chirp after unlike",userUid);
      })
    }else{
      AppMasterKey.Extension
      .execute('like', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        console.log("chirp after like",userUid);
      })
    }
  },timeInt);
}

function comment(chirp,timeInt,userUid){
  setTimeout(function() { //to comment on chirp after a random time interval
    console.log("in comment", userUid, timeInt);
    AppMasterKey.Extension.execute('addComment',{
      content: "dummy comment",
      chirp_uid: chirp.get('uid')
    })
    .then(function(){
      console.log("commented",userUid);
    })
  },timeInt);
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
    console.log("time ",program.maxLikeCom,program.minLikeCom,program.minChirp,program.maxChirp,program.repeat,program.canChirp);
    //Create dummy chirps
    loginUser(Users[userId])
    .then(function(user){
      AppMasterKey.Class('tweet').Object
      .on('create',function(chirp){
        console.log("on chirp create",userId);
        if(Users[userId].canAct === 1){
          console.log("after create chirp can act");
          sequence([likeChirp,comment],chirp,Math.floor(Math.random() * (program.maxLikeCom - program.minLikeCom + 1) + program.minLikeCom),user.get('uid'));
        }
      });
      
      if(cluster.worker.id <= chirpCount){
          console.log("in repeat ",repeat);
        for(var i=0;i<repeat;i++){
          console.log("in repeat after ",repeat);
          createChirp(Math.floor(Math.random() * (program.maxChirp - program.minChirp + 1) + program.minChirp));
        }
      }
		})
	}