var mongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
	var counter = 0;
	if(err) { console.dir(err); }
	var collection = db.collection("XPVictory");
	var xpVictoryDocuments = collection.find({});
	xpVictoryDocuments.each(function(err, item) {
		if(item != null) {
			collection.update({"_id" : new ObjectID(item._id)}, {$set : {"Date": new Date(item.Date)}});
		}
		console.log("Complete");
	})
});
	
