// Import modules for hosting backend
let http = require('http');
let https = require('https');
// Import filesystem access
let fs = require('fs');
// Configuration files
let _ssl = require('./ssl');
var unac = [
    'a','b','c','d','e','f','g','h','i','j','k','l',
    'm','n','o','p','q','r','s','t','u','v','w','x',
    'y','z','0','1','2','3','4','5','6','7','8','9',
    '-','_'
];
// Encryption, hashing, other crypto, etc.
let md5 = require('md5');
let AES = require("crypto-js/aes");

function randomHex() {
    var hexes = ['A','B','C','D','E','F','0','1','2','3','4','5','6','7','8','9'];
    return hexes[Math.floor(Math.random()*hexes.length)]
}

function randomUUID() {
    var out = "";
    for(var i = 0; i < 8; i++) {
        out += randomHex();
    }
    out += "-";
    for(var i = 0; i < 4; i++) {
        out += randomHex();
    }
    out += "-";
    for(var i = 0; i < 4; i++) {
        out += randomHex();
    }
    out += "-";
    for(var i = 0; i < 4; i++) {
        out += randomHex();
    }
    out += "-";
    for(var i = 0; i < 12; i++) {
        out += randomHex();
    }
    return out;
}

// Create user tokens
var tokens = require('./tokens.json')||{};

function createUserToken({ user, platform, user_agent }) {
    user=user.toLowerCase();
    var tok = {
        expires: false,
        expiration_date: null,
        platform: platform,
        user_agent: user_agent,
        invalid: false,
        state: 'valid_token',
        last_login: Date.now(),
        type: 'user',
        birthday: Date.now(),
        permissions: [
            'manage_user_tokens',
            'view_oauth_tokens',
            'view_signed_in_devices',
            'manage_oauth_tokens',
            'read_browsing_history',
            'modify_browsing_history',
            'read_bookmarks',
            'modify_bookmarks',
            'modify_preferences',
            'read_blugins_themes',
            'modify_blugins_themes',
            'modify_security_details',
            'modify_privacy_controls',
            'verify_email_address',
            'read_email_address',
            'edit_email_address'
        ]
    };
    var tk_id = btoa(`${Date.now()}_${randomUUID().replaceAll('-','')}`);
    if(!tokens[user]) {
        tokens[user] = {};
    }
    tokens[user][tk_id] = tok;
    fs.writeFileSync('./tokens.json',JSON.stringify(tokens));
    return tk_id;
}

function invalidateToken({ user, token, state }) {
    if(!tokens[user]) { return; }
    if(!tokens[user][token]) { return; }
    tokens[user][token].invalid = true;
    tokens[user][token].state = state;
    fs.writeFileSync('./tokens.json',JSON.stringify(tokens));
}

try {
    // Check to see if 'udata' (user data directory) exists
    // if it doesn't, it will throw an error
    fs.statSync('users');
} catch {
    // Make the 'udata' directory if it doesn't exist
    fs.mkdirSync('users');
}

function fsexists(path) {
    try {
        fs.statSync(path);
    } catch (error) {
        return false;
    }
    return true;
}


// Stores the SSL and non-SSL server
var https_server;
var http_server;
if(_ssl.enable_ssl) {
    https_server = https.createServer(
        {
            key: fs.readFileSync(_ssl.key),
            cert: fs.readFileSync(_ssl.certificate)
        },
        callback
    );
    https_server.listen(443);
}

http_server = http.createServer(
    // If SSL enabled and in Force SSL mode
    (_ssl.enable_ssl && ssl_.force_ssl) ? upgrade_cb : callback
);

http_server.listen(80);

