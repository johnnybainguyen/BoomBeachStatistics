var fs = require("fs");
var path = require("path");
var express = require('express');
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
var app = express();
var async = require("async");
var fs = require("fs");
var http = require('http').Server(app).listen(8080);
var io = require("socket.io")(http);
var ocr = require("./ocr.js");
var multer = require("multer");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());

var MINLEVEL = 12;
var MAXLEVEL = 65;
var MAXVP = 3000;
var LOWLEVELRATIO = 5;
var currentDate = new Date();
var RECENT_RESULT_LIMIT = 1000;
var vpCalculatorLimit = 5000;
var dropboxDirectory = "../Dropbox/Camera Uploads/";
var storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, "../uploads/")
	},
	filename: function(req, file, cb) {
		cb(null, "image_" + Date.now() + ".png");
	}
	});
var upload = multer({storage: storage});
var myIP = {ip: "98.148.236.45"};
//var myIP = {ip:"1.1.1.1"};

// Conr Script for my personal use
setInterval(function() {
	fs.readdir(dropboxDirectory, function(err, files) {
		async.eachLimit(files, 3, function iteratee(item, cb) {
			ocr.bbOCR(dropboxDirectory + item, function(err, result) {
				insertUserCollection(myIP, result);
				cb();
			});
		},
		function() {
		});
					
	});
}, 1000 * 60 * 10);

setInterval(function() { decrementActiveTFTime()}, 1000);
//http.listen(8080, '127.0.0.1');
// Views
app.get("/", function(req, res) {
	getMonthCount(function(err, count) {
		res.render(__dirname + "/views/index.ejs", {"count":count});
	});
});

app.get("/hopper", function(req, res) {
	getAllActiveTF(function(err, activeTF) {
		res.render(__dirname + "/views/hopper.ejs", {"activeTF":activeTF, parseMilliseconds:parseMilliseconds, padNumber:padNumber});
	});
});

app.get("/tf-list", function(req, res) {
	getTFList(function(err, tfList) {
		res.render(__dirname + "/views/tf-list.ejs", {"tfList": tfList});
	});
});

app.post('/tf-list', function(req, res) {
	findTag(req.body.tfTag, function (err, recordExist) {
		if(recordExist) {

			res.redirect("/tf-list");
		} else {

//function insertTF(tfTag, tfPW, tfName, tfDescription, forcePoints, numberOfMembers, maxMembers, entryRequirement, currentlyRecruiting) {
			insertTF(req.body.tfTag, req.body.tfPW, req.body.tfName, req.body.tfDescription, req.body.forcePoints, req.body.numberOfMembers, req.body.maxMembers, req.body.entryRequirement,req.body.currentlyRecruiting, req.body.currentOperation);
			res.redirect("/tf-list");
		}
	});

});

io.on('connection', function(socket) {
	socket.on("tf-submit", function(data) {
		var ip = socket.handshake.address;
		findActiveRecordExist(ip, function(err, recordExist) {
			/*if(recordExist) {
				delete recordExist.Submitter;
				recordExist.TFName = data.taskForceName;
				recordExist.TFCode = data.taskForceCode;
				recordExist.PlayersNeeded = data.playersNeeded;
				updateActiveTF(recordExist, function(err, success) {
					socket.emit("update row", recordExist);
					socket.broadcast.emit("update row", recordExist);
				});
			} else {
			*/
				insertNewTF(data.taskForceName, data.taskForceCode, data.playersNeeded, ip,function(err, success) {
					delete success.Submitter;
					socket.emit("insert row", success); 
					socket.broadcast.emit("insert row", success); 
				});
			//}
		});
	});
});

app.get("/xpvp-submission", function(req, res) {
	getMonthCount(function(err, count) {
		res.render(__dirname + "/views/xpvp-submission.ejs", {"count":count, "result": ""});
	});
});

app.get("/vp-calculator", function(req, res) {
	res.render(__dirname + "/views/vp-calculator.ejs", {});
});

