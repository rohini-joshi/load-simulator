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
  .option('-t, --logintime <n>', 'To make users login at different time',parseInt)
  .option('-r, --repeat <n>', 'specify number of times user should chirp',parseInt)
  .parse(process.argv);

program.canChirp   = typeof program.canChirp === 'undefined' ? 1 : program.canChirp;
program.login      = typeof program.login === 'undefined' ? 1 : program.login;
program.logintime  = typeof program.logintime === 'undefined' ? 1000 : program.logintime;
program.repeat     = typeof program.repeat === 'undefined' ? 1 : program.repeat;

// Get the user logged in and make his/her presence public
function loginUser(user, App){
  var loggedinUser
  return App
  .User().login(user.email,user.password)
  .then(function(loggeduser){
      loggedinUser = loggeduser
      return App.User.getPresence()    
  })
  .then(function(presence){
    return presence
      .setPublic(true)
      .save() 
  })
  .then(function(){
    return when.all([
      fetchChannels(loggedinUser, App),
      fetchChirps(loggedinUser, App),
      fetchUsers(App),
      getChirpsCount(loggedinUser, App)
    ]);
  })
  .then(function(){
    return loggedinUser;
  })
  .catch(function(err){
    console.log("err in fetching", JSON.stringify(err,null,2));
    cluster.worker.kill()
  })
}

function createChirp(user, App){
  //to send chirps from dummy user after a random time interval
  // console.log("in create chirp ",new Date());
  var requestBody = {
    content: "dummy chirp" + user.get('username'),
    images: []
  }
  App.Extension.execute('createTweet',requestBody)
  .then(function(chirp){
    console.log("chirp created", cluster.worker.id, chirpCreateCount++);
    /*if(Users[userId].canAct === 1){
    sequence([comment], chirp, user, App);
    }*/
    //console.log("chirp created ",user.get('username'));
  },function(err){
    console.error("error in create tweet ",cluster.worker.id, JSON.stringify(err,null,2));
  })
}

function comment(chirp, user, App){
  //to comment on chirp after a random time interval
  // console.log("in comment ",new Date());
  App.Extension.execute('addComment',{
    content: "dummy comment "+user.get('username'),
    chirp_uid: chirp.get('uid')
  })
  .then(function(){
    console.log('commented', cluster.worker.id, commentCreateCount++)
  },function(err){
    console.error("error in add comment ",cluster.worker.id, JSON.stringify(err.entity,null,2));
  })
}

function likeChirp(chirp,timeInt,user, App){
  setTimeout(function() { //to like chirps after a random time interval
    if(chirp.get('upvotes') && chirp.get('upvotes').indexOf(userUid)>=0){
      App.Extension
      .execute('unlike', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        //console.log("chirp after unlike",user.get('uid'));
      })
    }else{
      App.Extension
      .execute('like', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
        //console.log("chirp after like",user.get('uid'));
      })
    }
  },timeInt);
}

//realtime scenario: fetch chirps and channels for user after login
function getChirpsCount(user, App){
  var mentionsQuery = App.Class('tweet').Query()
  .containedIn('mentions', user.get('uid'))
  .doesNotExists('post_to');

  var myChirpsQuery = App.Class('tweet').Query()
  .where('app_user_object_uid', user.get('uid'))
  .doesNotExists('post_to');

  return App.Class('tweet').Query()
  .or([mentionsQuery, myChirpsQuery])
  .count()
  .exec()
  .then(function(){
    //console.log("counts fetched");
  })
}

function fetchChannels(user, App){
  var self   = this;
  var queryChanneltype = App
  .Class('channel_type')
  .Query()
  .where('type', 'announcement');

  var query  = App.Class('channel').Query();
  var query1 = query.where('members',user.get('uid'));         //To fetch public and private channels
  var query2 = query.select('type', queryChanneltype, 'uid');  //To fetch all announcements

  return App.Class('channel')
  .Query()
  .include(['type'])
  .includeOwner()
  .or([query1,query2])
  .exec()
  .then(function(){
    //console.log("channels fetched");
  })
}

function fetchChirps(user, App){
  var mentionsQuery = App.Class('tweet').Query()
    .doesNotExists('post_to')
    .containedIn('mentions', user.get('uid'));

  var followsQuery = App.Class('tweet').Query()
    .doesNotExists('post_to')
    .containedIn('app_user_object_uid',user.get('uid'));

  // to add announcement chirps to wall.
  var queryChanneltype = App
    .Class('channel_type')
    .Query()
    .where('type', 'announcement');

  var queryChannel = App
      .Class('channel')
      .Query()
      .includeOwner()
      .select('type', queryChanneltype, 'uid');

  var announcement = App
    .Class('tweet')
    .Query()
    .includeOwner()
    .include(['comment_preview', 'post_to','poll'])
    .select('post_to', queryChannel, 'uid')
    .limit(12)
    .lessThan('updated_at',new Date())
    .descending('updated_at');

  var wallChirps = App.Class('tweet').Query()
    .includeOwner()
    .include(['comment_preview','post_to','poll'])
    .limit(12)
    .lessThan('updated_at', new Date())
    .descending('updated_at')
    .or([mentionsQuery, followsQuery, announcement])

  return wallChirps.exec()
  .then(function(){
    //console.log("chirps fetched");
  });
}

function fetchUsers(App){
  return App
  .Class('built_io_application_user')
  .Query()
  .only(['username','uid','email','avatar.url','avatar_random','_presence','follows','auth_data'])
  .limit(500)
  .exec()
  .then(function(){
    //console.log("users fetched");
  })
}

if (cluster.isMaster) {
  // Fork workers.
  var canLogin     = program.login;
  for (var i = 0; i < canLogin; i++) {
    setTimeout(function(){
      cluster.fork();
    },program.logintime*i);
  }
  cluster.on('exit', function(worker, code, signal) {
    //console.log('worker ' + worker.process.pid + ' died');
  });
} else{
    var userId       = cluster.worker.id - 1;
    var chirpCount   = program.canChirp;    
    var repeat       = program.repeat;
    var App          = require('./sdk_localhost')
                      .persistSessionWith('MEMORY')
                       .enableRealtime();
    var chirpCreateCount = 1
    var commentCreateCount = 1
    //console.log("login called ",new Date());
    //console.log("in if of can login");
    loginUser(Users[userId], App)
    .then(function(user){
      var chirpCount1 = 0
      console.log("logged in user",user.get('username'));
      App.Class('tweet').Object
      .on('create',function(chirp){
        if(Users[userId].canAct === 1  && cluster.worker.id <= chirpCount){
          // console.log("into comment ");
          sequence([comment], chirp, user, App);
        }
      });
      if(cluster.worker.id <= chirpCount){
        // for(var i=0;i<repeat;i++){
          console.log("in repeat after ", cluster.worker.id);
          var interval = setInterval(function(){
            // console.log(cluster.worker.id, chirpCount1++)
            createChirp(user, App);
          }, program.logintime);

          setTimeout(function(){
            console.log("end of timeout")
            clearInterval(interval)
          }, 21000)

        // }
      }
		})
	}