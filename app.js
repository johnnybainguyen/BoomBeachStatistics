var fs = require("fs");
var express = require('express');
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var app = express();
var http = require('http');
var async = require("async");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());

var MINLEVEL = 20;
var MAXLEVEL = 64;
var MAXVP = 3000;
var LOWLEVELRATIO = 5;
var currentDate = new Date();
var vpCalculatorLimit = 1500;

// Views
app.get("/", function(req, res) {
	getMonthCount(function(err, count) {
		res.render(__dirname + "/views/index.ejs", {"count":count});
	});
});

app.get("/vp-calculator", function(req, res) {
	res.render(__dirname + "/views/vp-calculator.ejs", {});
});

app.get("/charts", function(req, res) {
	var yearFrom = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();
	var monthFrom = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
	var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
	var monthTo = (monthFrom % 12) + 1;
	getMonthStatistic(new Date(yearFrom + "-" + monthFrom + "-01"), new Date(yearTo + "-" + monthTo + "-01"), function(err, result) {
		res.render(__dirname + "/views/charts.ejs", {"statistics": result});
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
	getXPStatistic(xp, function(err, result) {
		if(Object.getOwnPropertyNames(result).length === 0) {
			res.render(__dirname + "/views/vp-calculator-reject.ejs", {});
		} else {
			res.render(__dirname + "/views/vp-calculator-results.ejs", result);
		}	
	});	

});

app.get("/recent", function(req, res) {
	var ip = req.query.ip;
	getMonthCount(function(err, count) {
		getRecentSubmission(100, ip, function(err, result) {
			res.render(__dirname + "/views/recent-submission.ejs", {"recentRecords": result, "monthCount" : count});
		});
	});
});


// APIs
app.get("/XPStatisticAPI/xp/:xp", function(req, res) {
	var xp = parseInt(req.params.xp);
	getXPStatistic(xp, function(err, result) {
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

app.get("/recent-submission", function(req, res) {
	var SUBMISSION_COUNT = 100;
	getRecentSubmission(SUBMISSION_COUNT, function(err, result) {
		res.send(JSON.stringify(result));
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
	var firstDayOfMonth = new Date(date.getFullYear, date.getMonth(), 1);
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;

	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		for(var i = 0; i < collection.length; ++i) {
			var xpvp = collection[i].split("/");
			var xp = parseInt(xpvp[0]);
			var vp = parseInt(xpvp[1]);
			if(xp > 0 && xp <= MAXLEVEL && vp > 0 && vp <= MAXVP) {
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

function getXPStatistic(xp, callback) {
	if(xp > 0 && xp < MINLEVEL) {
		var data = {
				"XPLevel": xp,
				"targetVP" : parseInt(xp * LOWLEVELRATIO),
				"vpRange" : parseInt(xp * LOWLEVELRATIO - xp) + "-" + parseInt(xp * LOWLEVELRATIO + xp),
				"minMax" : parseInt(xp * LOWLEVELRATIO - xp) + "-" + parseInt(xp * LOWLEVELRATIO + xp)
		};
		callback(null, data);	
	} else if(xp >= MINLEVEL && xp <= MAXLEVEL) {
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
				var data = [];
				for(var i = 0; i < statistics.length; ++i) {
					if(parseInt(statistics[i]["_id"]) == xp) {
						data = statistics[i];
					}
				}

				var dev = stdDev(data["average"], data["vpList"]);
				var data = {
						"XPLevel": xp,
						"targetVP" : targetVP,
						"minMax" : data["min"] + " - " + data["max"],
						"vpRange" : parseInt(targetVP - dev) + " - " + parseInt(targetVP + dev)
				};
				callback(null, data);
			});
		});
	} else {
		callback(null, {});
	}

}

function getRecentSubmission(count, ip, callback) {
	var ipQuery = ip ? {"ip": ip} : {};
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		db.collection("XPVictory").find(ipQuery, {_id:0, ip:1, XPLevel:1, VictoryPoint:1, "Date": 1}).sort({"Date":-1}).limit(count).toArray(function(err, recentRecords) {
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
	var devList = vpList.slice();
	for(var i = 0; i < devList.length; ++i) {
		devList[i] = Math.pow(devList[i] - mean, 2);
	}
	var squaredDiffListSum = devList.reduce(function(a, b) { return a + b;});
	var meanSquaredDiff = squaredDiffListSum / vpList.length;
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

app.listen(8080);
