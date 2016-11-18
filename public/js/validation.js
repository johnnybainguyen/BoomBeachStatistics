
function validateTaskForceName(formObj) {
	return formObj.val() == "" ? validateError(formObj) : validatePass(formObj);
}

function validateTaskForceCode(formObj) {
	return /^#([0-9a-z]{8,8})$/i.test(formObj.val()) ? validatePass(formObj) : validateError(formObj);
}

function validatePlayersNeeded(formObj) {
	var playersNeeded = parseInt(formObj.val());
	return playersNeeded > 0 && playersNeeded <= 50 ? validatePass(formObj) : validateError(formObj);
}

function validateError(validateObj) {
	validateObj.css("border", "2px solid red");
	return false;
}

function validatePass(validateObj) {
	validateObj.css("border", "");
	return true;
}

