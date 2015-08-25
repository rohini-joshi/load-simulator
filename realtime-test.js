var API_KEY       = 'blt74f856659dee3292';
var masterKey     = 'blt73275122067fbf70';
var API_URL       = 'code-bltdev.cloudthis.com'; 
var RT_API_URL    = 'realtime-bltdev.cloudthis.com';  
var APP_UID       = 'chirp';
var Chirpcount  = 0
var CommentCount  = 0

var App           = Built.App(API_KEY)
.setHost(API_URL)
.setProtocol('https')
.setRtHost(RT_API_URL)
.setAuthToken('blt6bfa850ee9c5471d5c855842')
.enableRealtime();

App.Class('tweet').Object.on('create', function (tweet) {
console.log(Chirpcount++)
console.log("Aavi gayo Chirpva", tweet.get('uid'), tweet.get('content'))
})

App.Class('comment').Object.on('create', function (tweet) {
console.log(CommentCount++)
console.log("Commentva", tweet.get('uid'), tweet.get('content'))
})
