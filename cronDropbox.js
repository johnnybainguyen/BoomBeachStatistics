var fs = require("fs");
var ocr = require("./ocr.js");
var async = require("async");
var CronJob = require("cron").CronJob;
var dropboxDirectory = "../Dropbox/Camera Uploads/";

var count = 0;
var job = new CronJob("* 0 * * * *", function() {
	console.log("Testing Cron Job");
	console.log(new Date());
	var extractedData = [];
	fs.readdir(dropboxDirectory, function(err, files) {
		async.eachSeries(files, function iteratee(item, callback) {
			ocr.bbOCR(dropboxDirectory + item, function(err, result) {
				extractedData = extractedData.concat(result);
				callback();
			});
		},
		function() {
			// Insert Data In Database and done!
			console.log(extractedData);
		});
					
	});
}, function() {},
true
);
