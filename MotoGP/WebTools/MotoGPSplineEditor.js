// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

var SplineIniFiles = [];
var FrictionIniString = "";
var changeThreshold = 0.001;
var transitionThreshold = 0.01;
var maxSkipCount = 5;

var img = new Image();

function init() 
{
    InitialiseSplineEditor(document.getElementById('splinesCanvas'));

	/*
		setup the event listeners for file selection
	*/
	var frictionElement = document.getElementById('fileInputFriction');
	frictionElement.addEventListener('change', readSingleSplineFile, false);
	frictionElement.fileIndex = 0;
		
	var aiElement = document.getElementById('fileInputAi');
	aiElement.addEventListener('change', readSingleSplineFile, false);
	aiElement.fileIndex = 1;
		
	var csvElement = document.getElementById('fileInputCsv');
	csvElement.addEventListener('change', readCsvFile, false);
		
	var svgElement = document.getElementById('fileInputSvg');
	svgElement.addEventListener('change', readSvgFile, false);
}

function getBasename(name) 
{
	var basename = name.substring(0, name.indexOf("_"));
	if (basename.length == 0) basename = name.substring(0, name.indexOf("."));
	if (basename.length == 0) basename = "placeholder";
	return basename;
}

function getCSVFromTextArea()
{
	var ta_element = document.getElementById('ta_csvinput');
	var ct = ta_element.value;
	ProcessCsvData(ct, "");
}
// readSingleFile from http://stackoverflow.com/questions/17648871/how-can-i-parse-a-text-file-using-javascript
// article also shows how to load a file without user selection using an ajax request 
function readSingleSplineFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		var index = evt.target.fileIndex;
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
	
			var basename = getBasename(f.name);
	
			var aiElement = document.getElementById("out-ai-filename");
			aiElement.placeholder = basename;
			
			parseSingleSplineFile(ct, f.name, index);
			AddSplinesToEditor(index);
			updateDisplay();
			if (index == 1)	document.getElementById('ai-output-div').style.visibility='visible';
		}
		r.readAsText(f);
		
	} else { 
		alert("Failed to load file");
	}
}

function ProcessCsvData(ct, name)
{
	var basename = getBasename(name);
	
	var aiElement = document.getElementById("out-ai-filename");
	var frictionElement = document.getElementById("out-friction-filename");
	aiElement.placeholder = basename;
	frictionElement.placeholder = basename;

	var pointList = CsvFileToPointList(ct);
	
	var iniString = PointListToAiSplineIni(pointList);
	var aiFileIndex = 1;
	var aiFileName = basename + "_ai.ini";
	parseSingleSplineFile(iniString, aiFileName, aiFileIndex)
	AddSplinesToEditor(aiFileIndex);
	
	FrictionIniString = PointListToFrictionSplineIni(pointList);
	var frictionFileIndex = 0;
	var frictionFileName = basename + "_friction1.ini";
	parseSingleSplineFile(FrictionIniString, frictionFileName, frictionFileIndex)
	AddSplinesToEditor(frictionFileIndex);
	
	updateDisplay();
	
	document.getElementById('ai-output-div').style.visibility='visible';
	document.getElementById('friction-output-div').style.visibility='visible';
}

function readCsvFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		var index = evt.target.fileIndex;
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			
			ProcessCsvData(ct, f.name);
		}
		r.readAsText(f);
	} else { 
		alert("Failed to load file");
	}
}

function readSvgFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			ParseDebugSvgFile(ct);
			updateDisplay();
		}
		r.readAsText(f);
		
	} else { 
		alert("Failed to load file");
	}
}

function saveAiSpline() 
{
	var element = document.getElementById("out-ai-filename");
	var fileAsText = GetCurrentSplineIniData(1);
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_ai.ini";
	saveAs(blob, filename);
}

