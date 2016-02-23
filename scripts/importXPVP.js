var fileName = "/XPVPDecember2015.csv";
var date = new Date("December 2015");
var mongodb = require("mongodb").MongoClient;
var fs = require('fs');
var readLine = require("readline");

var rd = readLine.createInterface({
	input: fs.createReadStream(__dirname + fileName),
	output: process.stdout,
	terminal: false
});
var counter = 0;
rd.on('line', function(line) {
	var data = [];
	var lineArray = line.split(",");
	var xp = parseInt(lineArray[0]);
	for(var i = 1; i < lineArray.length; ++i) {
		if(lineArray[i] != "") {
			data.push({"username":"", "XPLevel":xp, "VictoryPoint": parseInt(lineArray[i]), "Date": date});
		}
	}	
	
	mongodb.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(err) { return console.dir(err); } 
		db.collection("XPVictory").insert(data);
		console.log("Insertion Complete");
	});	
});
// HORRIBLE BUG. WONT READ LAST LINE OF CODE.  DONT USE SCRIPT ANYMORE
// IF YOU DO USE IT, ADD NEW LINE AT THE END OF CSV FILE
