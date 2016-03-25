var fs = require("fs");
var express = require('express');
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var MAXLEVEL = 64;
var MAXVP = 3000;
var LOWLEVELRATIO = 4.1;
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

app.get("/charts", function(req, res) {
	res.render(__dirname + "/views/charts.ejs", {});
});

app.get("/monthtomonth", function(req, res) {
	res.render(__dirname + "/views/monthtomonth.ejs", {});
});


app.post('/XPVPSubmit', function(req, res) {
	var xp = parseInt(req.body.XPLevel);
	var vp = parseInt(req.body.victoryPoint);
	var XPVPList = req.body.XPVP;
	var ip = req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;
	if(xp <= MAXLEVEL && vp <= MAXVP) {
		mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
			if(err) { return console.dir(err); } 
			db.collection("XPVictory").insert(
				{
					"ip" : ip,
					"username": "", 
					"XPLevel" : xp, 
					"VictoryPoint" : vp, 
					"Date" : new Date()
				}
			);
		});
	}

	res.render(__dirname + "/views/thankyou.ejs", {});
});

app.post('/XPVPListSubmit', function(req, res) {
	var list = req.body.XPVPList.split('\n');
	var insertCollect = [];
	var ip = req.headers['x-forwarded-for'] ||
	req.connection.remoteAddress ||
	req.socket.remoteAddress ||
	req.connection.socket.remoteAddress;

	for(var i = 0; i < list.length; ++i) {
		var tuple = list[i].split("/");
		var xp = parseInt(tuple[0]);
		var vp = parseInt(tuple[1]);
		if(xp <= MAXLEVEL && xp > 0 && vp <= MAXVP && vp > 0) {
			insertCollect.push({
				"ip":ip,
				"username":"",
				"XPLevel":xp,
				"VictoryPoint": vp,
				"Date" : new Date()
			});
		}
	}

	if(insertCollect) {
		mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
			db.collection("XPVictory").insert(insertCollect);
		});
	}
						
	res.render(__dirname + "/views/thankyou.ejs", {});
});

app.post('/vp-calculator', function(req, res) {
	var xp = parseInt(req.body.XPLevel);

	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
			db.collection("XPVictory").find(
				{
					"Date":
					{
						$gte:vpCalculatorMonth,
						$lt: vpCalculatorMonthTo
					},
					"XPLevel": xp
				}).count(function(err, count) {
					if(count > 0  && xp > 0 && xp <= MAXLEVEL) {
						db.collection("XPVictory").aggregate(
						[{
							$match:
							{
								"Date":{
									$gte: vpCalculatorMonth, 
									$lt: vpCalculatorMonthTo
								},
								"XPLevel": xp
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
							var data = statistics[0];
							var dev = stdDev(data["average"], data["vpList"]);
							var renderedData = {
									"XPLevel": xp,
									"average" : parseInt(data["average"]),
									"minMax" : data["min"] + " - " + data["max"],
									"vpRange" : parseInt(data["average"] - dev) + " - " + parseInt(data["average"] + dev)
							};
							res.render(__dirname + "/views/vp-calculator-results.ejs", renderedData);
						});
					} else if(count == 0 && xp > 0 && xp <= MAXLEVEL) {
						var renderedData = {
								"XPLevel": xp,
								"average" : parseInt(xp * LOWLEVELRATIO),
								"vpRange" : parseInt(xp * LOWLEVELRATIO - xp) + "-" + parseInt(xp * LOWLEVELRATIO + xp),
								"minMax" : parseInt(xp * LOWLEVELRATIO - xp) + "-" + parseInt(xp * LOWLEVELRATIO + xp)
						};

						res.render(__dirname + "/views/vp-calculator-results.ejs", renderedData);
							
					} else {
						res.render(__dirname + "/views/vp-calculator-reject.ejs", {});
					}	

				});
				

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

function stdDev(mean, vpList) {
	var devList = vpList.slice();
	for(var i = 0; i < devList.length; ++i) {
		devList[i] = Math.pow(devList[i] - mean, 2);
	}
	var squaredDiffListSum = devList.reduce(function(a, b) { return a + b;});
	var meanSquaredDiff = squaredDiffListSum / vpList.length;
	return parseInt(Math.sqrt(meanSquaredDiff));
}

app.listen(8080);
