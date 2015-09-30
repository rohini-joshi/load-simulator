/*For dev localhost app*/

var API_KEY       = 'blt74f856659dee3292';
var masterKey     = 'blt73275122067fbf70';
var API_URL       = 'code-bltdev.cloudthis.com'; 
var RT_API_URL    = 'realtime-bltdev.cloudthis.com';  


/*For stag app*/

/*var API_KEY       = 'bltcf8a6a24d6fe1a52';
var API_URL       = 'stag-api.built.io'; 
var RT_API_URL    = 'stag-realtime.built.io';  
var masterKey     = 'blt123cd8608d77d061';*/

var APP_UID       = 'chirp';


var BuiltSDK      = require('built.io-browserify');
var App           = BuiltSDK.App(API_KEY,{
	host:API_URL
})
.setHost(API_URL)
.setProtocol('https')
.setRtHost(RT_API_URL)
.persistSessionWith(BuiltSDK.Session.MEMORY)

module.exports.App           = App;
module.exports.masterKey     = masterKey