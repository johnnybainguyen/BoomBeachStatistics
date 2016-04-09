var xmlhttp = new XMLHttpRequest()
var date = new Date();
var monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var month = getParam("month") ? getParam("month") : date.getUTCMonth() + 1;
var year = getParam("year") ? getParam("year") : date.getUTCFullYear();
var xAxis = getParam("x") ? getParam("x") : "xp";
var yAxis = getParam("y") ? getParam("y") : "vp";
var graphType = getParam("graphtype") ? getParam("graphtype") : "exponential";

$(document).ready(function() {
	$('#x').val(xAxis);
	$('#y').val(yAxis);
	$('#graph-type').val(graphType);
	$('#month').val(month);
	$('#year').val(year);
	$('select').select2();
	displayMonth();
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

function displayMonth() {
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
				data: stats 
			}]
		});
	});

}

