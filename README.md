# Border Sync
## What is Border Sync?
Border Sync is a feature being added with the release of Border 1.11.
Border Sync allows you to sync your bookmarks, preferences, browsing history, themes, and plugins across all of your Border installations.
From your laptop to your phone, from Windows 96 to real Windows, from iOS to Android.
Access everything right there.

## Note: this is only the backend!
This is only the backend. If you would like a front-end, we have some Border Sync SDKs for you to use: [Border Sync Node SDK](https://github.com/Onofficiel/bordersync-node), [Border Sync JavaScript SDK](https://github.com/Onofficiel/bordersync-js), [Border Sync Python SDK](https://github.com/Onofficiel/bordersync-python)

## How to set up
To install all the required dependencies, you can just run `npm install`. To start the server, you can then run `npm start`.

## Configure to use HTTPS/SSL
To configure this, you'll need to edit `ssl.json` and set the `enable_ssl` key to `true`. You'll either need to put the certificate and key in the same directory at `ssl_cert.pem` and `ssl_key.pem`, or change the `certificate` and `key` properties to have the correct file path.
If you don't want to be able to access the API over http, make sure that the `force_ssl` key is also set to true.