var express = require("express");
var mongoClient = require("mongodb").MongoClient;


var app = express();

app.get("/XPVPAPI/year/:year/month/:month", function(req, res) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(err) { return console.dir(err); }
		var yearFrom = parseInt(req.params.year);
		var monthFrom = parseInt(req.params.month);
		var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
		var monthTo = (monthFrom % 12) + 1
		db.collection("XPVictory").find({"Date" : 
			{$gte : new Date(yearFrom + "-" + monthFrom + "-" + "01"), 
			$lt : new Date(yearTo + "-" + monthTo + "-" + "01")}}).toArray(function(err, xpVictoryRecords) {
				res.send(JSON.stringify(xpVictoryRecords));
		});
	});
});

app.listen(8080, function() {
	console.log('Server running at on port 8080');
});
