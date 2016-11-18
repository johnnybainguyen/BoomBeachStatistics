function parseMilliseconds(milliseconds) {
	var total = milliseconds/1000;
	var seconds = padNumber(total % 60, 2, '0');
	var minutes = padNumber(Math.floor(total/60), 2, '0');
	
	return "00:" + minutes + ":" + seconds;
}
function padNumber(number, width, ch) {
	n = number + '';
	return n.length >= width ? n : padNumber(0 + n, width, ch);
}

function decrementTimer(time) {
	var timeArray = time.split(":");
	var hours = parseInt(timeArray[0]);
	var minutes = parseInt(timeArray[1]);
	var seconds = parseInt(timeArray[2]);
	if(seconds> 0) {
		--seconds;
	}
	else if(minutes > 0) {
		--minutes;
		seconds = 59;
	} else if(hours > 0) {
		--hours;
		minutes = 59;
		seconds = 59;
	} else {
		jQuery.each($(".timer"), function(index, value) {
			if(this.textContent == "00:00:00") {
				this.closest("tr").remove();
			}
		});
	}

	// last case 0 0 0
	return padNumber(hours,2,'0') + ":" + padNumber(minutes,2,'0') + ":" + padNumber(seconds,2,'0');
}

