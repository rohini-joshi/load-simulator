var when       = require('when');
var program    = require('commander');
var fs         = require('fs');
var App        = require('./sdk_localhost')
								 .enableRealtime();

program
  .version('0.0.2')
  .usage('[options]')
  .option('-a, --action <n>', 'Specify user action')
  .parse(process.argv);

program.action = typeof program.action === 'function' ? 'register' : program.action;

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
    console.log("err in fetching",err /*JSON.stringify(err,null,2)*/);
  })
}

function createChirp(){
	console.log("in create chirp");
	metrics.createChirp          = {}
	metrics.createChirp.SendTime = new Date();
	var requestBody = {
    content: "subject chirp" + builtUser.get('username'),
    images: []
  }
  return App.Extension.execute('createTweet',requestBody)
}

function comment(chirp){
	console.log("in create comment");
	metrics.onComment          = {}
	metrics.onComment.SendTime = new Date();
  return App.Extension.execute('addComment',{
    content: "subject comment "+builtUser.get('username'),
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


switch(program.action){
	case 'register':
		register();
		break;
	case 'login':
		login()
		.then(function(user){
			return createChirp();
		})
		.then(function(chirp){
			metrics.createChirp.ReceiveTime = new Date();
	  	metrics.createChirp.ElapsedTime = metrics.createChirp.ReceiveTime - metrics.createChirp.SendTime;
			return comment(chirp);
		},function(err){
			console.log("in chirp",err);
		})
		.then(function(comment){
			console.log("commented");
			metrics.onComment.ReceiveTime = new Date();
	  	metrics.onComment.ElapsedTime = metrics.onComment.ReceiveTime - metrics.onComment.SendTime;
			fs.writeFileSync('responseMetrics.json', JSON.stringify(metrics,'\t',2));
			process.exit();
		},function(err){
			console.log("in comment",err);
		})
		.catch(function(err){
      console.log("err after login ",err /*JSON.stringify(err,null,2)*/);
    })
    break;
  default: console.log("do something"); 	
}

