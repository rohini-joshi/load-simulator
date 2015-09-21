var when       = require('when');
var program    = require('commander');
var fs         = require('fs');
var App        = require('./sdk_localhost')
                .persistSessionWith('MEMORY')
								 .enableRealtime();
var masterKey  = 'blt73275122067fbf70';

program
  .version('0.0.2')
  .usage('[options]')
  .option('-a, --action <n>', 'Specify user action')
  .option('-c, --content <n>', 'Specify chirp and comment content')
  .parse(process.argv);

program.action = typeof program.action === 'function' ? 'register' : program.action;
program.content = typeof program.content === 'function' ? 'default' : program.content;

var user       = {
  "email": "loadtestsub@testraweng.com",
  "password": "loadtestsub",
  "password_confirm": "loadtestsub",
  "extra_fields": {
    "username": "loadtestsub"
  }
}

var metrics = {};
var builtUser;

function register(){
	console.log("in reg");
	metrics.register = {}
	metrics.register.SendTime = new Date();
	App.User().register(user.email,user.password,user.password_confirm,user.extra_fields)
	.then(function(){
	  metrics.register.ReceiveTime = new Date();
	  metrics.register.ElapsedTime = metrics.register.ReceiveTime - metrics.register.SendTime;
		console.log("sub registered");
	})
}

function login(){
	metrics.login       = {}
	metrics.onLoadFetch = {}
	metrics.login.SendTime = new Date();

	return App
  .User().login(user.email,user.password)
  .then(function(loggeduser){
  	App.Class('tweet').Object
    .on('create',function(chirp){
      if(chirp.get('content') === program.content+'loadtestsub'){
       	console.log(chirp.get('content'), new Date());
       	metrics.createChirp.ReceiveRealTime = new Date();
	  	  metrics.createChirp.ElapsedRealTime = metrics.createChirp.ReceiveRealTime - metrics.createChirp.SendTime;
			  fs.writeFileSync('responseMetrics.json', JSON.stringify(metrics,'\t',2));
      }
    });
  	console.log("after login");
		metrics.login.ReceiveTime = new Date();
	  metrics.login.ElapsedTime = metrics.login.ReceiveTime - metrics.login.SendTime;
  	builtUser = loggeduser;
    console.log("before return",builtUser.get('username'));
		return App.User.getPresence()
   })
  .then(function(presence){
  	console.log("in presence");
      return presence
        .setPublic(true)
        .save() 
  })
  .then(function(){
  	console.log("in when all");
		metrics.onLoadFetch.SendTime = new Date();
    return when.all([
      fetchChannels(builtUser, App),
      fetchChirps(builtUser, App),
      fetchUsers(App),
      getChirpsCount(builtUser, App)
    ]);
  })
  .then(function(){
  	metrics.onLoadFetch.ReceiveTime = new Date();
	  metrics.onLoadFetch.ElapsedTime = metrics.onLoadFetch.ReceiveTime - metrics.onLoadFetch.SendTime;
    return builtUser;
  })
  .catch(function(err){
    console.log("err in fetching",err, JSON.stringify(err,null,2));
  })
}

function createChirp(){
	console.log("in create chirp");
	metrics.createChirp          = {}
	metrics.createChirp.SendTime = new Date();
	var requestBody = {
    content: program.content + builtUser.get('username'),
    images: []
  }
  return App.Extension.execute('createTweet',requestBody)
}

function comment(chirp){
	console.log("in create comment");
	metrics.onComment          = {}
	metrics.onComment.SendTime = new Date();
  return App.Extension.execute('addComment',{
    content: program.content+builtUser.get('username'),
    chirp_uid: chirp.uid
  })
}

//realtime scenario: fetch chirps and channels for user after login
function getChirpsCount(user, App){
  console.log("in get count",user.get('username'));
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
    console.log("counts fetched");
  })
}

function fetchChannels(user, App){
  console.log("in fetch channel",user.get('username'));
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
    console.log("channels fetched");
  })
}

