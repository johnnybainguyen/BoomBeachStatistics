var fs = require("fs");
var express = require('express');
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var MINLEVEL = 20;
var MAXLEVEL = 64;
var MAXVP = 3000;
var LOWLEVELRATIO = 5;
var vpCalculatorMonth = new Date("February 1, 2016");
var vpCalculatorMonthTo = new Date("April 1, 2016");
var app = express();
var http = require('http');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());

app.get("/", function(req, res) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		var date = new Date();
		var currentMonth = date.getMonth() + 1;
		var currentYear = date.getFullYear();
		db.collection("XPVictory").find({"Date":{$gte:new Date(currentYear + "-" + currentMonth + "-01")}}).count(function(err, count) {
			res.render(__dirname + "/views/index.ejs", {"count":count});
		});
	});
});

app.get("/vp-calculator", function(req, res) {
	res.render(__dirname + "/views/vp-calculator.ejs", {});
});

app.get("/vp-calculator2", function(req, res) {
	res.render(__dirname + "/views/vp-calculator2.ejs", {});
});

app.get("/charts", function(req, res) {
	res.render(__dirname + "/views/charts.ejs", {});
});

app.get("/monthtomonth", function(req, res) {
	res.render(__dirname + "/views/monthtomonth.ejs", {});
});


app.post('/XPVPSubmit', function(req, res) {
	var xp = parseInt(req.body.XPLevel);
	var vp = parseInt(req.body.victoryPoint);
	var xpvp = [xp + "/" + vp];
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;

	insertXPVPCollection(ip, xpvp);

	res.render(__dirname + "/views/thankyou.ejs", {});
});

app.post('/XPVPListSubmit', function(req, res) {
	var xpvpList = req.body.XPVPList.split('\n');
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;

	insertXPVPCollection(ip, xpvpList);					

	res.render(__dirname + "/views/thankyou.ejs", {});
});

app.post('/vp-calculator', function(req, res) {
	var xp = parseInt(req.body.XPLevel);
	var vp = parseInt(req.body.victoryPoint);
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;
	if(xp && vp) {
		insertXPVPCollection(ip, [xp + "/" + vp]);
	}

	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(xp > 0 && xp < MINLEVEL) {
			var renderedData = {
					"XPLevel": xp,
					"targetVP" : parseInt(xp * LOWLEVELRATIO),
					"vpRange" : parseInt(xp * LOWLEVELRATIO - xp) + "-" + parseInt(xp * LOWLEVELRATIO + xp),
					"minMax" : parseInt(xp * LOWLEVELRATIO - xp) + "-" + parseInt(xp * LOWLEVELRATIO + xp)
			};

			res.render(__dirname + "/views/vp-calculator-results.ejs", renderedData);
				
		} else if(xp >= MINLEVEL && xp <= MAXLEVEL) {
			db.collection("XPVictory").aggregate(
			[{
				$match:
				{
					"Date":{
						$gte: vpCalculatorMonth, 
						$lt: vpCalculatorMonthTo
					},
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
					vpList:1
				}
			}, 
			{
				$sort:{_id:1}
			}]).toArray(function(err, statistics) {
				var expEq = exponentialEquation(statistics);
				var targetVP = parseInt(expEq["equation"][0] * Math.exp(expEq["equation"][1] * xp)); 
				var data = [];
				for(var i = 0; i < statistics.length; ++i) {
					if(parseInt(statistics[i]["_id"]) == xp) {
						data = statistics[i];
					}
				}

				var dev = stdDev(data["average"], data["vpList"]);
				var renderedData = {
						"XPLevel": xp,
						"targetVP" : targetVP,
						"minMax" : data["min"] + " - " + data["max"],
						"vpRange" : parseInt(targetVP - dev) + " - " + parseInt(targetVP + dev),
						"sDevMean" : (Math.abs(xp - data["average"])/stdDev).toPrecision(3)
				};
				res.render(__dirname + "/views/vp-calculator-results.ejs", renderedData);
			});
		} else {
			res.render(__dirname + "/views/vp-calculator-reject.ejs", {});
		}	

	});	

});

