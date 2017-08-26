/**
 * Simple module to gracefully restart worker processes one at a 
 * time to ensure no downtime.
 *
 * @module nodowntime
 * @author Michael Welter <michael@yammm.com>
 * @copyright Copyright (c) 2017 Michael Welter <michael@yammm.com>
 * @license MIT
 * @example
 * const cluster = require("cluster");
 * 
 * if (cluster.isMaster) {
 *     // no downtime module
 *     return require("./lib/nodowntime");
 * }
 * ...
 * // graceful exit if our master requests it
 * cluster.worker.on("disconnect", () => {
 *     async.series([
 *         (callback) => server.close(() => callback()),
 *         (callback) => mongoose.disconnect(() => callback())
 *     ], () => process.exit());
 * }); 
*/

"use strict";

const cluster = require("cluster");
const os = require("os");
const util = require("util");
const debuglog = util.debuglog("nodowntime");
const noop = function() { };

// npm dependencies
const async = require("async");

// I must obey my master
if (!cluster.isMaster) {
    return;
}

// fork with callback once listening
var fork = function() {
    var callback = arguments[arguments.length - 1] || noop;
    var worker = cluster.fork();
    worker.once("listening", (address) => callback(null, address));
    return worker;
};

// gracefully restart every worker
var restart = function() {
    async.eachSeries(cluster.workers, (worker, callback) => {
        debuglog("restart", arguments);

        // ignore disconnected workers
        if (!worker.isConnected()) {
            return callback();
        }

        // ensure rolling restarts
        worker.on("exit", (code, signal) => callback());

        // disconnect work once our replacement is listening
        fork(() => worker.disconnect());
    });
};

// fork workers, one per cpu for maximum effectiveness
async.eachSeries(os.cpus(), fork);

// restart each worker
process.on("SIGHUP", restart);

// allow a worker to request a restart
cluster.on("message", function(worker, message, handle) {
    switch (message) {
        case "reload": {
            restart();
            break;
        }
    }
});

// sit, watch and optionally restart the worker
cluster.on("exit", function(worker, code, signal) {
    if (!worker.exitedAfterDisconnect && !signal) {
        fork();
    }
});
