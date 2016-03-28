var xmlhttp = new XMLHttpRequest()
var date = new Date();
var monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var statsKey = {"xp": "_id", "vp": "vp", "min":"min", "max":"max", "average": "average", "median":"median", "ratio":"ratio"};
var month = getParam("month") ? getParam("month") : date.getMonth() + 1;
var year = getParam("year") ? getParam("year") : date.getFullYear();
var levelFrom = getParam("levelfrom");
var levelTo = getParam("levelto");
var xAxis = getParam("x") ? getParam("x") : "xp";
var yAxis = getParam("y") ? getParam("y") : "vp";
var graphType = getParam("graphtype") ? getParam("graphtype") : "exponential";
var url = "/XPVPAPI/year/" + year + "/month/" + month;
var urlStats = "/XPVPStatisticsAPI/year/" + year + "/month/" + month;
var dataPoints = [];	

$(document).ready(function() {
	$('#x').val(xAxis);
	$('#y').val(yAxis);
	$('#graph-type').val(graphType);
	$('#month').val(month);
	$('#year').val(year);
	$('select').select2();
});

function getParam(name) {
	var url = location.search.substring(1);
	var paramArray = url.split("&");
	for(var i = 0; i < paramArray.length; ++i) {
		var paramValue = paramArray[i].split("=");
		if(paramValue[0] == name) {
			return paramValue[1];
		}
	}
	return "";
}

$.get(urlStats, function(stats, status) {
	myFunction(JSON.parse(stats));
});

function myFunction(stats) {
	if(levelFrom && levelTo) {
		stats = stats.filter(function(item) {
			return item[statsKey['xp']] >= levelFrom && item[statsKey['xp']] <= levelTo;
		});
	}	
	for(var i = 0; i < stats.length; ++i) {
		// Parsing the VPList on the browser end
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

	$(function() {
		$('#container').highcharts( {
			chart: {
				type: 'scatter',
				zoomType: 'xy'
			},
			title: {
				text: monthName[month-1] + " " + year + ' Boom Beach ' + xAxis + ' versus ' + yAxis
			},
			xAxis: {
				title: {
					enabled: true,
					text:xAxis
				},
				startOnTick:true,
				endOnTick:true,
				showLastLabel: true,
			},
			yAxis: {
				title: {
					text: yAxis
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
			series: [{
				regression: true,
				regressionSettings: {
					type: graphType,
					color: 'rgba(223, 83, 83, .9)',
				},
				color: 'rgba(119,152,191,.5)',
				data: dataPoints 
			}]
		});
	});

}