app.get("/XPVPAPI/year/:year/month/:month", function(req, res) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(err) { return console.dir(err); }
		var yearFrom = parseInt(req.params.year);
		var monthFrom = parseInt(req.params.month);
		var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
		var monthTo = (monthFrom % 12) + 1;
		db.collection("XPVictory").find(
			{
				"Date" : 
				{
					$gte : new Date(yearFrom + "-" + monthFrom + "-" + "01"), 
					$lt : new Date(yearTo + "-" + monthTo + "-" + "01")
				}
			},
			{
				"_id":0,
				"username":0,
				"Date":0,
				"ip": 0
			}
			).toArray(function(err, xpVictoryRecords) {

				res.send(JSON.stringify(xpVictoryRecords));
			});
	});
});

app.get("/XPVPStatisticsAPI/year/:year/month/:month", function(req, res) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(err) {console.dir(err); }
		var yearFrom = parseInt(req.params.year);
		var monthFrom = parseInt(req.params.month);
		var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
		var monthTo = (monthFrom % 12) + 1;

		db.collection("XPVictory").aggregate([{
			$match:{
				"Date":{
					$gte: new Date(yearFrom + "-" + monthFrom + "-01"), 
					$lt: new Date(yearTo + "-" + monthTo + "-01")}}}, {
			$group:{
				_id:"$XPLevel", 
				min:{$min:"$VictoryPoint"}, 
				max:{$max:"$VictoryPoint"}, 
				average: {$avg:"$VictoryPoint"}, 
				vpList:{$push: "$VictoryPoint"}}}, {
			$project: {
				_id:1, 
				min:1, 
				max:1, 
				average:1, 
				ratio:{$divide:["$average", "$_id"]}, 
				vpList:1}}, {
			$sort:{_id:1}}]).toArray(function(err, statistics) {
				for(var i = 0; i < statistics.length; ++i) {
					statistics[i].vpList.sort(function(a, b) {
						return a-b;
					});
					var index = Math.ceil(((statistics[i].vpList.length)/2)-1);
					if(statistics[i].vpList.length % 2 == 0) {
						statistics[i].median = (statistics[i].vpList[index] + statistics[i].vpList[index+1]) / 2;
					} else {
						statistics[i].median = statistics[i].vpList[index];
					}
					statistics[i].stdDev = stdDev(statistics[i]["average"], statistics[i]["vpList"]);
				}
				res.send(JSON.stringify(statistics));
			});
	});
});

function insertXPVPCollection(ip, collection) {
	var date = new Date();
	var firstDayOfMonth = new Date(date.getFullYear, date.getMonth(), 1);

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
				});
			}
		}
	});	
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
	// Format Data
	var data = [];
	for(var i = 0; i < dbData.length; ++i) {
		for(var j = 0; j < dbData[i].vpList.length; ++j) {
			data.push([dbData[i]["_id"], dbData[i].vpList[j]]);
		}
	}
	
	//Calculate Exponential Equation
	var sum = [0, 0, 0, 0, 0, 0], n = 0;

	for (len = data.length; n < len; n++) {
	  if (data[n]['x'] != null) {
		data[n][0] = data[n]['x'];
		data[n][1] = data[n]['y'];
	  }
	  if (data[n][1] != null) {
		sum[0] += data[n][0]; // X
		sum[1] += data[n][1]; // Y
		sum[2] += data[n][0] * data[n][0] * data[n][1]; // XXY
		sum[3] += data[n][1] * Math.log(data[n][1]); // Y Log Y 
		sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]); //YY Log Y
		sum[5] += data[n][0] * data[n][1]; //XY
	  }
	}

	var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
	var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
	var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

	return {equation: [A, B]};
} 
    


app.listen(8080);
