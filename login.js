var fs            = require('fs');
var cluster       = require('cluster');
var when          = require('when');
var sequence      = require('when/sequence');
var AppMasterKey  = require('./sdk');
var events        = require('events');
var eventEmitter  = new events.EventEmitter();
var workers       = [];
var Users         = require('./users.json');

var numUser       = Users.length;
/*Get the user logged in and make his/her presence public*/

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
      process.send(chirp);
      //eventEmitter.emit('create',chirp)
    })
  },timeInt);
}

function likeChirp(chirp,timeInt,userUid){
  setTimeout(function() { //to like chirps after a random time interval
      if(chirp.upvotes && chirp.upvotes.indexOf(userUid)>=0){
        AppMasterKey.Extension
        .execute('unlike', {
          chirp_uid: chirp.uid
        })
        .then(function(tweet){
          console.log("chirp after unlike");
        })
      }else{
        AppMasterKey.Extension
        .execute('like', {
          chirp_uid: chirp.uid
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
      chirp_uid: chirp.uid
    })
    .then(function(){
      console.log("commented");
    })
  },timeInt + 10000);
}

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numUser; i++) {
    var worker = cluster.fork();
    worker.on('message',function(chirp){
      for(var i in workers){
        var singleWorker = workers[i];
        console.log("in on msg ");
        singleWorker.send(chirp);
      }
    });
    workers.push(worker);
  }
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });

} else {
    var userId     = cluster.worker.id - 1;
    var chirpCount = process.argv[2] || Users.length * 0.1; 
    var repeat     = process.argv[3] || 1;
    //Create dummy chirps
    //AppMasterKey.Class('tweet').Object

    loginUser(Users[userId])
    .then(function(user){
      process
      .on('message',function(chirp){
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