// Callback to endpoint
function callback(req,res) {
    var url = new URL('https://border.sync'+req.url);
    var q = url.searchParams;
    // 'qxw' just looks nice lol
    var qxw = url.pathname;
    if(qxw === '/') {
        res.writeHead(200,{
            'content-type': 'text/plain',
            'access-control-allow-origin': '*'
        });
        res.write('Border Sync v1.0');
        res.end();
    } else if(qxw === '/user/devices') {
        // Validation and security measures
        if(!q.get('user')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'a user must be specified'
            }));
            return res.end();
        }
        for(var i = 0; i < q.get('user').length; i++) {
            if(
                !unac.includes(
                    q.get('user')[i].toLowerCase()
                )
            ) {
                res.writeHead(400,{
                    'content-type': 'text/plain',
                    'access-control-allow-origin': '*'
                });
                res.write(JSON.stringify({
                    success: false,
                    error: 'the username format is invalid'
                }));
                return res.end();
            }
        }
        if(!fsexists(`./users/${q.get('user').toLowerCase()}`)) {
            res.writeHead(404,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the user specified does not exist'
            }));
            return res.end();
        }
        if(!q.get('tkn')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'a token must be specified'
            }));
            return res.end();
        }
        if(!tokens[q.get('user').toLowerCase()][q.get('tkn')]) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified is does not exist'
            }));
            return res.end();
        }
        if(tokens[q.get('user').toLowerCase()][q.get('tkn')].state==='deactivated') {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified was deactivated'
            }));
            return res.end();
        }
        if(tokens[q.get('user').toLowerCase()][q.get('tkn')].state==='signed_out') {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified was signed out'
            }));
            return res.end();
        }
        if(tokens[q.get('user').toLowerCase()][q.get('tkn')].invalid) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified has been invalidated'
            }));
            return res.end();
        }
        var tkn = tokens[q.get('user').toLowerCase()][q.get('tkn')];
        if(!tkn.permissions.includes('view_signed_in_devices')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified does not have the "view_signed_in_devices" permissions'
            }));
            return res.end();
        }
        // API source
        var devices = [];
        Object.values(tokens[q.get('user')]).forEach(device => {
            if(device.type != 'user') { return; }
            if(device.state != 'valid_token') { return; }
            devices.push({
                last_login: device.last_login,
                user_agent: device.user_agent,
                platform: device.platform,
                initial_login: device.birthday
            });
        });
        res.writeHead(200,{
            'content-type': 'text/plain',
            'access-control-allow-origin': '*'
        });
        res.write(JSON.stringify(devices));
        res.end();
    } else if(qxw === '/user/kick') {
        // Validation and security measures
        if(!q.get('user')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'a user must be specified'
            }));
            return res.end();
        }
        for(var i = 0; i < q.get('user').length; i++) {
            if(
                !unac.includes(
                    q.get('user')[i].toLowerCase()
                )
            ) {
                res.writeHead(400,{
                    'content-type': 'text/plain',
                    'access-control-allow-origin': '*'
                });
                res.write(JSON.stringify({
                    success: false,
                    error: 'the username format is invalid'
                }));
                return res.end();
            }
        }
        if(!fsexists(`./users/${q.get('user').toLowerCase()}`)) {
            res.writeHead(404,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the user specified does not exist'
            }));
            return res.end();
        }
        if(!q.get('tkn')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'a token must be specified'
            }));
            return res.end();
        }
        if(!tokens[q.get('user').toLowerCase()][q.get('tkn')]) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified is does not exist'
            }));
            return res.end();
        }
        if(tokens[q.get('user').toLowerCase()][q.get('tkn')].state==='deactivated') {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified was deactivated'
            }));
            return res.end();
        }
        if(tokens[q.get('user').toLowerCase()][q.get('tkn')].state==='signed_out') {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified was signed out'
            }));
            return res.end();
        }
        if(tokens[q.get('user').toLowerCase()][q.get('tkn')].invalid) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified has been invalidated'
            }));
            return res.end();
        }
        var tkn = tokens[q.get('user').toLowerCase()][q.get('tkn')];
        if(!tkn.permissions.includes('view_signed_in_devices')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified does not have the "view_signed_in_devices" permissions'
            }));
            return res.end();
        }
        if(!tkn.permissions.includes('manage_user_tokens')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the token specified does not have the "manage_user_tokens" permissions'
            }));
            return res.end();
        }
        // API source
        if(!q.get('id')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the device to kick was not specified'
            }));
            return res.end();
        }
        var devices = [];
        Object.keys(tokens[q.get('user')]).forEach(key => {
            var device = tokens[q.get('user')][key];
            if(device.type != 'user') { return; }
            if(device.state != 'valid_token') { return; }
            devices.push({
                last_login: device.last_login,
                user_agent: device.user_agent,
                platform: device.platform,
                initial_login: device.birthday,
                key: key
            });
        });
        if(!devices[q.get('id')]) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the device id specified is invalid'
            }));
            return res.end();
        }
        invalidateToken({
            user: q.get('user'),
            token: devices[q.get('id')].key,
            state: 'deactivated'
        });
        res.writeHead(200,{
            'content-type': 'text/plain',
            'access-control-allow-origin': '*'
        });
        res.write(JSON.stringify({
            success: true
        }));
        return res.end();
    } else if(qxw === '/user/token') {
        if(!q.get('user')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'a user must be specified'
            }));
            return res.end();
        }
        if(!q.get('psw')) {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'a password must be specified'
            }));
            return res.end();
        }
        for(var i = 0; i < q.get('user').length; i++) {
            if(
                !unac.includes(
                    q.get('user')[i].toLowerCase()
                )
            ) {
                res.writeHead(400,{
                    'content-type': 'text/plain',
                    'access-control-allow-origin': '*'
                });
                res.write(JSON.stringify({
                    success: false,
                    error: 'the username format is invalid'
                }));
                return res.end();
            }
        }
        if(!fsexists(`./users/${q.get('user').toLowerCase()}`)) {
            res.writeHead(404,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'the user specified does not exist'
            }));
            return res.end();
        }
        var tkn = fs.readFileSync(`./users/${q.get('user').toLowerCase()}/hash`,{
            encoding: 'utf-8'
        });
        if(md5(q.get('psw')) === tkn) {
            res.writeHead(200,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                token: createUserToken({
                    user: q.get('user').toLowerCase(),
                    platform: q.get('platform'),
                    user_agent: req.headers['user-agent']
                }),
                success: true
            }));
            res.end();
        } else {
            res.writeHead(400,{
                'content-type': 'text/plain',
                'access-control-allow-origin': '*'
            });
            res.write(JSON.stringify({
                success: false,
                error: 'password is incorrect'
            }));
            res.end();
        }
    } else {
        // endpoints to-do
        res.writeHead(404,{
            'content-type': 'text/plain',
            'access-control-allow-origin': '*'
        });
        res.write('404 No such endpoint');
        res.end();
    }
}

function upgrade_cb(req, res) {
    res.writeHead(308,{
        'content-type': 'text/plain',
        'access-control-allow-origin': '*',
        'location': `https://${req.headers['Host']}${req.url}`
    });
    res.write('308 upgrade to https');
    res.end();
}