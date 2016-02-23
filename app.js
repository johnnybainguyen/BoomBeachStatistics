var fs = require("fs");
var express = require('express');
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var MAXLEVEL = 63;
var MAXVP = 3000;

var app = express();
var http = require('http');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());

app.get('/XPVPSubmission', function(req, res) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(err) { console.dir(err);}
		var date = new Date();
		var currentMonth = date.getMonth() + 1;
		var currentYear = date.getFullYear();
		
		db.collection("XPVictory").find({}).sort({"Date":-1}).limit(1).toArray(function(err, newest) {	
			db.collection("XPVictory").find({"Date":{$gte:new Date(currentYear + "-" + currentMonth + "-01")}}).count(function(err, count) {
				var date = newest[0].Date;
				var html = "";
				html += "Submission Entries Count: " + count + "<br>";
				html += "Date of Last Submission: " + date.getFullYear() + "-" + (date.getMonth()+1) +  "-" + (date.getDate()) + ' ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "<br><br>";
				html += "Single Submission:<br>";
				html += "<form action='/XPVPSubmit' method='post'>";
				html += "	Experience Level:<br>";
				html += "	<input type='text' name='XPLevel'><br><br>";
				html += "	Victory Point:<br>";
				html += "	<input type='text' name='victoryPoint'><br><br>";
				html += "	<input type='submit' name='Submit'>";
				html += "</form><br>";
				html += "Group submission:<br>";
				html += "<form action='/XPVPListSubmit' method='post'>";
				html += "	Experience Level:<br>";
				html += "	<textarea placeholder='Use the format&#10;(XP/VP): &#10;&#10;46/412&#10;32/223&#10;34/271&#10;37/252&#10;31/208&#10;46/448&#10;43/345&#10;33/227' type='text' cols='20' rows='20' name='XPVPList'></textarea><br><br>";
				html += "	<input type='submit' name='Submit'>";
				html += "</form><br>";
				html += "<script>";
				html += "  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){";
				html += "  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),";
				html += "  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)";
				html += "  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');";
				html += "  ga('create', 'UA-73844310-1', 'auto');";
				html += "  ga('send', 'pageview');";
				html += "</script>";
				res.send(html);
			});
		});
	});
});

app.get('/', function(req, res) {
	res.sendFile(__dirname + "/views/index.html");
});

app.get("/charts", function(req, res) {
	res.sendFile(__dirname + "/views/charts.html");
});

app.get("/chartsr", function(req, res) {
	res.sendFile(__dirname + "/views/chartsr.html");
});

app.get("/charts1", function(req, res) {
	res.sendFile(__dirname + "/views/charts1.html");
});

app.get("/charts2", function(req, res) {
	res.sendFile(__dirname + "/views/charts2.html");
});

app.get("/charts3", function(req, res) {
	res.sendFile(__dirname + "/views/charts3.html");
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
	res.send("Thank you for your submission.  <a href='/XPVPSubmission'>Click here</a> to go back and submit more data!");
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
	res.send("Thank you for your submission.  <a href='/XPVPSubmission'>Click here</a> to go back and submit more data!");
						
});
app.get("/XPVPAPI/year/:year/month/:month", function(req, res) {
	mongoClient.connect("mongodb://localhost:27017/boombeachdb", function(err, db) {
		if(err) { return console.dir(err); }
		var yearFrom = parseInt(req.params.year);
		var monthFrom = parseInt(req.params.month);
		var yearTo = (monthFrom == 12) ? yearFrom + 1 : yearFrom;
		var monthTo = (monthFrom % 12) + 1
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
				}
				res.send(JSON.stringify(statistics));
			});
	});
});

app.listen(8080);