app.get("/charts", function(req, res) {
	var yearFrom = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();
	var statsKey = {"xp": "_id", "vp": "vp", "min":"min", "max":"max", "average": "average", "median":"median", "ratio":"ratio"};
	var dataPoints = [];		
	var xAxis = req.query.x ? req.query.x : "xp";
	var yAxis = req.query.y ? req.query.y : "vp";	
	var monthFrom = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
	var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
	var monthTo = (monthFrom % 12) + 1;
	getMonthStatistic(new Date(yearFrom + "-" + monthFrom + "-01"), new Date(yearTo + "-" + monthTo + "-01"), function(err, stats) {
		for(var i = 0; i < stats.length; ++i) {
			if(xAxis == "vp" || yAxis == "vp") {
				for(var j = 0; j < stats[i].vpList.length; ++j) {
					if(xAxis == "vp" && yAxis == "vp") {
						dataPoints.push([stats[i].vpList[j], stats[i].vpList[j]]);	
					} else if(xAxis == "vp") {
						dataPoints.push([stats[i].vpList[j], stats[i][statsKey[yAxis]]]);
					} else {
						dataPoints.push([stats[i][statsKey[xAxis]], stats[i].vpList[j]]);
					}	
				}
			} else {
				dataPoints.push([stats[i][statsKey[xAxis]], stats[i][statsKey[yAxis]]]);
			}
		}
		res.render(__dirname + "/views/charts.ejs", {"statistics": dataPoints});
	});
});

app.get("/monthtomonth", function(req, res) {
	res.render(__dirname + "/views/monthtomonth.ejs", {});
});

app.post('/XPVPSubmit', function(req, res) {
	insertXPVPCollection(req, [parseInt(req.body.XPLevel) + "/" + parseInt(req.body.victoryPoint)]);
	res.render(__dirname + "/views/thankyou.ejs", {});
});

app.post('/XPVPListSubmit', function(req, res) {
	insertXPVPCollection(req, req.body.XPVPList.split('\n'));					
	res.render(__dirname + "/views/thankyou.ejs", {});
});

app.post('/vp-calculator', function(req, res) {
	var xp = parseInt(req.body.XPLevel);
	var vp = parseInt(req.body.victoryPoint);
	if(xp && vp) {
		insertXPVPCollection(req, [xp + "/" + vp]);
	}
	getUserXPVPStatistic(xp, vp, function(err, result) {
		if(Object.getOwnPropertyNames(result).length === 0 || !result.vpList) {
			res.render(__dirname + "/views/vp-calculator-reject.ejs", {});
		} else {
			res.render(__dirname + "/views/vp-calculator-results.ejs", result);
		}	
	});	

});

app.get("/recent", function(req, res) {
	var ip = req.query.ip;
	getMonthCount(function(err, count) {
		getRecentSubmission(RECENT_RESULT_LIMIT, ip, function(err, result) {
			res.render(__dirname + "/views/recent-submission.ejs", {"recentRecords": result, "monthCount" : count});
		});
	});
});

app.get("/ocr-tutorial", function(req, res) {
	res.render(__dirname + "/views/ocr-tutorial.ejs", {});
});

app.post("/screenshot-recognition", upload.single("imageFile"), function(req, res) {
	ocr.bbOCR(req.file.path, function(err, result) {
		insertUserCollection(req, result);
		//res.render(__dirname + "/views/thankyou.ejs", {});
		getMonthCount(function(err, count) {
			//console.log(result);
			res.render(__dirname + "/views/xpvp-submission.ejs", {"count":count, "result":result});
		});

	});
});


// APIs
app.get("/UserXPVPStatisticAPI/xp/:xp", function(req, res) {
	var xp = parseInt(req.params.xp);
	getUserXPVPStatistic(xp, null, function(err, result) {
		res.send(JSON.stringify(result));	
	});
});

app.get("/XPVPStatisticsAPI/year/:year/month/:month", function(req, res) {
	var yearFrom = parseInt(req.params.year);
	var monthFrom = parseInt(req.params.month);
	var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
	var monthTo = (monthFrom % 12) + 1;
	getMonthStatistic(new Date(yearFrom + "-" + monthFrom + "-01"), new Date(yearTo + "-" + monthTo + "-01"), function(err, result) {
		res.send(JSON.stringify(result));
	});
});

