var im = require("imagemagick");
var tesseract = require('node-tesseract');
var async = require('async');
var fs = require("fs");

function bbOCR(screenshotPath, callback) {
	var timestamp = Date.now() + "_";
	var listPlayer = [];
	var fileType = ".png";
	var filePath = "../uploads/";
	var TFDataRootName = filePath + timestamp + "_tf_data";
	var TFDataLeftRootName = "_0";
	var TFDataRightRootName = "_1";
	var TFDataLeftValueName = "_0";
	var TFDataRightValueName = "_1";
	var TFDataXPNameName = "_xpname";
	var TFDataVPIntelName = "_vpintel";
	var TFDataName =  TFDataRootName + fileType;
	var TFDataSplitName =  TFDataRootName + "_%d" + fileType;
	var TFDataLeftColumnName =  TFDataRootName + TFDataLeftValueName + fileType;
	var TFDataRightColumnName =  TFDataRootName + TFDataRightValueName + fileType;
	var TFDataLeftSplitName =  TFDataRootName + TFDataLeftRootName + "_%d" + fileType;
	var TFDataRightSplitName =  TFDataRootName + TFDataRightRootName + "_%d" + fileType;
	var TFDataLeftLeftName =  TFDataRootName + TFDataLeftRootName + TFDataLeftValueName + fileType;
	var TFDataLeftRightName =  TFDataRootName + TFDataLeftRootName + TFDataRightValueName + fileType;
	var TFDataRightLeftName =  TFDataRootName + TFDataRightRootName + TFDataLeftValueName + fileType;
	var TFDataRightRightName =  TFDataRootName + TFDataRightRootName + TFDataRightValueName + fileType;
	var TFDataLeftXPName =  TFDataRootName + TFDataLeftRootName + TFDataXPNameName + fileType;
	var TFDataLeftVPIntel =  TFDataRootName + TFDataLeftRootName + TFDataVPIntelName + fileType;
	var TFDataRightXPName =  TFDataRootName + TFDataRightRootName + TFDataXPNameName + fileType;
	var TFDataRightVPIntel =  TFDataRootName + TFDataRightRootName + TFDataVPIntelName + fileType;
	var listOfFiles = [	TFDataName, TFDataSplitName, TFDataLeftColumnName, TFDataLeftSplitName, TFDataLeftLeftName,
				TFDataLeftXPName, TFDataLeftRightName, TFDataLeftVPIntel, TFDataRightColumnName,
				TFDataRightSplitName, TFDataRightLeftName, TFDataRightXPName, TFDataRightRightName,
				TFDataRightVPIntel];
	console.log(JSON.stringify(listOfFiles));
	var firstBatchS = [	[screenshotPath, "-chop", "0x40%", TFDataName],
				[TFDataName, "-gravity", "South" , "-chop", "0x10%", TFDataName],
				[TFDataName, "-crop", "50%x100%", "+repage", TFDataSplitName]];

	var secondBatchP1 = [	[TFDataLeftColumnName, "-crop", "75%x100%", "+repage", TFDataLeftSplitName],
				[TFDataLeftLeftName, "-fill", "black", "-fuzz", "3%", "+opaque", "#FFFFFF", TFDataLeftXPName],
				[TFDataLeftRightName, "-fill", "white", "-fuzz", "25%", "+opaque", "#000000", "-threshold" , "10%", TFDataLeftVPIntel]];

	var secondBatchP2 = [	[TFDataRightColumnName, "-crop", "50%x100%", "+repage", TFDataRightSplitName],
				[TFDataRightLeftName, "-fill", "black", "-fuzz", "3%", "+opaque", "#FFFFFF", TFDataRightXPName],
				[TFDataRightRightName, "-fill", "white", "-fuzz", "25%", "+opaque", "#000000", "-threshold" , "10%", TFDataRightVPIntel],
				[TFDataRightVPIntel, "-gravity", "East", "-chop", "35%x0", TFDataRightVPIntel]];

	var ocrSettingHorizontal = {
		psm: 6
	};

	var ocrSettingVertical = {
		psm: 6
	};


	async.series([
		function(callback) {
			im.convert(firstBatchS[0], function(err, stdout) {
				callback();
			});
		},
		function(callback) {
			im.convert(firstBatchS[1], function(err, stdout) {
				callback();
			});
		},
		function(callback) {
			im.convert(firstBatchS[2], function(err, stdout) {
				callback();
			});
		},
		function(callback) {
			async.parallel([
				function(callback) {
					im.convert(secondBatchP1[0], function() {
						async.parallel([
							function(callback) {
								im.convert(secondBatchP1[1], function(err, stdout) {
									tesseract.process(TFDataLeftXPName, ocrSettingHorizontal, function(err, text) {
										callback(null, {"XPName":text});
									});
								});
							},
							function(callback) {
								im.convert(secondBatchP1[2], function(err, stdout) {
									tesseract.process(TFDataLeftVPIntel, ocrSettingVertical, function(err, text) {
										callback(null, {"VPIntel":text});
									});
								});
							}
						], function(err, arrayResult) {
							mergeResult(arrayResult, listPlayer);					
							callback();
						});
					});
				},
				function(callback) {
					im.convert(secondBatchP2[0], function() {
						async.parallel([
							function(callback) {
								im.convert(secondBatchP2[1], function(err, stdout) {
									tesseract.process(TFDataRightXPName, ocrSettingHorizontal, function(err, text) {
										callback(null, {"XPName":text});
									});
								});
							},
							function(callback) {
								im.convert(secondBatchP2[2], function(err, stdout) {
									im.convert(secondBatchP2[3], function(err, stdout) {
										tesseract.process(TFDataRightVPIntel, ocrSettingVertical,function(err, text) {
											callback(null, {"VPIntel":text});
										});
									});							
								});
							}
						], function(err, arrayResult) {
							mergeResult(arrayResult, listPlayer);					
							callback();
						});
					});
				}
			], function() {
				removeAllCreatedFiles(listOfFiles);
				callback();
			})
		}, 
		function() {
			callback(null, listPlayer);
		}

	]);


}
function parseTextList(text) {
	var listText = text.split("\n");
	listText = listText.filter(function(n) {
		return n != "" && n != " ";
	});
	return listText;
}


function mergeResult(arrayText, listPlayer) {
	var xpNameList = [];
	var vpIntelList =[];

	for(var i = 0; i < arrayText.length; ++i) {
		if(arrayText[i].XPName) {
			xpNameList = parseTextList(arrayText[i].XPName);
		} else {
			vpIntelList = parseTextList(arrayText[i].VPIntel);
		}
	}
	for(var i = 0; i < xpNameList.length; ++i) {
		var obj = {
			xp : xpNameList[i].substr(0, xpNameList[i].indexOf(' ')).replace(/[^0-9]/g, ""),
			name : xpNameList[i].substr(xpNameList[i].indexOf(" ") +1),
			vp : vpIntelList[i*2].replace(/[^0-9]/g, ""),
			intel : vpIntelList[i*2+1].replace(/[^0-9]/g, "")
		};
		listPlayer.push(obj);
	}
}

function removeAllCreatedFiles(listOfFiles) {
	for(var i = 0; i < listOfFiles.length; ++i) {
		fs.unlink(listOfFiles[i]);
	}
}
module.exports.bbOCR = bbOCR;
