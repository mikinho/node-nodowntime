# nodowntime

Copyright (c) 2017 Michael Welter <michael@yammm.com>

## About

Simple module to gracefully restart worker processes one at a time to ensure no downtime.

To work correctly workers will need to handle disconnect message.

## Install

    $ npm install --save nodowntime

## Restart

kill -s HUP $MAINPID

## Usage

```javascript
const cluster = require("cluster");

if (cluster.isMaster) {
    // no downtime module
    return require("./lib/nodowntime");
}

// graceful exit if our master requests it
cluster.worker.on("disconnect", () => {
    async.series([
        (callback) => server.close(() => callback()),
        (callback) => mongoose.disconnect(() => callback())
    ], () => process.exit());
});
```

## Debug

NODE_DEBUG=nodowntime