function saveFrictionSpline() 
{
	var element = document.getElementById("out-friction-filename");
	var blob = new Blob([FrictionIniString], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_friction1.ini";
	saveAs(blob, filename);
}

function SplineIniFile(filename)
{
	this.splinePath = 0;
	
	this.filename = filename;
	this.NumberOfSegments = 0;
	this.StartSegment = 0;
	this.EndSegment = 0;

	this.GateShape = "Radius";
	this.GateWidth = 0.000;
	this.GateHeight = 0.000;
	this.InitialCheckpointTime = 0.000;
	this.LeftoverTimeMultiplier = 0.200
	this.TimeDecayRatePerLap = 0.300
	this.TrackSegments = [];
	
	this.Position = [];
	this.LeftEdgePosition = [];
	this.RightEdgePosition = [];
	this.Tangent = [];
	this.Waypoint = [];
	this.SequenceNumber = [];
	this.NextGateSequenceNumber = [];

	this.GateRadius = [];
	this.OuterGateRadius = [];
	this.GatePosition = [];
	this.GateLook = [];

	this.TargetSpeed = [];
	this.TransitionSpeed = [];
	this.TargetGear = [];
	this.MaxGear = [];
	this.Flags = [];
	this.AchievableDeceleration0 = [];
	this.AchievableDeceleration1 = [];
	this.AchievableDeceleration2 = [];
	this.AchievableDeceleration3 = [];
	this.MaxSpeed = [];
	this.LeftTrackWidth = [];
	this.RightTrackWidth = [];

	this.OuterFriction = [];
	this.InnerFriction = [];

	this.LastSegment = [];
	this.NextSegment = [];
	this.Branch = [];
	this.AIAssist = [];
	this.TurnDirection = [];
	this.Curvature = [];
	this.CheckpointTime = [];
	this.BestCheckpointTime = [];
	this.MaxExtraCheckpointTime = [];
}

SplineIniFile.prototype.initialize = function(trackSegment)
{
	this.Position[trackSegment] = [0.0, 0.0, 0.0];
	this.LeftEdgePosition[trackSegment] = [0.0, 0.0, 0.0];
	this.RightEdgePosition[trackSegment] = [0.0, 0.0, 0.0];
	this.Tangent[trackSegment] = [0.0, 0.0, 0.0];
	this.Waypoint[trackSegment] = 0;
	this.SequenceNumber[trackSegment] = -1;
	this.NextGateSequenceNumber[trackSegment] = -1;

	this.GateRadius[trackSegment] = -1.0;
	this.OuterGateRadius[trackSegment] = -1.0;
	this.GatePosition[trackSegment] = [0.0, 0.0, 0.0];
	this.GateLook[trackSegment] = [0.0, 0.0, 0.0];

	this.TargetSpeed[trackSegment] = -1.0;
	this.TransitionSpeed[trackSegment] = 0.0;
	this.TargetGear[trackSegment] = 0;
	this.MaxGear[trackSegment] = 0;
	this.Flags[trackSegment] = 0;
	this.AchievableDeceleration0[trackSegment] = -1.0;
	this.AchievableDeceleration1[trackSegment] = -1.0;
	this.AchievableDeceleration2[trackSegment] = -1.0;
	this.AchievableDeceleration3[trackSegment] = -1.0;
	this.MaxSpeed[trackSegment] = 0.0;
	this.LeftTrackWidth[trackSegment] = -1.0;
	this.RightTrackWidth[trackSegment] = -1.0;

	this.OuterFriction[trackSegment] = -1;
	this.InnerFriction[trackSegment] = -1;

	this.LastSegment[trackSegment] = -1;
	this.NextSegment[trackSegment] = -1;
	this.Branch[trackSegment] = -1;
	this.AIAssist[trackSegment] = -1.0;
	this.TurnDirection[trackSegment] = 0;
	this.Curvature[trackSegment] = 0.0;
	this.CheckpointTime[trackSegment] = 0.0;
	this.BestCheckpointTime[trackSegment] = 0.0;
	this.MaxExtraCheckpointTime[trackSegment] = 0.0;
}	

function ParseDebugSvgFile(ct)
{
	var length = ct.length;
	var lastsix = ct.substr(length-7, 6);
	if (lastsix != "</svg>") {
		ct = ct + "</svg>";
	}
	var canvas = document.getElementById('splinesCanvas');
	var ctx = canvas.getContext('2d');
	var DOMURL = window.URL || window.webkitURL || window;

	var svg = new Blob([ct], {type: 'image/svg+xml;charset=utf-8'});
	var url = DOMURL.createObjectURL(svg);
	img.onload = function () {
		DOMURL.revokeObjectURL(url);
	};
	img.src = url;
	
/*
	var lines = ct.split('\r\n'); 
	/*
		looking for:
			<line x1="575.338989" y1="-630.817017" x2="571.432007" y2="-617.916016" stroke="black" stroke-width="0.020000" />
			<circle cx="571.223694" cy="-619.452820" r="0.300000" stroke="black" fill="red" stroke-width="0.010000" />
			<polyline points="20,20 40,25 60,40 80,120 120,140 200,180" style="fill:none;stroke:black;stroke-width:3" />
	* /
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search("polyline points=") != -1) {
			var values = lines[i].getNums(); 
			var numPoints = (values.length -1) / 2;
			var startPos = lines[i].search("stroke:")+7;
			var color = lines[i].substr(startPos);
			color = color.substr(0, color.search('" '));
			//AddDebugPolyline(values[1], values[3], values[5], values[7], color, values[8]);
		}
		if (lines[i].search("<line x1=") != -1) {
			var values = lines[i].getNums(); 
			var startPos = lines[i].search("stroke=")+8;
			var color = lines[i].substr(startPos);
			color = color.substr(0, color.search('" '));
			AddDebugLine(values[1], values[3], values[5], values[7], color, values[8]);
		}
		if (lines[i].search("<circle cx=") != -1) {
			var values = lines[i].getNums(); 
			var startPos = lines[i].search("stroke=")+8;
			var color = lines[i].substr(startPos);
			color = color.substr(0, color.search('" '));
			startPos = lines[i].search("fill=")+6;
			var fill = lines[i].substr(startPos);
			fill = fill.substr(0, fill.search('" '));
			AddDebugCircle(values[0], values[1], values[2], color, fill, values[3]);
		}
	}
*/
}

function CsvFileType(lines)
{
	/*
		expecting: 
			lines[0] = Obj Name:catalunya_track		
			lines[1] = X Pos	 Y Pos	 Z Pos
		or:
			lines[0] = index,latitude,longitude,altitude,xPos,yPos,smoothedZ,progress,selected
			lines[1] = datun point values
	*/
	var fileViaMax;
	var headerNumLines;
	var itemsPerLine;
	var xOffset;
	var yOffset;
	var zOffset;
	var dOffset;
	
	if (lines[0].search("Obj Name") == 0) {
		fileViaMax = true;
		headerNumLines = 2;
		itemsPerLine = 3;
		xOffset = 0;
		yOffset = 1;
		zOffset = 2;
	}
	if (lines[0].search("index,") == 0) {
		// file came direct from MotoGPTrackTracer
		fileViaMax = false;
		headerNumLines = 2;
		itemsPerLine = lines[1].getNums().length; // 8 or 9(newer version with selected flag)
		xOffset = 4;
		yOffset = 5;
		zOffset = 6;
	}
	dOffset = itemsPerLine; // will be appended at the end
	
	var numSplinePoints = Math.floor((lines.length - headerNumLines) / 2); // exclude the header and ignore any odd numbered line at end of file (may be blank)
	
	return {
		fileViaMax : fileViaMax,
		headerNumLines : headerNumLines,
		itemsPerLine : itemsPerLine,
		numSplinePoints : numSplinePoints,
		xOffset : xOffset,
		yOffset : yOffset,
		zOffset : zOffset,
		dOffset : dOffset
	}
}

function CsvFileToPointList(ct)
{
	var lines = ct.split('\n'); 
	var csvType = CsvFileType(lines);
	
	var numSplinePoints = csvType.numSplinePoints;
	var pointList = [];
	var pointIndex = 0;
	
	var i = csvType.headerNumLines;
	var itemsPerLine = csvType.itemsPerLine;
	
	while (i < lines.length - 1) {
		var leftPos = lines[i].getNums(); // left edge
		if (leftPos.length != itemsPerLine) alert("line " + i + " expecting " + itemsPerLine + " values, read: " + lines[i]);
		
		var rightPos = lines[i+1].getNums(); // right edge
		if (rightPos.length != itemsPerLine) alert("line " + i + " expecting " + itemsPerLine + " values, read: " + lines[i]);
		
		if (!csvType.fileViaMax) {
			leftPos = leftPos.splice(4,3);
			rightPos = rightPos.splice(4,3);
		}
		if (0) {
			//left handed case
			pointList[pointIndex] = [[leftPos[0],leftPos[1],leftPos[2]],
									[((leftPos[0] + rightPos[0])/2), ((leftPos[1] + rightPos[1])/2), ((leftPos[2] + rightPos[2])/2)],
									[rightPos[0],rightPos[1],rightPos[2]]];
		}
		else {
			// negate x to switch to right handed
			pointList[pointIndex] = [[-leftPos[0],leftPos[1],leftPos[2]],
									[-((leftPos[0] + rightPos[0])/2), ((leftPos[1] + rightPos[1])/2), ((leftPos[2] + rightPos[2])/2)],
									[-rightPos[0],rightPos[1],rightPos[2]]];
		}
		pointIndex++;
		i += 2;
	}
	return pointList;
}

function PointListToFrictionSplineIni(pointList)
{
	var numSplinePoints = pointList.length;

	var iniString = "";
	iniString += "[Track]\r\n";
	iniString += "\r\n";
	iniString += "NumberOfSegments = " + numSplinePoints + "\r\n";
	iniString += "StartSegment = 1\r\n";
	iniString += "EndSegment = " + numSplinePoints + "\r\n";

	iniString += "\r\n";
	iniString += "GateShape = Radius\r\n";
	iniString += "GateWidth = 0.200\r\n";
	iniString += "GateHeight = 1.000\r\n";

	var segmentIndex = 0;

	for (i = 0; i < numSplinePoints; i++) {
		segmentIndex++;
		iniString += "\r\n\r\n";
		iniString += "[TrackSegment" + segmentIndex + "]" + "\r\n\r\n";

		var leftPoint = pointList[i][0];
		var midPoint = pointList[i][1];
		var rightPoint = pointList[i][2];
		// add the points with a y z swap
		iniString += "Position = " + midPoint[0].toFixed(3) + ", " + midPoint[2].toFixed(3) + ", " + midPoint[1] + "\r\n";
		iniString += "LeftEdgePosition = " + leftPoint[0] + ", " + leftPoint[2] + ", " + leftPoint[1] + "\r\n";
		iniString += "RightEdgePosition = " + rightPoint[0] + ", " + rightPoint[2] + ", " + rightPoint[1] + "\r\n";

		iniString += "Waypoint = " + ((segmentIndex == 1) ? "True" : "False") + "\r\n";
		iniString += "SequenceNumber = 0\r\n";
		iniString += "NextGateSequenceNumber = 1\r\n";
		iniString += "GateRadius = 100.000\r\n";
		iniString += "OuterGateRadius = 120.000\r\n";
		iniString += "GatePosition = 0.000, 0.000, 0.000\r\n";
		iniString += "GateLook = 1.000, 0.000, 0.000\r\n";
		iniString += "TargetSpeed = -1.0\r\n";
		iniString += "LeftTrackWidth = 6.000\r\n";
		iniString += "RightTrackWidth = 6.000\r\n";
		iniString += "OuterFriction = 1\r\n";
		iniString += "LastSegment = " + ((segmentIndex == 1) ? numSplinePoints : segmentIndex - 1) + "\r\n";
		iniString += "NextSegment = " + ((segmentIndex == numSplinePoints) ? 1 : segmentIndex + 1) + "\r\n";
		iniString += "Branch = 0\r\n";
		iniString += "AIAssist = 0.00000\r\n";
		//iniString += "TurnDirection = 0\r\n";
		//iniString += "Curvature = 0.0\r\n";
		//iniString += "CheckpointTime = 0.000\r\n";
		//iniString += "BestCheckpointTime[trackSegment] = 0.000\r\n";
		//iniString += "MaxExtraCheckpointTime = 0.000\r\n";
	}
	return iniString;
}

function PointListToAiSplineIni(pointList)
{
	var cr = CalculateCurvatureValues(pointList);
	/*	
		cr.curvatureValues,
		cr.changeIndices,
		cr.numChangesFound
		cr.numSignificantPoints
	*/

	var iniString = "";

	var numOriginalPoints = pointList.length;
	var numSplinePoints = cr.numSignificantPoints;

	iniString += "[Track]\r\n";
	iniString += "\r\n";
	iniString += "NumberOfSegments = " + cr.numSignificantPoints + "\r\n";
	iniString += "StartSegment = 1\r\n";
	iniString += "EndSegment = " + cr.numSignificantPoints + "\r\n";

	iniString += "\r\n";
	iniString += "GateShape = Radius\r\n";
	iniString += "GateWidth = 0.200\r\n";
	iniString += "GateHeight = 1.000\r\n";
	iniString += "InitialCheckpointTime = 0.000\r\n";
	iniString += "LeftoverTimeMultiplier = 0.200\r\n";
	iniString += "TimeDecayRatePerLap = 0.300\r\n";

	var segmentIndex = 0;
	var lineIndex = 2;
	var k = 0;
	var skipCount = maxSkipCount; // don't skip the first point

	for (var j = 0; j < numOriginalPoints; j++) {
		//var radius = cr.curvatureValues[j] * 1000;
		var addThePoint = false;
		var isATransitionPoint = false;
		if (j == cr.changeIndices[k]) {
			if (cr.curvatureValues[j] > transitionThreshold) {
				addThePoint = true;
				isATransitionPoint = true;
				skipCount = 0;
			}
			else if (skipCount == maxSkipCount) {
				addThePoint = true;
				skipCount = 0;
			}
			else {
				skipCount++;
			}
			k++;
		}
		else if (skipCount == maxSkipCount) {
			addThePoint = true;
			skipCount = 0;
		}
		else {
			skipCount++;
		}
		if (addThePoint) {
			segmentIndex++;
			iniString += "\r\n\r\n";
			iniString += "[TrackSegment" + segmentIndex + "]" + "\r\n\r\n";

			var leftPoint = pointList[j][0];
			var midPoint = pointList[j][1];
			var rightPoint = pointList[j][2];
			// add the points with a y z swap
			iniString += "Position = " + midPoint[0].toFixed(3) + ", " + midPoint[2].toFixed(3) + ", " + midPoint[1] + "\r\n";
			iniString += "LeftEdgePosition = " + leftPoint[0] + ", " + leftPoint[2] + ", " + leftPoint[1] + "\r\n";
			iniString += "RightEdgePosition = " + rightPoint[0] + ", " + rightPoint[2] + ", " + rightPoint[1] + "\r\n";

			iniString += "Waypoint = " + ((segmentIndex == 1) ? "True" : "False") + "\r\n";
			iniString += "SequenceNumber = 0\r\n";
			iniString += "NextGateSequenceNumber = 1\r\n";
			iniString += "GateRadius = 100.000\r\n";
			iniString += "OuterGateRadius = 120.000\r\n";
			iniString += "GatePosition = 0.000, 0.000, 0.000\r\n";
			iniString += "GateLook = 1.000, 0.000, 0.000\r\n";
			iniString += "TargetSpeed = -1.0\r\n";
			iniString += "LeftTrackWidth = 6.000\r\n";
			iniString += "RightTrackWidth = 6.000\r\n";
			iniString += "OuterFriction = 1\r\n";
			iniString += "LastSegment = " + ((segmentIndex == 1) ? numSplinePoints : segmentIndex - 1) + "\r\n";
			iniString += "NextSegment = " + ((segmentIndex == numSplinePoints) ? 1 : segmentIndex + 1) + "\r\n";
			iniString += "Branch = 0\r\n";
			iniString += "AIAssist = 0.00000\r\n";
			iniString += "AchievableDeceleration0 = -1.0\r\n";
			iniString += "AchievableDeceleration1 = -1.0\r\n";
			iniString += "AchievableDeceleration2 = -1.0\r\n";
			iniString += "AchievableDeceleration3 = -1.0\r\n";
			
			if (isATransitionPoint) {
				/*
					one of the curvature maxima set a TransitionSpeed
				*/
				iniString += "TransitionSpeed = 100.0\r\n";
			}
			else {
				/*
					don't set a transition point
				*/
				iniString += "TransitionSpeed = 0.0\r\n";
			}
			iniString += "TargetGear = 0\r\n";
			iniString += "MaxGear = 0\r\n";
			iniString += "Flags = 0\r\n";
			iniString += "TurnDirection	= 0\r\n";		
			iniString += "Curvature	= 0.000\r\n";		
			iniString += "CheckpointTime = 0.000\r\n";		
			iniString += "BestCheckpointTime = 0.000\r\n";
			iniString += "MaxExtraCheckpointTime = 0.000\r\n";		
		}
	}

	return iniString;
}


function parseSingleSplineFile(ct, filename, index)
{
	var lines = ct.split('\r\n'); 
	var splineFileIndex = index;
	
	for (var i = 0; i < lines.length; i++) {
		var pos;
		var values;
		if (lines[i].search("\\[Track\\]") == 0) {
			splineData = new SplineIniFile(filename);
			SplineIniFiles[splineFileIndex] = splineData;
		}
		if (lines[i].search("NumberOfSegments") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in NumberOfSegments " + lines[i]);
			splineData.NumberOfSegments = values[0];
		}
		if (lines[i].search("StartSegment") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in StartSegment " + lines[i]);
			splineData.StartSegment = values[0];
		}
		if (lines[i].search("EndSegment") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in EndSegment " + lines[i]);
			splineData.EndSegment = values[0];
		}
		if (lines[i].search("GateShape") == 0) {
			if (lines[i].search("Radius") == 0) alert("error in GateShape " + lines[i]);
			splineData.GateShape = "Radius";
		}
		if (lines[i].search("GateWidth") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in GateWidth " + lines[i]);
			splineData.GateWidth = values[0];
		}
		if (lines[i].search("GateHeight") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in GateHeight " + lines[i]);
			splineData.GateHeight = values[0];
		}
		if (lines[i].search("InitialCheckpointTime") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in InitialCheckpointTime " + lines[i]);
			splineData.InitialCheckpointTime = values[0];
		}
		if (lines[i].search("LeftoverTimeMultiplier") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in LeftoverTimeMultiplier " + lines[i]);
			splineData.LeftoverTimeMultiplier = values[0];
		}
		if (lines[i].search("TimeDecayRatePerLap") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in TimeDecayRatePerLap " + lines[i]);
			splineData.TimeDecayRatePerLap = values[0];
		}
	
		if (lines[i].search("\\[TrackSegment") == 0) {
			values = lines[i].getNums();
			if (values.length != 1) alert("error in TrackSegment " + lines[i]);
			trackSegment = values[0] - 1; // TrackSegments are 1 based, array is 0 based
			splineData.initialize(trackSegment);
		}
		if (lines[i].search("Position = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in Position " + lines[i]);
			splineData.Position[trackSegment] = values.slice(0);
		}
		if (lines[i].search("LeftEdgePosition = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in LeftEdgePosition " + lines[i]);
			splineData.LeftEdgePosition[trackSegment] = values.slice(0);
		}
		if (lines[i].search("RightEdgePosition = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in RightEdgePosition " + lines[i]);
			splineData.RightEdgePosition[trackSegment] = values.slice(0);
		}
		if (lines[i].search("Tangent = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in Tangent " + lines[i]);
			splineData.Tangent[trackSegment] = values.slice(0);
		}
		if (lines[i].search("Waypoint = ") == 0) {
			if(lines[i].search(/true/i) != -1) {
				splineData.Waypoint[trackSegment] = 1;
			}
			else if(lines[i].search(/false/i) != -1) {
				splineData.Waypoint[trackSegment] = 0;
			}
			else {
				alert("TrackSegment" + trackSegment + " error in Waypoint " + lines[i]);
				splineData.Waypoint[trackSegment] = 0;
			}
		}
		if (lines[i].search("SequenceNumber = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in SequenceNumber " + lines[i]);
			splineData.SequenceNumber[trackSegment] = values[0];
		}
		if (lines[i].search("NextGateSequenceNumber = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in NextGateSequenceNumber " + lines[i]);
			splineData.NextGateSequenceNumber[trackSegment] = values[0];
		}
		if (lines[i].search("GateRadius = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in GateRadius " + lines[i]);
			splineData.GateRadius[trackSegment] = values[0];
		}
		if (lines[i].search("OuterGateRadius = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in OuterGateRadius " + lines[i]);
			splineData.OuterGateRadius[trackSegment] = values[0];
		}
		if (lines[i].search("GatePosition = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in GatePosition " + lines[i]);
			splineData.GatePosition[trackSegment] = values.slice(0);
		}
		if (lines[i].search("GateLook = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 3) alert("TrackSegment" + trackSegment + " error in GateLook " + lines[i]);
			splineData.GateLook[trackSegment] = values.slice(0);
		}
		if (lines[i].search("TargetSpeed = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TargetSpeed " + lines[i]);
			splineData.TargetSpeed[trackSegment] = values[0];
		}
		if (lines[i].search("TransitionSpeed = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TransitionSpeed " + lines[i]);
			splineData.TransitionSpeed[trackSegment] = values[0];
		}
		if (lines[i].search("TargetGear = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TargetGear " + lines[i]);
			splineData.TargetGear[trackSegment] = values[0];
		}
		if (lines[i].search("MaxGear = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in MaxGear " + lines[i]);
			splineData.MaxGear[trackSegment] = values[0];
		}
		if (lines[i].search("Flags = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in Flags " + lines[i]);
			splineData.Flags[trackSegment] = values[0];
		}
		if (lines[i].search("AchievableDeceleration = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration " + lines[i]);
			splineData.AchievableDeceleration0[trackSegment] = values[0];
			splineData.AchievableDeceleration1[trackSegment] = values[0];
			splineData.AchievableDeceleration2[trackSegment] = values[0];
			splineData.AchievableDeceleration3[trackSegment] = values[0];
		}
		if (lines[i].search("AchievableDeceleration0 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration0 " + lines[i]);
			splineData.AchievableDeceleration0[trackSegment] = values[1];
		}
		if (lines[i].search("AchievableDeceleration1 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration1 " + lines[i]);
			splineData.AchievableDeceleration1[trackSegment] = values[1];
		}
		if (lines[i].search("AchievableDeceleration2 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration2 " + lines[i]);
			splineData.AchievableDeceleration2[trackSegment] = values[1];
		}
		if (lines[i].search("AchievableDeceleration3 = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 2) alert("TrackSegment" + trackSegment + " error in AchievableDeceleration3 " + lines[i]);
			splineData.AchievableDeceleration3[trackSegment] = values[1];
		}
		if (lines[i].search("MaxSpeed = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in MaxSpeed " + lines[i]);
			splineData.MaxSpeed[trackSegment] = values[0];
		}
		if (lines[i].search("LeftTrackWidth = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in LeftTrackWidth " + lines[i]);
			splineData.LeftTrackWidth[trackSegment] = values[0];
		}
		if (lines[i].search("RightTrackWidth = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in RightTrackWidth " + lines[i]);
			splineData.RightTrackWidth[trackSegment] = values[0];
		}
		if (lines[i].search("OuterFriction = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in OuterFriction " + lines[i]);
			splineData.OuterFriction[trackSegment] = values[0];
		}
		if (lines[i].search("InnerFriction = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in InnerFriction " + lines[i]);
			splineData.InnerFriction[trackSegment] = values[0];
		}
		if (lines[i].search("LastSegment = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in LastSegment " + lines[i]);
			splineData.LastSegment[trackSegment] = values[0];
		}
		if (lines[i].search("NextSegment = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in NextSegment " + lines[i]);
			splineData.NextSegment[trackSegment] = values[0];
		}
		if (lines[i].search("Branch = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in Branch " + lines[i]);
			splineData.Branch[trackSegment] = values[0];
		}
		if (lines[i].search("AIAssist = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in AIAssist " + lines[i]);
			splineData.AIAssist[trackSegment] = values[0];
		}
		if (lines[i].search("TurnDirection = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in TurnDirection " + lines[i]);
			// 1 = Left, 2 = Right, 3 = LeftBeforeRight, 4 = RightBeforeLeft
			splineData.TurnDirection[trackSegment] = values[0];
		}
		if (lines[i].search("Curvature = ") == 0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in Curvature " + lines[i]);
			splineData.Curvature[trackSegment] = values[0];
		}
		if (lines[i].search("CheckpointTime = ") == 0.0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in CheckpointTime " + lines[i]);
			splineData.CheckpointTime[trackSegment] = values[0];
		}
		if (lines[i].search("BestCheckpointTime = ") == 0.0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in BestCheckpointTime " + lines[i]);
			splineData.BestCheckpointTime[trackSegment] = values[0];
		}
		if (lines[i].search("MaxExtraCheckpointTime = ") == 0.0) {
			var values = lines[i].getNums();
			if (values.length != 1) alert("TrackSegment" + trackSegment + " error in MaxExtraCheckpointTime " + lines[i]);
			splineData.MaxExtraCheckpointTime[trackSegment] = values[0];
		}
	}
	var n = splineData.NumberOfSegments;
	for (var i = 0; i < n; i++) {
		if (splineData.TransitionSpeed[i]) {
			// one of our brake points, calculate the curvature
			var i1 = (i == 0) ? n - 1 : i - 1;
			var i3 = (i == n - 1) ? 0 : i + 1;
			var p1 = [splineData.Position[i1][0], splineData.Position[i1][2]];
			var p2 = [splineData.Position[i][0], splineData.Position[i][2]];
			var p3 = [splineData.Position[i3][0], splineData.Position[i3][2]];
			splineData.Curvature[i] = Calculate2DCurvature(p1, p2, p3) * 100;
		}
	}
}

function AddNewPoint(splinePath, insertAt)
{
	for (var index = 0; index < SplineIniFiles.length; index++) {
		var splineData = SplineIniFiles[index];
		if (splineData && splineData.splinePath == splinePath) {
			splineData.Waypoint.splice(insertAt, 0, false);
			splineData.SequenceNumber.splice(insertAt, 0, 0);
			splineData.NextGateSequenceNumber.splice(insertAt, 0, 0);

			splineData.GateRadius.splice(insertAt, 0, 0.0);
			splineData.OuterGateRadius.splice(insertAt, 0, 0.0);
			//GatePosition, 3);
			//GateLook, 3);
			splineData.TargetSpeed.splice(insertAt, 0, -1.0);
			splineData.TransitionSpeed.splice(insertAt, 0, 0);
			splineData.TargetGear.splice(insertAt, 0, 0.0);
			splineData.MaxGear.splice(insertAt, 0, 0.0);
			splineData.Flags.splice(insertAt, 0, 0);
			splineData.AchievableDeceleration0.splice(insertAt, 0, 0.0);
			splineData.AchievableDeceleration1.splice(insertAt, 0, 0.0);
			splineData.AchievableDeceleration2.splice(insertAt, 0, 0.0);
			splineData.AchievableDeceleration3.splice(insertAt, 0, 0.0);
			splineData.MaxSpeed.splice(insertAt, 0, 0.0);
			splineData.AIAssist.splice(insertAt, 0, 0.0);
			splineData.TurnDirection.splice(insertAt, 0, 0.0);
			splineData.Curvature.splice(insertAt, 0, 0.0);
			splineData.CheckpointTime.splice(insertAt, 0, 0.0);
			splineData.BestCheckpointTime.splice(insertAt, 0, 0.0);
			splineData.MaxExtraCheckpointTime.splice(insertAt, 0, 0.0);
		}
	}
}

function RemovePoint(splinePath, removeAt)
{
	for (var index = 0; index < SplineIniFiles.length; index++) {
		var splineData = SplineIniFiles[index];
		if (splineData && splineData.splinePath == splinePath) {
			splineData.Waypoint.splice(removeAt, 1);
			splineData.SequenceNumber.splice(removeAt, 1);
			splineData.NextGateSequenceNumber.splice(removeAt, 1);

			splineData.GateRadius.splice(removeAt, 1);
			splineData.OuterGateRadius.splice(removeAt, 1);
			//GatePosition, 3);
			//GateLook, 3);
			splineData.TargetSpeed.splice(removeAt, 1);
			splineData.TransitionSpeed.splice(removeAt, 1);
			splineData.TargetGear.splice(removeAt, 1);
			splineData.MaxGear.splice(removeAt, 1);
			splineData.Flags.splice(removeAt, 1);
			splineData.AchievableDeceleration0.splice(removeAt, 1);
			splineData.AchievableDeceleration1.splice(removeAt, 1);
			splineData.AchievableDeceleration2.splice(removeAt, 1);
			splineData.AchievableDeceleration3.splice(removeAt, 1);
			splineData.MaxSpeed.splice(removeAt, 1);
			splineData.AIAssist.splice(removeAt, 1);
			splineData.TurnDirection.splice(removeAt, 1);
			splineData.Curvature.splice(removeAt, 1);
			splineData.CheckpointTime.splice(removeAt, 1);
			splineData.BestCheckpointTime.splice(removeAt, 1);
			splineData.MaxExtraCheckpointTime.splice(removeAt, 1);
		}
	}
}

function getMinMax(points, numPoints, index, minmax)
{
	for (var i = 0; i < numPoints; i++) {
		if (points[i][index] < minmax[0]) minmax[0] = points[i][index];
		if (points[i][index] > minmax[1]) minmax[1] = points[i][index];
	}
	return minmax;
}

function GetDisplayTranslationForSplineFiles()
{
	var minMaxX = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var minMaxZ = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var splineData;
	
	for (index = 0; index < 2; index++) {
		splineData = SplineIniFiles[index];
		if (splineData) {
			var numSplinePoints = splineData.NumberOfSegments;
			if (splineData.filename.search("_ai") != -1) {
				/*
					the ai file, we only care about the position spline
				*/
				minMaxX = getMinMax(splineData.Position, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.Position, numSplinePoints, 2, minMaxZ);
			}
			else if (splineData.filename.search("_data") != -1) {
				/*
					we care about the left and right edge
				*/
				minMaxX = getMinMax(splineData.Position, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.Position, numSplinePoints, 2, minMaxZ);
				minMaxX = getMinMax(splineData.LeftEdgePosition, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.LeftEdgePosition, numSplinePoints, 2, minMaxZ);
				minMaxX = getMinMax(splineData.RightEdgePosition, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.RightEdgePosition, numSplinePoints, 2, minMaxZ);
			}
			else if (splineData.filename.search("_friction1") != -1) {
				/*
					we care about the left and right edge
				*/
				minMaxX = getMinMax(splineData.Position, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.Position, numSplinePoints, 2, minMaxZ);
				minMaxX = getMinMax(splineData.LeftEdgePosition, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.LeftEdgePosition, numSplinePoints, 2, minMaxZ);
				minMaxX = getMinMax(splineData.RightEdgePosition, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.RightEdgePosition, numSplinePoints, 2, minMaxZ);
			}
			else {
				/*
					we care about the left and right edge
				*/
				minMaxX = getMinMax(splineData.LeftEdgePosition, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.LeftEdgePosition, numSplinePoints, 2, minMaxZ);
				minMaxX = getMinMax(splineData.RightEdgePosition, numSplinePoints, 0, minMaxX);
				minMaxZ = getMinMax(splineData.RightEdgePosition, numSplinePoints, 2, minMaxZ);
			}
		}
	
	}
	return [minMaxX[0], minMaxZ[0], -1, -1];
}

function AddSplinesToEditor(index)
{
	var splineData = SplineIniFiles[index];
	var numSplinePoints = splineData.NumberOfSegments;
	
	if (splineData.filename.search("_ai") != -1) {
		/*
			the ai file, we only care about the position spline
		*/
		splineData.splinePath = AddSplineToEditor(index, splineData.Position, numSplinePoints, true, 0, 2, 0.2, "cyan", editableKnotRadius, splineData.TransitionSpeed, false);
		splineData.splinePath = AddSplineToEditor(index, splineData.Position, numSplinePoints, true, 0, 2, 0.2, "green", editableKnotRadius, splineData.TransitionSpeed, true);
	}
	else if (splineData.filename.search("_data") != -1) {
		/*
			we care about the left and right edge
		*/
		AddLinePathToEditor(splineData.Position, numSplinePoints, true, 0, 2, 0.2, "gold");
		AddLinePathToEditor(splineData.LeftEdgePosition, numSplinePoints, true, 0, 2, 0.2, "black");
		AddLinePathToEditor(splineData.RightEdgePosition, numSplinePoints, true, 0, 2, 0.2, "blue");
	}
	else if (splineData.filename.search("_friction1") != -1 || splineData.filename.search(".csv") != -1) {
		/*
			we care about the left and right edge
		*/
		//AddLinePathToEditor(splineData.Position, numSplinePoints, 0, 2, "gold", false);
		AddLinePathToEditor(splineData.LeftEdgePosition, numSplinePoints, true, 0, 2, 0.2, "black");
		AddLinePathToEditor(splineData.RightEdgePosition, numSplinePoints, true, 0, 2, 0.2, "blue");
		var position = [];
		position[0] = splineData.LeftEdgePosition[0];
		position[1] = splineData.RightEdgePosition[0];
		AddLinePathToEditor(position, 2, false, 0, 2, 0.2, "red");
		for (var i = 1; i < numSplinePoints; i++) {
			position[0] = splineData.LeftEdgePosition[i];
			position[1] = splineData.RightEdgePosition[i];
			AddLinePathToEditor(position, 2, false, 0, 2, 0.2, "black");
		}
	}
	else {
		/*
			we care about the left and right edge
		*/
		AddLinePathToEditor(splineData.LeftEdgePosition, numSplinePoints, true, 0, 2, 0.2, "red", false);
		AddLinePathToEditor(splineData.RightEdgePosition, numSplinePoints, true, 0, 2, 0.2, "red", false);
	}
}

function formatVector(name, item, precision)
{
	return name + " = " + item[0].toFixed(precision) + ", " + item[1].toFixed(precision) + ", " + item[2].toFixed(precision) + "\r\n";
}	

function GetCurrentSplineIniData(index)
{
	var iniString = "";
	var splineData = SplineIniFiles[index];
	if (splineData) {
		var numSplinePoints = splineData.splinePath.K.length - 1;//we subtract 1 because the last point is added to the SplinePath for closure;

		iniString += "[Track]\r\n";
		iniString += "\r\n";
		iniString += "NumberOfSegments = " + numSplinePoints + "\r\n";
		iniString += "StartSegment = 1\r\n";//" + splineData.StartSegment + "\r\n";
		iniString += "EndSegment = " + numSplinePoints + "\r\n";//splineData.EndSegment + "\r\n";

		iniString += "\r\n";
		iniString += "GateShape = " + splineData.GateShape + "\r\n";
		iniString += "GateWidth = " + splineData.GateWidth.toFixed(3) + "\r\n";
		iniString += "GateHeight = " + splineData.GateHeight.toFixed(3) + "\r\n";
		iniString += "InitialCheckpointTime = " + splineData.InitialCheckpointTime.toFixed(3) + "\r\n";
		iniString += "LeftoverTimeMultiplier = " + splineData.LeftoverTimeMultiplier.toFixed(3) + "\r\n";
		iniString += "TimeDecayRatePerLap = " + splineData.TimeDecayRatePerLap.toFixed(3) + "\r\n";
		iniString += "LapTime0 = 0.000\r\n";
		iniString += "LapTime1 = 0.000\r\n";
		iniString += "LapTime2 = 0.000\r\n";
		iniString += "LapTime3 = 0.000\r\n";

		for (var i = 0; i < numSplinePoints; i++) {
			var trackSegment = i;
			iniString += "\r\n\r\n";
			iniString += "[TrackSegment" + (i+1) + "]" + "\r\n\r\n";
			
			var point = [];
			point[0] = splineData.splinePath.K[i].point[0];
			point[1] = 263.7;//just a bogus value, it's not important, the y's are interpolated on load into the game and not created here when we create a new point
			point[2] = splineData.splinePath.K[i].point[1];
			
			var referenceIndex = i;//splineData.splinePath.K[i].referenceIndex;
			
			iniString += formatVector("Position", point, 3);

			if (referenceIndex != -1) {
				//iniString += formatVector("LeftEdgePosition", splineData.LeftEdgePosition[referenceIndex], 3);
				//iniString += formatVector("RightEdgePosition", splineData.RightEdgePosition[referenceIndex], 3);
				//iniString += formatVector("Tangent", splineData.Tangent[referenceIndex], 3);
				iniString += "\r\n";

				iniString += "Waypoint = " + ((splineData.Waypoint[referenceIndex])? "True":"False") + "\r\n";
				iniString += "SequenceNumber = 0\r\n";//" + splineData.SequenceNumber [referenceIndex]+ "\r\n";
				iniString += "NextGateSequenceNumber = 0\r\n"//" + splineData.NextGateSequenceNumber [referenceIndex]+ "\r\n";

				if (splineData.Waypoint[referenceIndex]) {
					iniString += "GateRadius = " + splineData.GateRadius[referenceIndex].toFixed(3) + "\r\n";
					iniString += "OuterGateRadius = " + splineData.OuterGateRadius[referenceIndex].toFixed(3) + "\r\n";
					//iniString += formatVector("GatePosition", splineData.GatePosition[referenceIndex], 3);
					//iniString += formatVector("GateLook", splineData.GateLook[referenceIndex], 3);
				}

				iniString += "\r\n";
				iniString += "TargetSpeed = " + splineData.TargetSpeed[referenceIndex].toFixed(1) + "\r\n";
				iniString += "TransitionSpeed = " + splineData.TransitionSpeed[referenceIndex].toFixed(1) + "\r\n";
				iniString += "TargetGear = " + splineData.TargetGear[referenceIndex] + "\r\n";
				iniString += "MaxGear = " + splineData.MaxGear[referenceIndex] + "\r\n";
				iniString += "Flags = " + splineData.Flags[referenceIndex] + "\r\n";
				iniString += "AchievableDeceleration0 = " + splineData.AchievableDeceleration0[referenceIndex].toFixed(5) + "\r\n";
				iniString += "AchievableDeceleration1 = " + splineData.AchievableDeceleration1[referenceIndex].toFixed(5) + "\r\n";
				iniString += "AchievableDeceleration2 = " + splineData.AchievableDeceleration2[referenceIndex].toFixed(5) + "\r\n";
				iniString += "AchievableDeceleration3 = " + splineData.AchievableDeceleration3[referenceIndex].toFixed(5) + "\r\n";
				iniString += "MaxSpeed = " + splineData.MaxSpeed[referenceIndex].toFixed(1) + "\r\n";
				if (splineData.AIAssist [referenceIndex] != -1) iniString += "AIAssist = " + splineData.AIAssist[referenceIndex].toFixed(5) + "\r\n";
				iniString += "TurnDirection = " + splineData.TurnDirection[referenceIndex] + "\r\n";
				iniString += "Curvature = " + splineData.Curvature[referenceIndex].toFixed(3) + "\r\n";
				iniString += "CheckpointTime = " + splineData.CheckpointTime[referenceIndex].toFixed(3) + "\r\n";
				iniString += "CheckpointTime1 = 0.000\r\n";
				iniString += "CheckpointTime2 = 0.000\r\n";
				iniString += "CheckpointTime3 = 0.000\r\n";
				iniString += "BestCheckpointTime = " + splineData.BestCheckpointTime[referenceIndex].toFixed(3) + "\r\n";
				//iniString += "MaxExtraCheckpointTime = " + splineData.MaxExtraCheckpointTime[referenceIndex].toFixed(3) + "\r\n";
				//iniString += "LeftTrackWidth = " + splineData.LeftTrackWidth[referenceIndex].toFixed(3) + "\r\n";
				//iniString += "RightTrackWidth = " + splineData.RightTrackWidth[referenceIndex].toFixed(3) + "\r\n";

				//iniString += "\r\n";
				//if (splineData.OuterFriction[referenceIndex] != -1) iniString += "OuterFriction = " + splineData.OuterFriction[referenceIndex] + "\r\n";
				//if (splineData.InnerFriction[referenceIndex] != -1) iniString += "InnerFriction = " + splineData.InnerFriction[referenceIndex] + "\r\n";
			}
			else {
				iniString += "Waypoint = False\r\n";
				iniString += "SequenceNumber = 0\r\n";//" + splineData.SequenceNumber [referenceIndex]+ "\r\n";
				iniString += "NextGateSequenceNumber = 0\r\n"//" + splineData.NextGateSequenceNumber [referenceIndex]+ "\r\n";
				iniString += "\r\n";
				iniString += "TargetSpeed = -1\r\n";
			}
			//iniString += "\r\n";
			var prev = (i + 1) - 1; // CHECK THIS!
			var next = (i + 1) + 1;
			if (prev < 1) prev = numSplinePoints;
			if (next > numSplinePoints) next = 1;
			iniString += "LastSegment = " + prev + "\r\n";//splineData.LastSegment[trackSegment] + "\r\n";
			iniString += "NextSegment = " + next + "\r\n";//splineData.NextSegment[trackSegment] + "\r\n";
			iniString += "Branch = 0\r\n"//" + splineData.Branch[trackSegment] + "\r\n";

		}
	}
	return iniString;
}

//C# like format string from http://joquery.com/2012/string-format-for-javascript
String.format = function() {
    // The string containing the format items (e.g. "{0}")
    // will and always has to be the first argument.
	var theString = arguments[0];
	
	// start with the second argument (i = 1)
	for (var i = 1; i < arguments.length; i++) {
		// "gm" = RegEx options for Global search (more than one instance)
		// and for Multiline search
		var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
		theString = theString.replace(regEx, arguments[i]);
    }
	
	return theString;
}

function updateCoordsDisplay(x, y)
{
	document.getElementById('position-x').value = x.toFixed(3);
	document.getElementById('position-z').value = y.toFixed(3);
}					

function showNodeInfo(options) 
{
	if (options.existingKnot) {
		var originalIndex = options.existingKnot.referenceIndex + 1;
		var currentIndex = options.knotIndex + 1;
		document.getElementById('current-index').value = currentIndex;
		if (options.existingKnot.referenceIndex == -1) {
			document.getElementById('was-info').innerHTML = "(new point)";
		} 
		else if (currentIndex == originalIndex) {
			document.getElementById('was-info').innerHTML = "";
		}
		else {
			document.getElementById('was-info').innerHTML = "(was " + originalIndex + ")";
		}
		var transitionSpeed = SplineIniFiles[options.splineReferenceIndex].TransitionSpeed[options.existingKnot.currentIndex].toFixed(5);
		document.getElementById('transition-speed').value = transitionSpeed;
		
		var targetGear = SplineIniFiles[options.splineReferenceIndex].TargetGear[options.existingKnot.currentIndex];
		document.getElementById('target-gear').value = targetGear;
		
		var maxGear = SplineIniFiles[options.splineReferenceIndex].MaxGear[options.existingKnot.currentIndex];
		document.getElementById('max-gear').value = maxGear;
		
		var flags = SplineIniFiles[options.splineReferenceIndex].Flags[options.existingKnot.currentIndex];
		document.getElementById('flags').value = flags;
		
		var turnDirection = SplineIniFiles[options.splineReferenceIndex].TurnDirection[options.existingKnot.currentIndex];
		document.getElementById('turn-direction').value = turnDirection;

		var curvature = SplineIniFiles[options.splineReferenceIndex].Curvature[options.existingKnot.currentIndex].toFixed(3);
		document.getElementById('curvature').value = curvature;

		var checkpointTime = SplineIniFiles[options.splineReferenceIndex].CheckpointTime[options.existingKnot.currentIndex];
		document.getElementById('checkpoint-time').value = checkpointTime;

		var bestCheckpointTime = SplineIniFiles[options.splineReferenceIndex].BestCheckpointTime[options.existingKnot.currentIndex];
		document.getElementById('best-checkpoint-time').value = bestCheckpointTime;

		var maxExtraCheckpointTime = SplineIniFiles[options.splineReferenceIndex].MaxExtraCheckpointTime[options.existingKnot.currentIndex];
		document.getElementById('max-extra-checkpoint-time').value = maxExtraCheckpointTime;

		document.getElementById('position-x').value = options.existingKnot.point[0].toFixed(3);
		document.getElementById('position-z').value = options.existingKnot.point[1].toFixed(3);
	}
}
			
function startEditToSegmentData(options)
{
	Selection = options;
	
	document.getElementById('transition-speed').style.backgroundColor = "pink";
	document.getElementById('target-gear').style.backgroundColor = "pink";
	document.getElementById('max-gear').style.backgroundColor = "pink";
	document.getElementById('flags').style.backgroundColor = "pink";
	document.getElementById('turn-direction').style.backgroundColor = "pink";
	document.getElementById('curvature').style.backgroundColor = "pink";
	document.getElementById('checkpoint-time').style.backgroundColor = "pink";
	document.getElementById('max-extra-checkpoint-time').style.backgroundColor = "pink";
	document.getElementById('edit-save-button').style.visibility='visible';
	document.getElementById('edit-cancel-button').style.visibility='visible';
	SetEditingSegment(true);	
}

function cancelEditToSegmentData()
{
	/*
		restore the values from the current spline data
	*/
	var transitionSpeed = SplineIniFiles[Selection.splineReferenceIndex].TransitionSpeed[Selection.existingKnot.currentIndex].toFixed(5);
	document.getElementById('transition-speed').value = transitionSpeed;
	
	var targetGear = SplineIniFiles[Selection.splineReferenceIndex].TargetGear[Selection.existingKnot.currentIndex];
	document.getElementById('target-gear').value = targetGear;
	
	var maxGear = SplineIniFiles[Selection.splineReferenceIndex].MaxGear[Selection.existingKnot.currentIndex];
	document.getElementById('max-gear').value = maxGear;
	
	var flags = SplineIniFiles[Selection.splineReferenceIndex].Flags[Selection.existingKnot.currentIndex];
	document.getElementById('flags').value = flags;
	
	var turnDirection = SplineIniFiles[Selection.splineReferenceIndex].TurnDirection[Selection.existingKnot.currentIndex];
	document.getElementById('turn-direction').value = turnDirection;

	var curvature = SplineIniFiles[Selection.splineReferenceIndex].Curvature[Selection.existingKnot.currentIndex];
	document.getElementById('curvature').value = curvature;

	var checkpointTime = SplineIniFiles[Selection.splineReferenceIndex].CheckpointTime[Selection.existingKnot.currentIndex];
	document.getElementById('checkpoint-time').value = checkpointTime;

	var maxExtraCheckpointTime = SplineIniFiles[Selection.splineReferenceIndex].MaxExtraCheckpointTime[Selection.existingKnot.currentIndex];
	document.getElementById('max-extra-checkpoint-time').value = maxExtraCheckpointTime;

	document.getElementById('transition-speed').style.backgroundColor = "white";
	document.getElementById('target-gear').style.backgroundColor = "white";
	document.getElementById('max-gear').style.backgroundColor = "white";
	document.getElementById('flags').style.backgroundColor = "white";
	document.getElementById('turn-direction').style.backgroundColor = "white";
	document.getElementById('curvature').style.backgroundColor = "white";
	document.getElementById('checkpoint-time').style.backgroundColor = "white";
	document.getElementById('max-extra-checkpoint-time').style.backgroundColor = "white";
	document.getElementById('edit-save-button').style.visibility='hidden';
	document.getElementById('edit-cancel-button').style.visibility='hidden';
	
	if (checkpointTime != 0) {
		Selection.existingKnot.setColor("cyan");
	}
	else if (transitionSpeed != 0) {
		Selection.existingKnot.setColor("red");
	}
	else if (targetGear != 0) {
		Selection.existingKnot.setColor("pink");
	}		
	else if (maxGear != 0) {
		Selection.existingKnot.setColor("pink");
	}		
	else if (flags != 0) {
		Selection.existingKnot.setColor("pink");
	}		
	else {
		Selection.existingKnot.setColor("gold");
	}
	SetEditingSegment(false);	
}

function saveEditToSegmentData()
{
	/*
		save the values to the current spline data
	*/
	var transitionSpeed = Number(document.getElementById('transition-speed').value);
	document.getElementById('transition-speed').value = transitionSpeed;
	SplineIniFiles[Selection.splineReferenceIndex].TransitionSpeed[Selection.existingKnot.currentIndex] = transitionSpeed;
	
	var targetGear = Number(document.getElementById('target-gear').value);
	document.getElementById('target-gear').value = targetGear;
	SplineIniFiles[Selection.splineReferenceIndex].TargetGear[Selection.existingKnot.currentIndex] = targetGear;
	
	var maxGear = Number(document.getElementById('max-gear').value);
	document.getElementById('max-gear').value = maxGear;
	SplineIniFiles[Selection.splineReferenceIndex].MaxGear[Selection.existingKnot.currentIndex] = maxGear;
	
	var flags = Number(document.getElementById('flags').value);
	document.getElementById('flags').value = flags;
	SplineIniFiles[Selection.splineReferenceIndex].Flags[Selection.existingKnot.currentIndex] = flags;
	
	var turnDirection = Number(document.getElementById('turn-direction').value);
	document.getElementById('turn-direction').value = turnDirection;
	SplineIniFiles[Selection.splineReferenceIndex].TurnDirection[Selection.existingKnot.currentIndex] = turnDirection;

	var curvature = Number(document.getElementById('curvature').value);
	document.getElementById('curvature').value = curvature;
	SplineIniFiles[Selection.splineReferenceIndex].Curvature[Selection.existingKnot.currentIndex] = curvature;

	var checkpointTime = Number(document.getElementById('checkpoint-time').value);
	document.getElementById('checkpoint-time').value = checkpointTime;
	SplineIniFiles[Selection.splineReferenceIndex].CheckpointTime[Selection.existingKnot.currentIndex] = checkpointTime;

	var bestCheckpointTime = Number(document.getElementById('checkpoint-time').value);
	document.getElementById('checkpoint-time').value = bestCheckpointTime;
	SplineIniFiles[Selection.splineReferenceIndex].BestCheckpointTime[Selection.existingKnot.currentIndex] = bestCheckpointTime;

	var maxExtraCheckpointTime = Number(document.getElementById('max-extra-checkpoint-time').value);
	document.getElementById('max-extra-checkpoint-time').value = maxExtraCheckpointTime;
	SplineIniFiles[Selection.splineReferenceIndex].MaxExtraCheckpointTime[Selection.existingKnot.currentIndex] = maxExtraCheckpointTime;

	document.getElementById('transition-speed').style.backgroundColor = "white";
	document.getElementById('target-gear').style.backgroundColor = "white";
	document.getElementById('max-gear').style.backgroundColor = "white";
	document.getElementById('flags').style.backgroundColor = "white";
	document.getElementById('turn-direction').style.backgroundColor = "white";
	document.getElementById('curvature').style.backgroundColor = "white";
	document.getElementById('checkpoint-time').style.backgroundColor = "white";
	document.getElementById('max-extra-checkpoint-time').style.backgroundColor = "white";
	document.getElementById('edit-save-button').style.visibility='hidden';
	document.getElementById('edit-cancel-button').style.visibility='hidden';
	
	if (checkpointTime != 0) {
		Selection.existingKnot.setColor("cyan");
	}
	if (transitionSpeed != 0) {
		Selection.existingKnot.setColor("red");
	}
	else if (targetGear != 0) {
		Selection.existingKnot.setColor("pink");
	}		
	else if (maxGear != 0) {
		Selection.existingKnot.setColor("pink");
	}		
	else if (flags != 0) {
		Selection.existingKnot.setColor("pink");
	}		
	else {
		Selection.existingKnot.setColor("gold");
	}
	SetEditingSegment(false);	
}

function Calculate2DCurvature(
	p1,
	p2,
	p3
)
{
	var v1 = [p2[0] - p1[0], p2[1] - p1[1]];
	var v2 = [p3[0] - p2[0], p3[1] - p2[1]];
	var v3 = [p3[0] - p1[0], p3[1] - p1[1]];


	var areaOfTriangleTimes4 = 2 * Math.abs(v1[0]*v3[1] - v3[0]*v1[1]);
	var dot1 = v1[0]*v1[0] + v1[1]*v1[1];
	var dot2 = v2[0]*v2[0] + v2[1]*v2[1];
	var dot3 = v3[0]*v3[0] + v3[1]*v3[1];
	var productOfSides = Math.sqrt(dot1 * dot2 * dot3);
	var curvature = areaOfTriangleTimes4 / productOfSides;

	return curvature;
}

function CalculateCurvatureValues(pointList)
{
	var numPoints = pointList.length;
	var curvatureValues = [];
	var changeIndices = [];
	var curvatureCompareDist = 3;

	var testDist = curvatureCompareDist;
	for (var j = 0; j < numPoints; j++) {
		var prevIndex = j - testDist;
		var nextIndex = j + testDist;
		if (prevIndex < 0) prevIndex += numPoints;
		if (nextIndex > numPoints - 1) nextIndex -= numPoints;

		curvatureValues[j] = Calculate2DCurvature(pointList[prevIndex][1], pointList[j][1], pointList[nextIndex][1]);
	}

	var prevCurvature = curvatureValues[numPoints - 1];
	var isIncreasing = false;
	var isDecreasing = false;
	var numChangesFound = 0;

	for (var j = 0; j < numPoints; j++) {
		var delta = curvatureValues[j] - prevCurvature;
		if (delta == 0) {
			/*
				we are at a maxima or minima of curvature, find the center of the change
				note this is a rare case where subsequent curvatures have the same value
			*/
			var k = j + 1;
			while (k < numPoints && curvatureValues[k] == curvatureValues[k - 1]) {
				k++;
			}

			var changeIndex = (j + k - 1) / 2;

			isIncreasing = false;
			isDecreasing = false;
			changeIndices[numChangesFound++] = changeIndex;
			j = k;
		}
		else if (delta > 0.0) {
			if (isDecreasing) {
				/*
					was decreasing, now increasing
				*/
				changeIndices[numChangesFound++] = j - 1;
				isDecreasing = false;
			}
			isIncreasing = true;
		}
		else {
			if (isIncreasing) {
				/*
					was increasing, now decreasing
				*/
				changeIndices[numChangesFound++] = j - 1;
				isIncreasing = false;
			}
			isDecreasing = true;
		}
		prevCurvature = curvatureValues[j];
	}

	for (var j = 1; j < numChangesFound - 1; j++) {
		var changeToPrev = curvatureValues[changeIndices[j - 1]] - curvatureValues[changeIndices[j]];
		var changeToNext = curvatureValues[changeIndices[j + 1]] - curvatureValues[changeIndices[j]];

		if (changeToPrev > 0.0 && changeToNext > 0.0) {
			/*
				a local minima
			*/
			if (changeToPrev > changeToNext) {
				if (changeToNext < changeThreshold) {
					if (j == numChangesFound - 2) {
						/*
							remove the final minima and maxima
						*/
						numChangesFound -= 2;
						j = 0;
						continue;
					}
					else if (curvatureValues[changeIndices[j]] > curvatureValues[changeIndices[j + 2]]) {
						/*
							remove this minima and the next maxima
						*/
						for (var k = j; k < numChangesFound - 2; k++) {
							changeIndices[k] = changeIndices[k + 2];
						}
						numChangesFound -= 2;
						j = 0;
						continue;
					}
				}
			}
			else {
				if (changeToPrev < changeThreshold) {
					if (curvatureValues[changeIndices[j]] > curvatureValues[changeIndices[j - 2]]) {
						/*
							remove this minima and the prev maxima
						*/
						for (var k = j - 1; k < numChangesFound - 2; k++) {
							changeIndices[k] = changeIndices[k + 2];
						}
						numChangesFound -= 2;
						j = 0;
						continue;
					}
				}
			}
		}
	}

	var numSignificantPoints = 0;
	var k = 0;
	var skipCount = maxSkipCount; // don't skip the first point
	for (var j = 0; j < numPoints; j++) {
		if (j == changeIndices[k]) {
			if (curvatureValues[j] > transitionThreshold) {
				var radius = curvatureValues[j] * 1000;
				var point = pointList[j][1];
				AddDebugCircle(point[0], point[1], radius, "orange", "transparent");
				numSignificantPoints++;
				skipCount = 0;
			}
			else if (skipCount == maxSkipCount) {
				numSignificantPoints++;
				skipCount = 0;
			}
			else {
				skipCount++;
			}
			k++;
		}
		else if (skipCount == maxSkipCount) {
			numSignificantPoints++;
			skipCount = 0;
		}
		else {
			skipCount++;
		}
	}
	return {
		curvatureValues: curvatureValues,
		changeIndices: changeIndices,
		numChangesFound: numChangesFound,
		numSignificantPoints: numSignificantPoints
	};
}
