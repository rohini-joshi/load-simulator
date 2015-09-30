var cluster      = require('cluster');
var when         = require('when');
var sequence     = require('when/sequence');
var program      = require('commander');
var fs           = require('fs');
var Users        = require('./users.json');
var numUser      = Users.length;
var workers      = [];
var failedWorkers = []; 
program
  .version('0.0.2')
  .usage('[options]')
  .option('-c, --canChirp <n>', 'Specify no of users who can post chirp',parseInt)
  .option('-t, --logintime <n>', 'To make users login at different time',parseInt)
  .option('-s, --start <n>', 'specify the start index for login',parseInt)
  .option('-e, --end <n>', 'specify the end index of login',parseInt)
  .parse(process.argv);

program.canChirp   = typeof program.canChirp === 'undefined' ? 0 : program.canChirp;
program.logintime  = typeof program.logintime === 'undefined' ? 1000 : program.logintime;
program.start      = typeof program.start === 'undefined' ? 0 : program.start;
program.end        = typeof program.end === 'undefined' ? 29 : program.end;

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
    console.log("err in fetching"+user.email, JSON.stringify(err,null,2));
    cluster.worker.kill()
  })
}

function createChirp(user, App){
  //to send chirps from dummy user after a random time interval
  var requestBody = {
    content: "dummy chirp " + user.get('username') + new Date(),
    images: []
  }
  App.Extension.execute('createTweet',requestBody)
  .then(function(chirp){
    console.log("chirp created", cluster.worker.id, chirpCreateCount++);
  },function(err){
    console.error("error in create tweet ",cluster.worker.id, JSON.stringify(err,null,2));
  })
}

function comment(chirp, user, App){
  //to comment on chirp after a random time interval
  App.Extension.execute('addComment',{
    content: "dummy comment "+user.get('username')+" "+chirp.get('uid') + " " + new Date(),
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
      })
    }else{
      App.Extension
      .execute('like', {
        chirp_uid: chirp.get('uid')
      })
      .then(function(tweet){
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
  })
}

if (cluster.isMaster) {
  // Fork workers.
  for (var i = program.start; i <= program.end; i++) {
    setTimeout(function(){
      cluster.fork();
    },program.logintime*(i-program.start));
  }
  cluster.on('exit', function(worker, code, signal) {
    failedWorkers.push(worker.process.pid)
    console.log('worker ' + worker.process.pid + ' died',failedWorkers.length);
    fs.writeFileSync('errorStats.json', JSON.stringify({'failed': failedWorkers.length},'\t',2))
  });
} else{
    /*Userid to make specified users to login*/
    var userId             = cluster.worker.id - 1 + program.start;
    var chirpCount         = program.canChirp;    
    var repeat             = program.repeat;
    var chirpCreateCount   = 1
    var commentCreateCount = 1
    var App                = require('./sdk_localhost').App
                            .persistSessionWith('MEMORY')
                            .enableRealtime();
    console.log("userid ", userId);
    
    loginUser(Users[userId], App)
    .then(function(user){
      console.log("logged in user",user.get('username'));

      App.Class('tweet').Object
      .on('create',function(chirp){
        if(cluster.worker.id <= chirpCount){
          sequence([comment], chirp, user, App);
        }
      });
      if(cluster.worker.id <= chirpCount){
          var interval = setInterval(function(){
            createChirp(user, App);
          }, program.logintime);

          setTimeout(function(){
            console.log("end of timeout")
            clearInterval(interval)
          }, 31000)

      }
		})
	}