function fetchChirps(user, App){
  console.log("in get chirp",user.get('username'));
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
      console.log("chirps fetched");
    });
}

function fetchUsers(App){
  console.log("in get users");
  return App
  .Class('built_io_application_user')
  .Query()
  .only(['username','uid','email','avatar.url','avatar_random','_presence','follows','auth_data'])
  .limit(500)
  .exec()
  .then(function(){
    console.log("users fetched");
  })
}
function deleteChirps(){
  App = App.setMasterKey(masterKey);
  App.Class('built_io_application_user')
  .Query()
  .where('username',user.extra_fields.username)
  .exec()
  .then(function(dummyUser){
    return dummyUser.map(function(user){
      App.Class('tweet').Query()
      .where('app_user_object_uid',user.get('uid'))
      .exec()
      .then(function(chirps){      //Delete the chirps of the user along with the comments
        return chirps.map(function(chirp){
          var chirp_uid = chirp.get('uid');
          chirp.delete()
          .then(function(){       //Delete the comments 
            return App.Class('comment').Query()
            .where('chirp_uid', chirp_uid)
            .delete()
          })
        })
      })
      .then(function(){ //Delete the users
        console.log("successfully deleted");
       // user.delete()
      })
    })
  })
}


switch(program.action){
	case 'register':
		register();
		break;
	case 'follow':
		App = App.setMasterKey(masterKey);
		App.Class('built_io_application_user').Query()
		.matches('username','^dummyuser')
		.exec()
		.then(function(dummyUsers){
			//to follow all dummy users
			var dummyUidArr = dummyUsers.map(function(dummyUser){
				return dummyUser.get('uid');
			});

			App.Class('built_io_application_user').Query()
			.where('username',user.extra_fields.username)
			.exec()
			.then(function(user){
				user[0]
				.pushValue('follows', dummyUidArr)
				.timeless()
				.save()
				.then(function(){
					console.log("followed");
					process.exit();
				})
			})
		})
		break;
  case 'delete':
    deleteChirps();
    break;
	case 'login':
		login()
		.then(function(user){
			return createChirp();
		})
		.then(function(chirp){
			console.log("chirped");
			metrics.createChirp.ReceiveTime = new Date();
	  	metrics.createChirp.ElapsedTime = metrics.createChirp.ReceiveTime - metrics.createChirp.SendTime;
			return comment(chirp);
		},function(err){console.log("err in chirp ",err,JSON.stringify(err,null,2))})
		.then(function(comment){
			console.log("commented");
			metrics.onComment.ReceiveTime = new Date();
	  	metrics.onComment.ElapsedTime = metrics.onComment.ReceiveTime - metrics.onComment.SendTime;
			fs.writeFileSync('responseMetrics.json', JSON.stringify(metrics,'\t',2));
			//process.exit();
		},function(err){console.log("err in comment ",err,JSON.stringify(err,null,2))})
		.catch(function(err){
      console.log("err after login ",err, JSON.stringify(err,null,2));
			fs.writeFileSync('responseMetrics.json', JSON.stringify(metrics,'\t',2));
			//process.exit();
    })
    break;
    case 'realtime':
    login()
    .then(function(user){
      var Chirpcount    = 1
      var CommentCount  = 1
      App.Class('tweet').Object.on('create', function (tweet) {
        console.log(Chirpcount++ ,"Chirp Elapsed Time",new Date() - new Date(tweet.get('created_at')), tweet.get('uid'))
      })

      App.Class('comment').Object.on('create', function (comment) {
        console.log(CommentCount++,"Comment Elapsed Time",new Date() - new Date(comment.get('created_at')), comment.get('uid'), comment.get('chirp_uid')[0])
      })
    })
    .catch(function(err){
      console.log("err after login ",err, JSON.stringify(err,null,2));
      fs.writeFileSync('responseMetrics.json', JSON.stringify(metrics,'\t',2));
      //process.exit();
    })
    break;
  default: console.log("do something"); 	
}