app.get("/RemoveXPVP/xp/:xp/vp/:vp/ip/:ip", function(req, res) {
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;

	var xp = parseInt(req.params.xp);	
	var vp = parseInt(req.params.vp);
	var deleteIP = req.params.ip;
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(ip == myIP.ip) {
			db.collection("XPVictory").remove({
				ip : deleteIP,
				VictoryPoint: vp,
				XPLevel: xp
			});
			res.send(200);
		} else {
			res.send(400);
		}
	});
});

//Database Calls and Helper Functions
function getMonthCount(callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("XPVictory").find({
				"Date": 
				{
					$gte:new Date(currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1) + "-01")
				}
		}).count(function(err, count) {
			callback(null, count);
		});
	});

}

function insertXPVPCollection(req, collection) {
	var date = new Date();
	var firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;

	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		for(var i = 0; i < collection.length; ++i) {
			var xpvp = collection[i].split("/");
			var xp = parseInt(xpvp[0]);
			var vp = parseInt(xpvp[1]);
			if(	(xp >= MINLEVEL && xp < 30 && vp > 0 && vp < 200) || 
				(xp >= 25 && xp <= 45 && vp >= 100 && vp <= 1000) ||
				(xp > 45 && xp <= MAXLEVEL && vp >= 100 && vp <= MAXVP)) {
				db.collection("XPVictory").update(
				{
					"ip": ip, 
					"XPLevel": xp, 
					"VictoryPoint": vp,
					"Date" : 
					{
						$gte: firstDayOfMonth
					}
				},
				{
					"ip" : ip,
					"username" : "",
					"XPLevel" : xp,
					"VictoryPoint" : vp,
					"Date" : new Date()

				},
				{
					upsert:true
				}
				);
			}
		}
	});	
}

function insertUserCollection(req, collection) {
	var date = new Date();
	var firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
	var ip = req.ip ||
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		for(var i = 0; i < collection.length; ++i) {
			var xp = parseInt(collection[i].xp);
			var vp = parseInt(collection[i].vp);
			var username = collection[i].name;
			if(	(xp >= MINLEVEL && xp < 30 && vp > 0 && vp < 200) || 
				(xp >= 25 && xp <= 45 && vp >= 100 && vp <= 1000) ||
				(xp > 45 && xp <= MAXLEVEL && vp >= 100 && vp <= MAXVP)) {
				db.collection("XPVictory").update(
				{
					"ip": ip, 
					"username": username,
					"XPLevel": xp, 
					"Date" : 
					{
						$gte: firstDayOfMonth
					}
				},
				{
					"ip" : ip,
					"username" : username,
					"XPLevel" : xp,
					"VictoryPoint" : vp,
					"Date" : new Date()

				},
				{
					upsert:true
				}
				);
			}
		}
	});
}

function getMonthStatistic(dateFrom, dateTo, callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("XPVictory").aggregate([
		{
			$match:
			{
				"Date":
				{
					$gte: dateFrom, 
					$lt: dateTo
				}
			}
		}, 
		{
			$group:
			{
				_id:"$XPLevel", 
				min:{$min:"$VictoryPoint"}, 
				max:{$max:"$VictoryPoint"}, 
				average: {$avg:"$VictoryPoint"}, 
				vpList:{$push: "$VictoryPoint"}
			}
		}, 
		{
			$project: 
			{
				_id:1, 
				min:1, 
				max:1, 
				average:1, 
				ratio:{$divide:["$average", "$_id"]}, 
				vpList:1}
			}, 
		{
			$sort:{_id:1}
		}
		]).toArray(function(err, statistics) {
			for(var i = 0; i < statistics.length; ++i) {
				statistics[i].median = calcMedian(statistics[i].vpList);
				statistics[i].stdDev = stdDev(statistics[i]["average"], statistics[i]["vpList"]);
			}
			callback(null, statistics);
		});
	});

}

