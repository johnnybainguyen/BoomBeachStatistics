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
});

function updateVPCalculator(level) {
	$.get("/XPStatisticAPI/xp/" + level, function (result, status) {
		var result = JSON.parse(result);
		$('#xp-level').text(result.XPLevel);
		$('#target-vp').text(result.targetVP);
		$("#vp-range").text(result.vpRange);
		$("#min-max").text(result.minMax);
	});
}
