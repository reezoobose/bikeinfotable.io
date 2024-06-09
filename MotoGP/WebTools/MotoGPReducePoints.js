// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

var changeThreshold = 0.001;
var transitionThreshold = 0.01;
var maxSkipCount = 5;
var PointListData = null;
var CSVHeaderLine = "";
var CSVDatumLine = "";
var OriginalNumPoints = 0;

var img = new Image();

function init() 
{
    InitialiseSplineEditor(document.getElementById('splinesCanvas'));

	/*
		setup the event listeners for file selection
	*/
	var csvElement = document.getElementById('fileInputCsv');
	csvElement.addEventListener('change', readCsvFile, false);
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

function ProcessCsvData(ct, name)
{
	var basename = getBasename(name);
	
	var csvElement = document.getElementById("out-csv-filename");
	csvElement.placeholder = basename;

	PointListData = CsvFileToPointList(ct);
	
	var xOffset = PointListData.csvType.xOffset;
	var yOffset = PointListData.csvType.yOffset;
	var numPoints = PointListData.leftPointList.length;
	
	AddLinePathToEditor(PointListData.leftPointList, numPoints, true, xOffset, yOffset, 0.05, "black");
	AddLinePathToEditor(PointListData.rightPointList, numPoints, true, xOffset, yOffset, 0.05, "black");
	for (var j = 0; j < numPoints; j++) {
		var position = [];
		position[0] = [PointListData.leftPointList[j][xOffset], PointListData.leftPointList[j][yOffset]];
		position[1] = [PointListData.rightPointList[j][xOffset], PointListData.rightPointList[j][yOffset]];
		AddLinePathToEditor(position, 2, false, 0, 1, 0.05, "black");
	}
	OriginalNumPoints = numPoints;
	ReduceAndDisplay();
}

function ReduceAndDisplay()
{

	ReducePointsOnPath();
	
	updateDisplay();
	UpdateCsvPanel(PointListData);
	
	document.getElementById('original_num_points').value = OriginalNumPoints.toFixed(0);
	document.getElementById('current_num_points').value = PointListData.leftPointList.length.toFixed(0);
	document.getElementById('info').style.visibility='visible';
	document.getElementById('output_div').style.visibility='visible';
	document.getElementById('csvFilename_div').style.visibility='visible';
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

function saveCsvFile() 
{
	var element = document.getElementById("out-csv-filename");
	var fileAsText = document.getElementById("ta_csvoutput").value;
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_pointsreduced.csv";
	saveAs(blob, filename);
}

/*
function FindClosestPoint(pointListData, pos)
{
	var xOffset = pointListData.csvType.xOffset;
	var yOffset = pointListData.csvType.yOffset;
	var zOffset = pointListData.csvType.zOffset;
	
	var numPoints = pointListData.leftPointList.length;
	var dxyMin = Number.MAX_VALUE;
	var closestPos;

	for (var i = 0; i < numPoints; i++) {
		var leftPos = pointListData.leftPointList[i];

		var dx = leftPos[xOffset] - pos.x;
		var dy = leftPos[yOffset] - pos.y;
		var dxy = dx*dx + dy*dy;
		if (dxy < dxyMin) {
			closestPos = leftPos;
			dxyMin = dxy;
		}
	}
	for (var i = 0; i < numPoints; i++) {
		var rightPos = pointListData.rightPointList[i];

		var dx = rightPos[xOffset] - pos.x;
		var dy = rightPos[yOffset] - pos.y;
		var dxy = dx*dx + dy*dy;
		if (dxy < dxyMin) {
			closestPos = rightPos;
			dxyMin = dxy;
		}
	}
	return (dxyMin < 10) ? closestPos : null;
}

function showMouseInfo(pos)
{
	if (NewPointListData) {
		var xOffset = NewPointListData.csvType.xOffset;
		var yOffset = NewPointListData.csvType.yOffset;
		var zOffset = NewPointListData.csvType.zOffset;
		var dOffset = NewPointListData.csvType.dOffset;
		var iOffset = NewPointListData.csvType.iOffset;

		var point = FindClosestPoint(NewPointListData, pos);
		if (point) {
			document.getElementById('index').value = point[iOffset].toFixed(0);
			document.getElementById('xpos').value = point[xOffset].toFixed(3);
			document.getElementById('ypos').value = point[yOffset].toFixed(3);
			document.getElementById('altitude').value = point[zOffset].toFixed(3);
			document.getElementById('progress').value = point[dOffset].toFixed(3);
		}
		else {
			document.getElementById('index').value = "";
			document.getElementById('xpos').value = "";
			document.getElementById('ypos').value = "";
			document.getElementById('altitude').value = "";
			document.getElementById('progress').value = "";
		}
	}
}
*/
function BuildCsvData(pointListData)
{
	var output = CSVHeaderLine + "\n" + CSVDatumLine + "\n";
	
	var xOffset = pointListData.csvType.xOffset;
	var yOffset = pointListData.csvType.yOffset;
	var zOffset = pointListData.csvType.zOffset;
	var dOffset = pointListData.csvType.dOffset;
	
	var index = 1;
	for (var i = 0; i < pointListData.leftPointList.length; i++) {
		var leftPos = pointListData.leftPointList[i];
		output += index.toFixed(0) + ", "; 
		output += leftPos[1] + ", "; 
		output += leftPos[2] + ", "; 
		output += leftPos[3].toFixed(3) + ", "; 
		output += leftPos[4].toFixed(3) + ", "; 
		output += leftPos[5].toFixed(3) + ", "; 
		output += leftPos[6].toFixed(3) + ", "; 
		output += leftPos[7].toFixed(3) + ", "; 
		output += leftPos[8].toFixed(0) + "\n"; 
		index++;
		
		var rightPos = pointListData.rightPointList[i];
		output += index.toFixed(0) + ", "; 
		output += rightPos[1] + ", "; 
		output += rightPos[2] + ", "; 
		output += rightPos[3].toFixed(3) + ", "; 
		output += rightPos[4].toFixed(3) + ", "; 
		output += rightPos[5].toFixed(3) + ", "; 
		output += rightPos[6].toFixed(3) + ", "; 
		output += rightPos[7].toFixed(3) + ", "; 
		output += rightPos[8].toFixed(0) + "\n"; 
		index++;
	}
	return output;
}

function UpdateCsvPanel(pointListData)
{
	var output = BuildCsvData(pointListData);

	document.getElementById("ta_csvoutput").style.visibility="visible";
	document.getElementById("ta_csvoutput").value=output;
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
	var iOffset = 0;
	var	selectedOffset = 0;
	
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
		CSVHeaderLine = lines[0];
		CSVDatumLine = lines[1];
		fileViaMax = false;
		headerNumLines = 2;
		itemsPerLine = lines[1].getNums().length; // 8 or 9(newer version with selected flag)
		xOffset = 4;
		yOffset = 5;
		zOffset = 6;
		selectedOffset = 8;
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
		selectedOffset : selectedOffset,
		dOffset : dOffset,
		iOffset : iOffset
	}
}

function CsvFileToPointList(ct)
{
	var lines = ct.split('\n'); 
	var csvType = CsvFileType(lines);
	
	var numSplinePoints = csvType.numSplinePoints;
	var leftPointList = [];
	var rightPointList = [];
	var pointIndex = 0;
	
	var xOffset = csvType.xOffset;
	var yOffset = csvType.yOffset;

	var i = csvType.headerNumLines;
	var itemsPerLine = csvType.itemsPerLine;
	
	var prevLeftPos = lines[i].getNums();
	var prevRightPos = lines[i+1].getNums();
	var prevMidXY = [(prevLeftPos[xOffset] + prevRightPos[xOffset])/2, (prevLeftPos[yOffset] + prevRightPos[yOffset])/2]; 

	var progress = 0;
	while (i < lines.length - 1) {
		var leftPos = lines[i].getNums(); // left edge
		if (leftPos.length != itemsPerLine) alert("line " + i + " expecting " + itemsPerLine + " values, read: " + lines[i]);
		
		var rightPos = lines[i+1].getNums(); // right edge
		if (rightPos.length != itemsPerLine) alert("line " + i + " expecting " + itemsPerLine + " values, read: " + lines[i]);
		
		var midXY = [(leftPos[xOffset] + rightPos[xOffset])/2, (leftPos[yOffset] + rightPos[yOffset])/2]; 
		var dx = midXY[0] - prevMidXY[0];
		var dy = midXY[1] - prevMidXY[1];
		var dist = Math.sqrt(dx*dx + dy*dy);
		progress += dist;
		
		leftPos.push(progress);
		rightPos.push(progress);
		leftPointList.push(leftPos);
		rightPointList.push(rightPos);
		pointIndex++;

		prevMidXY = midXY;
		i += 2;
	}
	return {
		leftPointList: leftPointList,
		rightPointList: rightPointList,
		csvType: csvType
	};
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
	var minMaxY = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var xOffset = PointListData.csvType.xOffset;
	var yOffset = PointListData.csvType.yOffset;
	
	minMaxX = getMinMax(PointListData.leftPointList, PointListData.leftPointList.length, xOffset, minMaxX);
	minMaxY = getMinMax(PointListData.rightPointList, PointListData.rightPointList.length, yOffset, minMaxY);
	minMaxX = getMinMax(PointListData.leftPointList, PointListData.leftPointList.length, xOffset, minMaxX);
	minMaxY = getMinMax(PointListData.rightPointList, PointListData.rightPointList.length, yOffset, minMaxY);

	return [minMaxX[0], minMaxY[0], 1, -1];
}

function Vec3DSubtract(w, v)
{
	var result = [w[0] - v[0], w[1] - v[1], w[2] - v[2]];
	return result;
}

function Vec3DAdd(w, v)
{
	var result = [w[0] + v[0], w[1] + v[1], w[2] + v[2]];
	return result;
}

function Vec3DScale(v, s)
{
	var result = [v[0]*s, v[1]*s, v[2]*s];
	return result;
}

function Vec3DDotProduct(w, v)
{
    var result = v[0]*w[0] + v[1]*w[1] + v[2]*w[2];
	return result;
}

function DistPointToLine(p, v, w)
{
	var vw = Vec3DSubtract(w, v);
	var vp = Vec3DSubtract(p, v);

    var d1 = Vec3DDotProduct(vp, vw);
    var d2 = Vec3DDotProduct(vw, vw);
    var t = d1 / d2;

    var proj = Vec3DAdd(v, Vec3DScale(vw, t));
	var d = Vec3DSubtract(p, proj);
    return Math.sqrt(Vec3DDotProduct(d,d));
}

function compareNumbers(a, b)
{
    return a - b;
}

function ReducePointsOnPath()
{
	var xOffset = PointListData.csvType.xOffset;
	var yOffset = PointListData.csvType.yOffset;
	var selectedOffset = PointListData.csvType.selectedOffset;
	var maxlengths = [];
	var maxlengths2 = [];
	var minlengths = [];
	var minlengths2 = [];

    for (var i = 0; i < PointListData.leftPointList.length; i++) {
		var iNext = i + 1;
		if (i == PointListData.leftPointList.length - 1) iNext = 0;

		var dxLeft = PointListData.leftPointList[i][xOffset] - PointListData.leftPointList[iNext][xOffset];
		var dyLeft = PointListData.leftPointList[i][yOffset] - PointListData.leftPointList[iNext][yOffset];
		var dxRight = PointListData.rightPointList[i][xOffset] - PointListData.rightPointList[iNext][xOffset];
		var dyRight = PointListData.rightPointList[i][yOffset] - PointListData.rightPointList[iNext][yOffset];
		
		var leftLen = Math.sqrt(dxLeft*dxLeft + dyLeft*dyLeft);
		var rightLen = Math.sqrt(dxRight*dxRight + dyRight*dyRight);
		
		maxlengths[i] = Math.max(leftLen, rightLen);
		minlengths[i] = Math.min(leftLen, rightLen);
	}
	
	for (var i = 0; i < maxlengths.length - 1; i++) {
		maxlengths2[i] = maxlengths[i] + maxlengths[i+1];
		minlengths2[i] = minlengths[i] + minlengths[i+1];
	}

	var maxCombinedLength = document.getElementById('threshold').value
	var maxCombinedDifference = document.getElementById('threshold2').value
	while (1) {
		var minLength = Number.MAX_VALUE;
		for (var i = 1; i < maxlengths2.length - 1; i++) {
			var selected = PointListData.leftPointList[i+1][selectedOffset] || PointListData.rightPointList[i+1][selectedOffset];
			if (maxlengths2[i] < minLength && (maxlengths2[i] - minlengths2[i]) < maxCombinedDifference && !selected) {
				minLength = maxlengths2[i];
				candidate = i;
			}
		}
		if (minLength < maxCombinedLength) {
			maxlengths[candidate] += maxlengths[candidate+1];
			minlengths[candidate] += minlengths[candidate+1];
			maxlengths2[candidate-1] = maxlengths[candidate-1] + maxlengths[candidate];
			minlengths2[candidate-1] = minlengths[candidate-1] + minlengths[candidate];
			maxlengths.splice(candidate+1, 1);
			minlengths.splice(candidate+1, 1);
			maxlengths2.splice(candidate+1, 1);
			minlengths2.splice(candidate+1, 1);

			maxlengths2[candidate] = maxlengths[candidate] + maxlengths[candidate+1];
			minlengths2[candidate] = minlengths[candidate] + minlengths[candidate+1];

			var position = [];
			position[0] = [PointListData.leftPointList[candidate+1][xOffset], PointListData.leftPointList[candidate+1][yOffset]];
			position[1] = [PointListData.rightPointList[candidate+1][xOffset], PointListData.rightPointList[candidate+1][yOffset]];
			AddLinePathToEditor(position, 2, false, 0, 1, 1.0, "orange");

			PointListData.leftPointList.splice(candidate+1, 1);
			PointListData.rightPointList.splice(candidate+1, 1);
		}
		else break;
	} 
}