function getUserXPVPStatistic(xp, vp, callback) {
	if(xp >= MINLEVEL && xp <= MAXLEVEL) {
		var data = {};
		async.series([
			function(callback) {
				mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
					db.collection("XPVictory").aggregate([
					{
						$sort :
						{
							"Date": -1
						}
					},
					{	
						$limit: vpCalculatorLimit
					},
					{
						$group:
						{
							_id:"$XPLevel", 
							min:{$min:"$VictoryPoint"}, 
							max:{$max:"$VictoryPoint"}, 
							average: {$avg:"$VictoryPoint"}, 
							vpList:{$push: "$VictoryPoint"}
						}
					}, 
					{
						$project: 
						{
							_id:1, 
							min:1, 
							max:1, 
							average:1, 
							ratio:{$divide:["$average", "$_id"]}, 
							vpList:1
						}
					}, 
					{
						$sort:{_id:1}
					}
					]).toArray(function(err, statistics) {
						var expEq = exponentialEquation(statistics);
						var targetVP = parseInt(expEq["equation"][0] * Math.exp(expEq["equation"][1] * xp)); 
						for(var i = 0; i < statistics.length; ++i) {
							if(parseInt(statistics[i]["_id"]) == xp) {
								data = statistics[i];
							}
						}
						var dev = stdDev(data["average"], data["vpList"]);
						data.XPLevel = xp;
						data.targetVP = targetVP;
						data.VictoryPoint = vp ? vp : targetVP;
						data.average = data["average"];
						data.minMax = data["min"] + " - " + data["max"];
						data.minVPRange = parseInt(targetVP - dev);
						data.maxVPRange = parseInt(targetVP + dev);
						data.vpRange = data.minVPRange + " - " + data.maxVPRange;
						data.vpList = data["vpList"];
						callback();
					});
				});
			},
			function(callback) { 
				getVPRangeStatistics(data.XPLevel, data.VictoryPoint, data.minVPRange, data.max, function(err, xpList) {
					data.xpList = xpList;
					callback();
				});
			}
		], function() {
			callback(null, data);
		});
	} else {
		callback(null, {});
	}

}

function getVPRangeStatistics(XPLevel, targetVP, min, max, callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("XPVictory").find({
			"XPLevel" : { $gte : XPLevel - 5, $lte: XPLevel + 5},
			"VictoryPoint" : { $gte: targetVP - 10, $lte: max },
			"Date" : { $gte : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)}
		},  {
			_id : 0,
			XPLevel : 1
		}).toArray(function(err, result) {
			var xpList = result.map(function(item) {
				return item.XPLevel;
			});
			callback(null, xpList);
		});
	});
}

function getRecentSubmission(count, ip, callback) {
	var ipQuery = ip ? {"ip": ip} : {};
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("XPVictory").find(ipQuery, {_id:0, username:1, ip:1, XPLevel:1, VictoryPoint:1, "Date": 1}).sort({"Date":-1}).limit(count).toArray(function(err, recentRecords) {
			callback(null, recentRecords);
		});
	});
}

function calcMedian(vpList) {
	var median = 0;

	vpList.sort(function(a, b) {
		return a-b;
	});

	var index = Math.ceil((vpList.length/2)-1);

	if(vpList.length % 2 == 0) {
		median = (vpList[index] + vpList[index+1]) / 2;
	} else {
		median = vpList[index];
	}
	
	return median;
}

function stdDev(mean, vpList) {
	var meanSquaredDiff;	
	if(vpList) {
		var devList = vpList ? vpList.slice() : [];
		for(var i = 0; i < devList.length; ++i) {
			devList[i] = Math.pow(devList[i] - mean, 2);
		}
		var squaredDiffListSum = devList.reduce(function(a, b) { return a + b;});
		var meanSquaredDiff = squaredDiffListSum / vpList.length;
	} else {
		meanSquaredDiff = 0;
	}
	return parseInt(Math.sqrt(meanSquaredDiff));
}

function exponentialEquation(dbData) {
	var data = [];
	for(var i = 0; i < dbData.length; ++i) {
		for(var j = 0; j < dbData[i].vpList.length; ++j) {
			data.push([dbData[i]["_id"], dbData[i].vpList[j]]);
		}
	}
	
	var sum = [0, 0, 0, 0, 0, 0], n = 0;

	for (len = data.length; n < len; n++) {
	  if (data[n]['x'] != null) {
		data[n][0] = data[n]['x'];
		data[n][1] = data[n]['y'];
	  }
	  if (data[n][1] != null) {
		sum[0] += data[n][0];
		sum[1] += data[n][1];
		sum[2] += data[n][0] * data[n][0] * data[n][1];
		sum[3] += data[n][1] * Math.log(data[n][1]); 
		sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]);
		sum[5] += data[n][0] * data[n][1];
	  }
	}

	var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
	var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
	var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

	return {equation: [A, B]};
} 

