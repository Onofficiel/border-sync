// Import modules for hosting backend
let http = require('http');
let https = require('https');
// Import filesystem access
let fs = require('fs');
// Configuration files
let _ssl = require('./ssl');
// Encryption, hashing, other crypto, etc.
let md5 = require('md5');
let AES = require("crypto-js/aes");

try {
    // Check to see if 'udata' (user data directory) exists
    // if it doesn't, it will throw an error
    fs.statSync('udata');
} catch {
    // Make the 'udata' directory if it doesn't exist
    fs.mkdirSync('udata');
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
    } else {
        // endpoints to-do
        res.writeHead(404,{
            'content-type': 'text/plain',
            'access-control-allow-origin': '*'
        });
        res.write('404 endpoint not found');
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