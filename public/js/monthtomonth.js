var dates = ["April 1, 2015", "December 1, 2015", "February 1, 2016", "March 1, 2016", "April 1, 2016"];
var apiResults = [];

$.get(generateAPIURL(new Date(dates[0])), function(stats1, status) {
	apiResults.push([dates[0], JSON.parse(stats1)]);
	$.get(generateAPIURL(new Date(dates[1])), function(stats2, status) {		
		apiResults.push([dates[1], JSON.parse(stats2)]);
		$.get(generateAPIURL(new Date(dates[2])), function(stats3, status) {
			apiResults.push([dates[2], JSON.parse(stats3)]);
			$.get(generateAPIURL(new Date(dates[3])), function(stats4, status) {
				apiResults.push([dates[3], JSON.parse(stats4)]);
				$.get(generateAPIURL(new Date(dates[4])), function(stats5, status) {
					apiResults.push([dates[4], JSON.parse(stats5)]);
					myFunction(apiResults);
				});
			});
		});
	});
});

function generateAPIURL(date) {
	var month = date.getMonth() + 1;
	var url =  "/XPVPStatisticsAPI/year/" + date.getFullYear() + "/month/" + month;
	return url;
}

function myFunction(stats) {
	var seriesData = [];
	for(var i = 0; i < apiResults.length; ++i) {
		var graphType = "exponential";
		var lineColor = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
		var pushObject = {};
		var dateString = apiResults[i][0];
		var dataArray = apiResults[i][1];
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

