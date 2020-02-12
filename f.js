let fs=require('fs');
let r=require('request');
let cheerio=require('cheerio');
let username=require('username');
let os=require('os');


class cUserAgents{
    // Constructor, creates array for storing user agents and sets configuration defaults. By default,
    // auto updating is enabled with an interval of 30 days. Caching is also enabled and a default cache location
    // appropriate for the user's OS is automatically generated.
    constructor(){
        this.userAgents=[];
        this.options={
            autoUpdate:1,
            autoUpdateInterval:30,
            cache:1,
            cachePath:genCachePath()
        };
        this.other={};
    }
    // Initializes the class, takes a configuration object and callback that is called once the class has been initialized with data.
    // The configuration object can contain the following properties with the following values: autoUpdate: 0 or 1, cache: 0 or 1,
    // autoUpdateInterval: NUM OF DAYS. cachePath: 'FULL PATH TO CACHE FILE'
    initialize(o={},n){
        this.configure(o);
        // If caching is disabled, retrieve user agents from web page.
        if (!this.options.cache){
            retrieveUserAgents((x)=>{
                this.userAgents=x;
            n();
        });
        }
        else{
            let fp=genCachePath();
            if (!fs.existsSync(fp)){
                retrieveUserAgents((x)=>{
                    if (x!='error'){
                    fs.mkdirSync(fp.slice(0,fp.indexOf("cache.json")));
                    this.userAgents=x;
                    writeCache(fp,x);
                    n();
                }
            })
            }
            else{
                let cacheJSON=JSON.parse(fs.readFileSync(fp));
                if (!this.options.autoUpdate){
                    this.userAgents=cacheJSON.userAgents;
                    n();
                }
                let cd=new Date();
                let updateDate=new Date(cacheJSON.updateDate);
                if (cd-updateDate>this.options.autoUpdateInterval*24*3600*1000){
                    retrieveUserAgents((x)=>{
                        this.userAgents=x;
                    writeCache(fp,x);
                    n();
                })
                }
                else{
                    this.userAgents=cacheJSON.userAgents;
                    n();
                }
            }



        }


    }

    // Set class configuration options
    configure(o={}){
        for (let p in o){
            if ((p=='autoUpdate'||p=='cache')&&(o[p]==0||o[p]==1)){
                this.options[p]=o[p];
            }
            else if (p=='autoUpdateInterval'&&!isNaN(o[p])){
                this.options[p]=o[p];
            }
            else if (p=='cachePath'){
                this.options[p]=o[p];

            }
        }

    }

    // Work in progress method for retrieving a single user agent. Returns the most popular macOS Safari user agent string by default.
    // This will likely be expanded to allow users to retrieve the most or least popular user agent that fits certain criteria,
    // ie some combination of OS family, OS, OS version, browser, and browser version. Version may be another field to sort on,
    // though with a slightly more complex implementation.
    getUserAgent(o={}){
        if (Object.keys(o).length==0){
            if (this.userAgents.length==0){
                return 'Error: Not initialized';
            }
            else{
                console.log(this.userAgents);
                for (let i=0;i<this.userAgents.length;i++){
                    console.log(this.userAgents[i]);
                    if (this.userAgents[i]['b'][0]=='Safari'&&this.userAgents[i]['os'][1]=='macOS'){
                        return this.userAgents[i]['ua'];
                    }
                }
            }}


    }

    // Work in progress method for retrieving multiple user agents. Returns all user agent by default.
    getUserAgents(){
        return this.userAgents;
    }
}

// Generates a default cache file path appropriate for the user's operating system.
function genCachePath(){
    let currentUser=username.sync();
    let OS=os.platform();
    if (OS=='win32'){
        return 'C:/Users/'+currentUser+'/AppData/Local/cua/cache.json'
    }
    else if(OS=='linux'){
        return '/home/'+currentUser+'/cua/cache.json'
    }
    else if(OS=='darwin'){
        return '/Users/'+currentUser+'/cua/cache.json'
    }
}

// Caches user agents, saving an array of user agent objects along with the current date
function writeCache(p,ua){
    let cd=new Date();
    cd=cd.toISOString();
    let cacheJSON={
        updateDate:cd,
        userAgents:ua
    };
    fs.writeFileSync(p,JSON.stringify(cacheJSON));
}


