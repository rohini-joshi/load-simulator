var API_KEY       = 'bltc6d796a5c0b1d728';
var masterKey     = 'blt1a3c140b7ec46182';
var API_URL       = 'code-bltdev.cloudthis.com'; 
var RT_API_URL    = 'realtime-bltdev.cloudthis.com';  
var APP_UID       = 'chirptest';


var BuiltSDK      = require('built.io-browserify');
var App           = BuiltSDK.App(API_KEY)
										.setHost(API_URL)
										.setProtocol('https')
										.setRtHost(RT_API_URL)
										.persistSessionWith(BuiltSDK.Session.LOCAL_STORAGE)
										.enableRealtime();

module.exports =  AppMasterKey  = App.setMasterKey(masterKey);