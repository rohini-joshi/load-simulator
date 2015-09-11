
var API_KEY       = 'blt74f856659dee3292';
var masterKey     = 'blt73275122067fbf70';
var API_URL       = 'code-bltdev.cloudthis.com'; 
var RT_API_URL    = 'realtime-bltdev.cloudthis.com';  
var APP_UID       = 'chirp';


var BuiltSDK      = require('built.io-browserify');
var App           = BuiltSDK.App(API_KEY,{
	host:API_URL
})
.setHost(API_URL)
.setProtocol('https')
.setRtHost(RT_API_URL)
.persistSessionWith(BuiltSDK.Session.MEMORY)

module.exports =  App  = App;