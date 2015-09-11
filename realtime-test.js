var API_KEY       = 'blt74f856659dee3292';
var masterKey     = 'blt73275122067fbf70';
var API_URL       = 'code-bltdev.cloudthis.com'; 
var RT_API_URL    = 'realtime-bltdev.cloudthis.com';  
var APP_UID       = 'chirp';
var Chirpcount    = 1
var CommentCount  = 1
var BuiltSDK      = require('built.io-browserify');
var App           = BuiltSDK.App(API_KEY)
.setHost(API_URL)
.setProtocol('https')
.setRtHost(RT_API_URL)
.setAuthToken('blt397de4280f3f4fd8a68402b9')
.enableRealtime();

App.Class('tweet').Object.on('create', function (tweet) {
	console.log(Chirpcount++ ,"Chirp Elapsed Time",new Date() - new Date(tweet.get('created_at')))
})

App.Class('comment').Object.on('create', function (comment) {
	console.log(CommentCount++,"Comment Elapsed Time",new Date() - new Date(comment.get('created_at')))
})
