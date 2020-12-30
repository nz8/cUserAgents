# cUserAgents

cUserAgents is a Node.js module that provides streamlined, programmatic access to common web browser user agent strings. 

NOTE: Since the site this module depends on for data now has a form of DDOS protection that generates a landing page for every page, data can no longer be retrieved via http request. As such, the module no longer works as intended. In order to restore functionality, the entire module will need to be rewritten such that the site is accessed on a server via Selenium and data is extracted and made available through an API. The module itself will no longer do any HTML parsing or data extraction and will instead only query an API. 

A simplified version that determines the latest Chrome on Windows 10 user agent string is available here: https://github.com/nz8/ccUserAgent

# Usage:
Retrieving and printing the single most common user agent string: 
```javascript
let cUserAgents=require('./f');

let userAgents=new cUserAgents();
userAgents.initialize({},function(){
    console.log(userAgents.getUserAgent());
})
```
The object passed to initialize() is optional and used for configuration. This configuration object can contain the following properties with the following values: autoUpdate: 0 or 1, cache: 0 or 1, autoUpdateInterval: NUM OF DAYS, cachePath: ‘FULL PATH TO CACHE FILE’.



cUserAgents currently supports callbacks but not promises. This may change.