var DEFAULT_TIMER = 30 * 60 * 1000;
var TIMER_DECREMENTER = -1000;

function insertNewTF(tfName, tfCode, playersNeeded, ipAddress, callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("hopper").insert({
			"TFName": tfName,
			"TFCode": tfCode,
			"PlayersNeeded" : playersNeeded,
			"Reports": 0,
			"Timer": DEFAULT_TIMER,
			"Submitter": ipAddress
		}, function(err, doc) {
			callback(null, doc.ops[0]);
		});
	});
}

function decrementActiveTFTime() {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("hopper").update(
			{
				"Timer":{$gt:0}
			}, {
				$inc:{"Timer":TIMER_DECREMENTER}
			},{
				multi: true
			});
	});
}

function updateActiveTF(updatedTFData, callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("hopper").update(
			{_id:updatedTFData._id},
			{
				$set : {
					"TFName": updatedTFData.TFName,
					"TFCode": updatedTFData.TFCode,
					"PlayersNeeded": updatedTFData.PlayersNeeded
				}
			},{
				upsert:false
			});
			callback(null, true);
	});			
}

function incrementTFReport() {
	//implement later
}

function getAllActiveTF(callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("hopper").find({"Timer":{$gt:0}}
			).sort({"Timer":-1}).toArray(function(err, activeTF) {
				callback(null, activeTF);
			});

	});
}

function findActiveRecordExist(ipAddress, callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("hopper").find(
			{
				"Timer" : {$gt: 0},
				"Submitter": ipAddress
			}).toArray(function(err, theOne) {
				callback(null, theOne[0]);
			});	
	});
}
function parseMilliseconds(milliseconds) {
	var total = milliseconds/1000;
	var seconds = padNumber(total % 60, 2, '0');
	var minutes = padNumber(Math.floor(total/60), 2, '0');
	
	return "00:" + minutes + ":" + seconds;
}
function padNumber(number, width, ch) {
	n = number + '';
	return n.length >= width ? n : padNumber(0 + n, width, ch);
}

function getTFList(callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("tflist").find({}).sort({"Submitted": -1}).toArray(function(err, tfList) {
			callback(null, tfList);
		});
	});
}

function updateTF(tfTag, tfPW, tfName, tfDescription, forcePoints, numberOfMembers, maxMembers, entryRequirement, currentlyRecruiting) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("tflist").update( {
				"TFTag" : tfTag,
				"TFPW" : tfPW
			}, {
				$set : {
					"TFName" : tfName,
					"TFDescription" : tfDescription,
					"ForcePoints" : forcePoints,
					"NumberOfMembers" : numberOfMembers,
					"MaxMembers" : maxMembers,
					"EntryRequirement" : entryRequirement,
					"CurrentlyRecruiting" : currentlyRecruiting,
					"Submitted" : new Date()
				}
			}, {
				upsert:false
			});	
	});

}

function insertTF(tfTag, tfPW, tfName, tfDescription, forcePoints, numberOfMembers, maxMembers, entryRequirement, currentlyRecruiting, currentOperation) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("tflist").insert({
				"TFTag" : tfTag,
				"TFPW" : tfPW,
				"TFName" : tfName,
				"TFDescription" : tfDescription,
				"ForcePoints" : forcePoints,
				"NumberOfMembers" : numberOfMembers,
				"MaxMembers" : maxMembers,
				"EntryRequirement" : entryRequirement,
				"CurrentlyRecruiting" : currentlyRecruiting,
				"CurrentOperation" : currentOperation,	
				"Submitted" : new Date()
		});
	});
}
function findTag(tfTag, callback) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("tflist").find(
			{
				"TFTag" : tfTag,
			}).toArray(function(err, theOne) {
				callback(null, theOne[0]);
			});	
	});
}
