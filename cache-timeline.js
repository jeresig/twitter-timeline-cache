var TwitterAPI = require("node-twitter-api");
var mongodb = require("mongodb");
var dotenv = require("dotenv");
dotenv.load();

mongodb.MongoClient.connect(process.env.MONGO_DB, function(err, db) {
    if (err) {
        console.error(err);
        return;
    }

    var twitter = new TwitterAPI({
        consumerKey: process.env.API_KEY,
        consumerSecret: process.env.API_SECRET
    });

    twitter.getTimeline("home", {
        count: 200,
        contributor_details: true
    }, process.env.ACCESS_TOKEN, process.env.ACCESS_SECRET,
    function(err, statuses) {
        if (err) {
            console.error(err);
            return;
        }

        // Insert the statueses in the right order (oldest -> newest)
        statuses = statuses.reverse();

        var cleanStatus = function(status) {
            status._id = status.id_str;
            delete status.id;
            delete status.id_str;

            status.created_at = new Date(status.created_at);

            if (status.user) {
                status.user.created_at = new Date(status.user.created_at);
            }

            for (var prop in status) {
                if (status[prop] === null) {
                    delete status[prop];
                }
            }
        };

        statuses.forEach(function(status) {
            cleanStatus(status);
            if (status.retweeted_status) {
                cleanStatus(status.retweeted_status);
            }
        });

        db.collection("statuses").insert(statuses, {
            continueOnError: true,
            safe: true
        }, function(err, docs) {
            process.exit(0);
        });
    });
});