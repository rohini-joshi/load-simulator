var fs           = require('fs');
var cluster      = require('cluster');
var when         = require('when');
var sequence     = require('when/sequence');
var program      = require('commander');

var Users        = require('./users.json');
var numUser      = Users.length;
var workers      = [];

program
  .version('0.0.2')
  .usage('[options]')
  .option('-c, --canChirp <n>', 'Specify no of users who can post chirp',parseInt)
  .option('-l, --login <n>', 'Specify no of users who can login',parseInt)
  .option('-r, --repeat <n>', 'specify number of times user should chirp',parseInt)
  .option('-s, --minChirp <n>', 'min delay in millisec for chirp creation',parseInt)
  .option('-l, --maxChirp <n>', 'max delay in millisec for chirp creation',parseInt)
  .option('-S, --minLikeCom <n>', 'min delay in millisec for chirp like and comment',parseInt)
  .option('-L, --maxLikeCom <n>', 'max delay in millisec for chirp like and comment',parseInt)
  .parse(process.argv);

program.canChirp   = typeof program.canChirp === 'undefined' ? 1 : program.canChirp;
program.login      = typeof program.login === 'undefined' ? 1 : program.login;
program.repeat     = typeof program.repeat === 'undefined' ? 1 : program.repeat;
program.minChirp   = typeof program.minChirp === 'undefined' ? 1000 : program.minChirp;
program.maxChirp   = typeof program.maxChirp === 'undefined' ? 9000 : program.maxChirp;
program.minLikeCom = typeof program.minLikeCom === 'undefined' ? 1000 : program.minLikeCom;
program.maxLikeCom = typeof program.maxLikeCom === 'undefined' ? 9000 : program.maxLikeCom;

// Get the user logged in and make his/her presence public
function loginUser(user){
  return AppMasterKey
  .User().login(user.email,user.password)
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

function likeChirp(chirp,timeInt,user){
  setTimeout(function() { //to like chirps after a random time interval
    if(chirp.get('upvotes') && chirp.get('upvotes').indexOf(userUid)>=0){
      AppMasterKey.Extension
      .execute('unlike', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        console.log("chirp after unlike",user.get('uid'));
      })
    }else{
      AppMasterKey.Extension
      .execute('like', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        console.log("chirp after like",user.get('uid'));
      })
    }
  },timeInt);
}

function comment(chirp,timeInt,user){
  setTimeout(function() { //to comment on chirp after a random time interval
    AppMasterKey.Extension.execute('addComment',{
      content: "dummy comment "+user.get('username'),
      chirp_uid: chirp.get('uid')
    })
    .then(function(){
      console.log("commented",user.get('uid'));
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
    var userId       = cluster.worker.id - 1;
    var chirpCount   = program.canChirp;
    var canLogin     = program.login;
    var repeat       = program.repeat;
    //Create dummy chirps
    if(cluster.worker.id <= canLogin){
      var AppMasterKey = require('./sdk_localhost');
      console.log("in if of can login");
      loginUser(Users[userId])
      .then(function(user){
        AppMasterKey.Class('tweet').Object
        .on('create',function(chirp){
          if(Users[userId].canAct === 1){
            sequence([likeChirp,comment],chirp,Math.floor(Math.random() * (program.maxLikeCom - program.minLikeCom + 1) + program.minLikeCom),user);
          }
        });
        
        if(cluster.worker.id <= chirpCount){
          for(var i=0;i<repeat;i++){
            console.log("in repeat after ",repeat);
            createChirp(Math.floor(Math.random() * (program.maxChirp - program.minChirp + 1) + program.minChirp));
          }
        }
  		})
    }
	}