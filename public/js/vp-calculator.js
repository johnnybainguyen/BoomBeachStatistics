var MAXLEVEL = 64;
$(document).ready(function() {
	$("#vp-up-button").click(function() {
		var level = parseInt($("#xp-level").text());
		if(level == MAXLEVEL) {
			updateVPCalculator(1);
		} else {
			updateVPCalculator(level+1);
		}
	});

	$("#vp-down-button").click(function() {
		var level = parseInt($("#xp-level").text());
		if(level == 1) {
			updateVPCalculator(MAXLEVEL);
		} else {
			updateVPCalculator(level-1);
		}
	});	
	vpCalculatorHistogram(vpList);
});

function updateVPCalculator(level) {
	$.get("/XPStatisticAPI/xp/" + level, function (result, status) {
		var result = JSON.parse(result);
		$('#xp-level').text(result.XPLevel);
		$('#target-vp').text(result.targetVP);
		$("#vp-range").text(result.vpRange);
		$("#min-max").text(result.minMax);
		vpCalculatorHistogram(result.vpList);
	});
}

function vpCalculatorHistogram(vpList) {
	if(vpList.length) {
		var histogramContainer = $('#vp-calculator-histogram');
		var data = [{
			x: vpList,
			type: 'histogram'
		}];
		var layout = {
			title: "Distribution of People Your Level",
			xaxis: {title: "Victory Points"},
			yaxis: {title: "Count"},
			bargap: 0.05
		};
		Plotly.newPlot("vp-calculator-histogram", data, layout);
	}
}
