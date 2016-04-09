var dates = ["April 1, 2015", "December 1, 2015", "February 1, 2016", "March 1, 2016", "April 1, 2016"];
var calls = [];

dates.forEach(function(date) {
	calls.push(function(callback) {
		$.get(generateAPIURL(new Date(date)), function(stats, status) {
			callback(null, [date, JSON.parse(stats)]);
		});
	});

});

async.parallel(calls, function(err, results) {
	displayMonthToMonth(results);
});

function generateAPIURL(date) {
	var month = date.getMonth() + 1;
	var url =  "/XPVPStatisticsAPI/year/" + date.getFullYear() + "/month/" + month;
	return url;
}

function displayMonthToMonth(stats) {
	var seriesData = [];
	for(var i = 0; i < stats.length; ++i) {
		var graphType = "exponential";
		var lineColor = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
		var pushObject = {};
		var dateString = stats[i][0];
		var dataArray = stats[i][1];
		pushObject["regression"] = true;
		pushObject["regressionSettings"] = {type: graphType, color: lineColor};
		pushObject["regressionSettings"]["name"] = dateString; 
		pushObject["color"] = lineColor;
		pushObject["data"] = [];
		pushObject["name"] = dateString;
		pushObject["visible"] = false;
		for(var j = 0; j < dataArray.length; ++j) {
			pushObject["data"].push([dataArray[j]["_id"], dataArray[j]["average"]]);
		}	
		seriesData.push(pushObject);
	}

	$(function() {
		$('#container').highcharts( {
			chart: {
				type: 'scatter',
				zoomType: 'xy'
			},
			title: {
				text: "Month-to-Month XPVP Comparison"
			},
			xAxis: {
				title: {
					text:"XP"
				},
			},
			yAxis: {
				title: {
					text: "VP"
				},
			},
			plotOptions: {
				scatter: {
					marker: {
						radius: 5, 
						states: {
							hover: {
								enabled:true,
								lineColor: 'rgb(100,100,100)'
							}
						}
					},
					states: {
						hover: {
							marker: {
								enabled: false
							}
						}
					}
				}
			},
			series: seriesData
		});
	});

}