// Parses a user agent, returning an object with operating system and browser information
// structured as follows {os:['OS FAMILY', 'OS NAME', 'OS VERSION' or [OS VERSION ARRAY IF MACOS] (NOTHING IF LINUX), 'WINDOWS NT VERSION IF WINDOWS'],
// b:['BROWSER NAME', [BROWSER VERSION ARRAY]]}
function parseUserAgent(ua){
    // Finds the first terminating character of some sequence that begins at index i, with terminating characters defined
    // as preceeding ';' or ')'  or ending the user agent string in mode 0 (m=0), with characters preceeding ' ' also
    // considered terminating in mode 1 (m=1)
    function tChar(m,i){
        for (let j=i;j<ua.length;j++){
            if (j==ua.length-1){
                return j;
            }
            else if (m==0&&(ua[j]==';'||ua[j]==')')){
                return j-1;
            }
            else if (m==1&&(ua[j]==';'||ua[j]==')'||ua[j]==' ')){
                return j-1;
            }
        }
    }
    // Parses a version string starting at index i, returning an array of
    // integers split on the version number separating character
    function parseVersion(i){
        let versionStr=ua.slice(i,tChar(1,i)+1);
        let separators=['.','_','-'];
        let separator='';
        for (let j=0;j<versionStr.length;j++){
            if (separators.indexOf(versionStr[j])!=-1){
                separator=versionStr[j];
                break;
            }
        }
        let versionArr=versionStr.split(separator);
        for (let j=0;j<versionArr.length;j++){
            versionArr[j]=parseInt(versionArr[j]);
        }
        return versionArr;
    }
    let osFamilies=['Windows','Macintosh','Linux'];
    let windowsNTMappings={
        '5.0':'2000',
        '5.1':'XP',
        '5.2':'XP',
        '6.0':'Vista',
        '6.1':'7',
        '6.2':'8',
        '6.3':'8.1',
        '10.0':'10'
    };

    let parsedUserAgent={
        os:[],
        b:[]
    };

    // Identify OS family
    let osIndex=0;
    for (let i=0;i<3;i++){
        if (ua.indexOf(osFamilies[i])!=-1){
            parsedUserAgent['os'][0]=osFamilies[i];
            osIndex=ua.indexOf(osFamilies[i]);
            break;
        }
    }
    // Return false if user agent does not contain a recognized OS family (likely mobile)
    if (!parsedUserAgent['os'][0]){
        return false;
    }

    // Determine OS information, OS specific
    if (parsedUserAgent['os'][0]=='Windows'){
        parsedUserAgent['os'][1]='Windows'
        let ntV=ua.slice(osIndex+11,tChar(0,osIndex+11)+1);
        parsedUserAgent['os'][2]=windowsNTMappings[ntV];
        parsedUserAgent['os'][3]=ntV;
    }
    else if(parsedUserAgent['os'][0]=='Macintosh'){
        let macosVBIndex;
        for (let i=osIndex+15;i<ua.length;i++){
            if (!isNaN(ua[i])&&ua[i]!=' '){
                macosVBIndex=i;
                break;
            }
        }
        parsedUserAgent['os'][1]='macOS';
        parsedUserAgent['os'][2]=parseVersion(macosVBIndex);
    }
    else{
        parsedUserAgent['os'][1]='Linux';
    }

    // Sequence of if/else statements that identifies the browser and parses its version string.
    // Utilizes the fact certain strings are exclusive to certain browsers. For instance, 'Chrome'
    // is present in the user agent strings of multiple browsers, but browsers other than Chrome contain
    // strings not present in Chrome's user agent string.
    if (ua.indexOf('Firefox/')!=-1){
        parsedUserAgent['b'][0]='Firefox';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('Firefox/')+8);
    }
    else if (ua.indexOf('Edge/')!=-1){
        parsedUserAgent['b'][0]='Edge';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('Edge/')+5)
    }
    else if(ua.indexOf('OPR/')!=-1){
        parsedUserAgent['b'][0]='Opera';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('OPR/')+4);
    }
    else if(ua.indexOf('Chromium/')!=-1){
        parsedUserAgent['b'][0]='Chromium';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('Chromium/')+9);
    }
    else if(ua.indexOf('YaBrowser/')!=-1){
        parsedUserAgent['b'][0]='Yandex Browser';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('YaBrowser/')+10);
    }
    else if(ua.indexOf('Chrome/')!=-1){
        parsedUserAgent['b'][0]='Chrome';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('Chrome/')+7);
    }
    else if(ua.indexOf('Safari/')!=-1){
        parsedUserAgent['b'][0]='Safari';
        parsedUserAgent['b'][1]=parseVersion(ua.indexOf('Version/')+8);
    }
    else{
        parsedUserAgent['b'][0]='Unrecognized';
        parsedUserAgent['b'][1]='Unrecognized';
    }

    return parsedUserAgent;



}

// Retrieves an up to date list of common user agents from a blog that collects
// user agent statistics for its visitors. Takes a single parameter callback
// that receives an array of user agent objects, each of which is structured as
// follows {ua: 'USER AGENT STRING', p: POPULARITY (PERCENT OF ALL VISITORS WITH THIS USER AGENT), os: ['OS FAMILY',
// 'OS', 'OS VERSION' or [OS VERSION ARRAY IF MACOS] (NOTHING IF LINUX), 'WINDOWS NT VERSION IF WINDOWS'], b:'BROWSER NAME', [BROWSER VERSION ARRAY]]}
function retrieveUserAgents(n){
    let requestObj={
        url:'https://techblog.willshouse.com/2012/01/03/most-common-user-agents/',
        headers:{
            'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'
        }
    };
    r(requestObj,function(e,r,b){
        // Call callback with 'error' as parameter if request error encountered or if requested page
        // does not contain user agent information
        if (e||b.indexOf('Mozilla/')==-1){
            console.log('Error: Failed to retrieve user agents from web page');
            n('error');
        }
        else{
            let $=cheerio.load(b);
            let userAgents=[];
            $('tr').each(function(){
                let userAgent=$(this).find('.useragent').text().trim();
                let parsedUserAgent=parseUserAgent(userAgent);
                if (parsedUserAgent){
                    userAgents.push({
                        ua:$(this).find('.useragent').text().trim(),
                        p:parseFloat($(this).find('.percent').text().trim()),
                        os:parsedUserAgent['os'],
                        b:parsedUserAgent['b']
                    });}
            });
            n(userAgents);
        }
    })
}

module.exports=cUserAgents