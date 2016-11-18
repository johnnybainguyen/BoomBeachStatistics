var MINLEVEL = 12;
var MAXLEVEL = 65;
$(document).ready(function() {
	$("#vp-up-button").click(function() {
		var level = parseInt($("#xp-level").text());
		var vp = parseInt($("#vp-level").text());
		if(level == MAXLEVEL) {
			updateVPCalculator(MINLEVEL);
		} else {
			updateVPCalculator(level+1);
		}
	});

	$("#vp-down-button").click(function() {
		var level = parseInt($("#xp-level").text());
		var vp = parseInt($("#vp-level").text());
		if(level == MINLEVEL) {
			updateVPCalculator(MAXLEVEL);
		} else {
			updateVPCalculator(level-1);
		}
	});	
	vpCalculatorDistribution("vp-calculator-vp-distribution", "VP of Others Your Level", "Count", "Victory Point", vpList);
	vpCalculatorDistribution("vp-calculator-xp-distribution", "Probability of who you will be matched against", "Count", "Experience Level", xpList);
});

function updateVPCalculator(level) {
	$.get("/UserXPVPStatisticAPI/xp/" + level, function (result, status) {
		var result = JSON.parse(result);
		$('#xp-level').text(result.XPLevel);
		$("#vp-level").text(result.targetVP);
		$('#target-vp').text(result.targetVP);
		$("#vp-range").text(result.vpRange);
		$("#min-max").text(result.minMax);
		$("#average").text(result.average.toPrecision(4));
		$("#ratio").text(result.ratio.toPrecision(2));
		vpCalculatorDistribution("vp-calculator-vp-distribution", "VP of Others Your Level", "Count", "Victory Point", result.vpList);
		vpCalculatorDistribution("vp-calculator-xp-distribution", "Probability of who you will be matched against", "Count", "Experience Level", result.xpList);
	});
}

function vpCalculatorDistribution(container, title, yTitle, xTitle, list) {
	if(list.length) {
		var data = [{
			x: list,
			type: 'histogram'
		}];
		var layout = {
			title: title,
			xaxis: {title: xTitle},
			yaxis: {title: yTitle},
			bargap: 0.05
		};
		Plotly.newPlot(container, data, layout);
	}
}
