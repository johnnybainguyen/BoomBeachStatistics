var express = require("express");

var app = express();

app.get("/", function(req, res) {
	res.send("Testing");
});

app.listen(8080, function() {
	console.log(app.mountpath);
	console.log("Listening on 8080");
});
