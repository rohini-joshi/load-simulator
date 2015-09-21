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
    console.error("err in fetching",cluster.worker.id, err, JSON.stringify(err,null,2));
    cluster.worker.kill()
  })
}

function createChirp(user, App){
  //to send chirps from dummy user after a random time interval
  // console.log("in create chirp ",new Date());
  var requestBody = {
    content: "dummy chirp" + user.get('username') + new Date(),
    images: []
  }
  // App.Extension.execute('createTweet',requestBody)
  mimicCreateChirpExt(requestBody, App)
  .then(function(chirp){
    console.log("chirp created", cluster.worker.id, chirpCreateCount++);
    /*if(Users[userId].canAct === 1){
    sequence([comment], chirp, user, App);
    }*/
  },function(err){
    console.log("err in chirps", cluster.worker.id, err)
  })

}

function mimicCreateChirpExt(requestBody, App){
  var deffered = when.defer()
  var comment_count = requestBody.comment_count; // By default the comment_count is set to undefined so all numeric operations fail
  var post_to       = requestBody.post_to;
  var poll_uid      = requestBody.poll_uid;
  var images        = requestBody.images;
  var authtoken     = App.getAuthToken();
  var content       = requestBody.content || "";
  var userUid       = null;
  var mentions      = [];
  var regex         = /(<([^>]+)>)/ig;
  content           = content.replace(regex, ""); // Code to remove html tags
  var channel       = null;

  if(comment_count === undefined)
    comment_count = 0;

  var usernames = (content.match(/@[a-zA-Z0-9_.]+/g)||[]).filter(function(a, b, c) {
    return (c.indexOf(a, b+1) == -1);
  }).map(function(username) { return username.slice(1, username.length) });
  
  var user_uids = [];
  
  getMentionedUsersUid(usernames)
  .then(function(mentioned){
    //Retrieve mentions
    mentions = mentioned;
    return mentions;
  })
  .then(function(){
    //Get current logged-in user
    return getUserSession(authtoken, App)
    .then(function(user) {
      userUid = user.get('uid')
      return userUid;
    })
  })
  .then(function(){
    if (post_to) {
      AppMasterKey.Class('channel')
      .Object(post_to)
      .fetch()
      .then(function(channelObj) {
        channel = channelObj;
        return AppMasterKey
          .Class('channel_type')
          .Object()
          .set('uid', channel.get('type')[0])
          .fetch()
      })
      .then(function(type){
        var type    = type.get('type');
        var canPost = channel.get('can_post') || [];
        var admins  = channel.get('admins') || [];
        var canRead = channel.get('members') || [];
        if(isAllowedToPost(userUid, canRead, canPost, admins, type)){
          var read  = channel.get('ACL').roles[0].uid;
          var write = channel.get('ACL').roles[1].uid;
          var ACL   = new Built.ACL();
          if(type == 'private'){
            ACL.setUserReadAccess('anonymous', false)
            ACL.setUserWriteAccess('anonymous', false)
            ACL.setUserDeleteAccess('anonymous', false)
            ACL.setPublicReadAccess(false)
            ACL.setRoleReadAccess(read, true)
            ACL.setRoleReadAccess(write, true)
          }else{
            ACL.setPublicReadAccess('true');
          }
          return ACL;
        }else{
          throw new Error("Access denined");
        }
      })
      .then(function(ACL){
        return constructTweet()
        .setACL(ACL)
        .save()
      })
      .then(function(tweet){
        return deffered.resolve(tweet.toJSON());
      })
      .catch(function(err){
        return deffered.reject("Access denined, You don't have sufficient permissions to post on this channel.");
      })
    }else{
      constructTweet().save()
      .then(function(tweet){
        return deffered.resolve(tweet.toJSON());
      })
    }
  })
  .catch(function(err){
    return deffered.reject(err);
  })

  //Constructs SDK object
  function constructTweet(){
    return App // App with current user's authtoken in it
      .Class('tweet')
      .Object({
        comment_count: comment_count,
        post_to : post_to,
        poll    : poll_uid,
        mentions: mentions,
        content : content,
        images  : images
      })
  }

  return deffered.promise
}

function getMentionedUsersUid(usernames) {
  var user_uids = [];
  if (usernames.length == 0) {
    return when(user_uids);
  } else {
    return App.Class('built_io_application_user')
    .Query()
    .containedIn('username', usernames)
    .only('uid')
    .exec()
    .then(function(objects) {
      user_uids = user_uids.concat(objects.map(function(obj) {
        return obj.get('uid')
      }));
      return user_uids;
    });
  }

}

function getUserSession(authtoken, App){
  var authApp = App.setAuthToken(authtoken);
  return authApp.User.getSession(true);
}

function comment(chirp, user, App){
  //to comment on chirp after a random time interval
  // console.log("in comment ",new Date());
  // App.Extension.execute('addComment',{
  //   content: "dummy comment "+user.get('username'),
  //   chirp_uid: chirp.uid
  // })
  mimicAddCommentExt({
    content: "dummy comment "+user.get('username')+" "+new Date(),
    chirp_uid: chirp.get('uid')
  }, App)
  .then(function(){
    console.log('commented', cluster.worker.id, commentCreateCount++)
  },function(err){
    console.error("error in add comment ",cluster.worker.id, JSON.stringify(err,null,2));
  })
}

function mimicAddCommentExt(requestBody, App) {
  var deffered  = when.defer()
  var chirp_uid = requestBody.chirp_uid;
  /*App.Class('tweet').Object(chirp_uid)
  .assign({
    comment_preview: [{
      content   : requestBody.content,
      chirp_uid : chirp_uid
    }],
  })
  .increment('comment_count', 1)
  .save()
  .then(function(tweet) {
    App.Class('comment').Object(tweet.get('comment_preview')[0])
    .fetch()
    .then(function(comment){
      return deffered.resolve(comment.toJSON());
    })
  },function(error){
    return deffered.reject(error);
  })
  return deffered.promise*/
      App 
      .Class('comment')
      .Object({
        content   : requestBody.content,
        chirp_uid : chirp_uid
      })
      .save()
      .then(function(comment){
        return deffered.resolve(comment.toJSON());
      },function(error){
        return deffered.reject(error);
      })
      return deffered.promise
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
        if(Users[userId].canAct === 1 && cluster.worker.id <= chirpCount){
          sequence([comment], chirp, user, App.setMasterKey('blt73275122067fbf70'));
        }
      });
      if(cluster.worker.id <= chirpCount){
        // for(var i=0;i<repeat;i++){
          //console.log("in repeat after ",repeat);
          var interval = setInterval(function(){
            // console.log(cluster.worker.id, chirpCount1++)
            createChirp(user, App.setMasterKey('blt73275122067fbf70'));
          }, program.logintime);

          setTimeout(function(){
            console.log("end of timeout")
            clearInterval(interval)
          }, 31000)

        // }
      }
		})
	}