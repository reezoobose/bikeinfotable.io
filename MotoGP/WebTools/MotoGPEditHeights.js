// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

var img = new Image();
var maxPointListData = null;
var toolPointListData = null;
var VerticalScale = 15;
var	LeftSplinePath = null;
var RightSplinePath = null;
var LeftSplinePoints = null;
var RightSplinePoints = null;
var CSVHeaderLine = "";
var CSVDatumLine = "";
var objUpdates = [];

function init() 
{
    InitialiseSplineEditor(document.getElementById('splinesCanvas'));

	/*
		setup the event listeners for file selection
	*/
	var maxElement = document.getElementById('fileInputCsvGPS');
	maxElement.addEventListener('change', readFile, false);
	maxElement.fileIndex = 0;
		
	var toolElement = document.getElementById('fileInputCsvTool');
	toolElement.addEventListener('change', readFile, false);
	toolElement.fileIndex = 1;
		
	var toolElement = document.getElementById('fileInputEditedObj');
	toolElement.addEventListener('change', readFile, false);
	toolElement.fileIndex = 2;
}

// readSingleFile from http://stackoverflow.com/questions/17648871/how-can-i-parse-a-text-file-using-javascript
// article also shows how to load a file without user selection using an ajax request 
function readFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		var index = evt.target.fileIndex;
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			
			if (index == 0) {
				maxPointListData = CsvFileToPointList(ct);
				AddPointListDataToEditor(maxPointListData);
			}
			else if (index == 2) {
				ReadEditedObj(ct);
			}
			else {
				toolPointListData = CsvFileToPointList(ct);
				AddHeightSplinesToEditor();
				AddPointListDataToEditor(toolPointListData);
				AddCurvaturePath(toolPointListData);
				document.getElementById('output_div').style.visibility='visible';

				var basename = getBasename(f.name);
	
				var csvElement = document.getElementById("out-csv-filename");
				csvElement.placeholder = basename;
				var objElement = document.getElementById("out-obj-filename");
				objElement.placeholder = basename;
			}
			
			updateDisplay();
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
	var filename = (element.value || element.placeholder) + "_heightsEdited.csv";
	saveAs(blob, filename);
}

function saveObjFile() 
{
	var element = document.getElementById("out-obj-filename");
	var fileAsText = document.getElementById("ta_objoutput").value;
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_heightsEdited.obj";
	saveAs(blob, filename);
}

function getBasename(name) 
{
	var basename = name.substring(0, name.indexOf("_"));
	if (basename.length == 0) basename = name.substring(0, name.indexOf("."));
	if (basename.length == 0) basename = "placeholder";
	return basename;
}

/*
function AddFrameToSVG(pointList, lineOffset, xOffset, yOffset)
{
	var svgString = "";
	var startPoint = pointList[0][lineOffset];
	var endPoint = pointList[pointList.length - 1][lineOffset];
	
	svgString += "<line x1=\"" + startPoint[xOffset] + "\" y1=\"" + 0 +  "\" x2=\"" + startPoint[xOffset] + "\" y2=\"" + (startPoint[yOffset]*VerticalScale).toFixed(3) + "\" />\n";
	svgString += "<line x1=\"" + startPoint[xOffset] + "\" y1=\"" + 0 +  "\" x2=\"" + endPoint[xOffset] + "\" y2=\"" + 0 + "\" />\n";
	svgString += "<line x1=\"" + endPoint[xOffset] + "\" y1=\"" + 0 +  "\" x2=\"" + endPoint[xOffset] + "\" y2=\"" + (endPoint[yOffset]*VerticalScale).toFixed(3) + "\" />\n";
	return svgString;
}

function AddPointsToSVG(pointList, lineOffset, xOffset, yOffset)
{
	var svgString = "";
	var prevPoint = pointList[0][lineOffset];
	for (i = 0; i < pointList.length; i++) {
		var point = pointList[i][lineOffset];
		svgString += "<line x1=\"" + prevPoint[xOffset] + "\" y1=\"" + (prevPoint[yOffset]*VerticalScale).toFixed(3) +  "\" x2=\"" + point[xOffset] + "\" y2=\"" + (point[yOffset]*VerticalScale).toFixed(3) + "\" />\n";
		prevPoint = point;
	}
	return svgString;
}

function AddPointListDataToSvg(pointListData) 
{
	var svgString = "";
	var zOffset = pointListData.csvType.zOffset;
	var dOffset = pointListData.csvType.dOffset;
	
	svgString += "<g stroke=\"black\" stroke-width=\"1.0\">\n";
	svgString += AddFrameToSVG(pointListData.pointList, 0, dOffset, zOffset);//left
	svgString += "</g>\n";

	if (pointListData.csvType.fileViaMax) {
		if (document.getElementById("cb_leftMax").checked) {
			svgString += "<g stroke=\"green\" stroke-width=\"0.25\">\n";
			svgString += AddPointsToSVG(pointListData.pointList, 0, dOffset, zOffset);//left
			svgString += "</g>\n";
		}	
		if (document.getElementById("cb_leftMax").checked) {
			svgString += "<g stroke=\"magenta\" stroke-width=\"0.25\">\n";
			svgString += AddPointsToSVG(pointListData.pointList, 1, dOffset, zOffset);//right
			svgString += "</g>\n";
		}
	}
	else {
		if (document.getElementById("cb_leftTool").checked) {
			svgString += "<g stroke=\"red\" stroke-width=\"0.25\">\n";
			svgString += AddPointsToSVG(pointListData.pointList, 0, dOffset, zOffset);//left
			svgString += "</g>\n";
		}
		if (document.getElementById("cb_rightTool").checked) {
			svgString += "<g stroke=\"blue\" stroke-width=\"0.25\">\n";
			svgString += AddPointsToSVG(pointListData.pointList, 1, dOffset, zOffset);//right
			svgString += "</g>\n";
		}
		var aOffset = 3;
		if (document.getElementById("cb_leftOriginal").checked) {
			svgString += "<g stroke=\"orange\" stroke-width=\"0.25\">\n";
			svgString += AddPointsToSVG(pointListData.pointList, 0, dOffset, aOffset);//left
			svgString += "</g>\n";
		}
		if (document.getElementById("cb_rightOriginal").checked) {
			svgString += "<g stroke=\"purple\" stroke-width=\"0.25\">\n";
			svgString += AddPointsToSVG(pointListData.pointList, 1, dOffset, aOffset);//right
			svgString += "</g>\n";
		}
	}
	return svgString;
}
	
function updateBlob()
{
	var svgString = "";
	var prevToolPoint;
	var prevMaxPoint;
	var toolPoint;
	var maxPoint;

	svgString += "<?xml version=\"1.0\"?>";
	svgString += "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">";
	svgString += "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"";
	//svgString += "version=\"1.1\" width=\"8000\" height=\"2000\" viewBox=\"0 0 8000 2000\">		";
	svgString += "version=\"1.1\" width=\"6000\" height=\"6000\"> viewBox=\"0 0 6000 6000\">		";
//	svgString += "<circle cx=\"0\" cy=\"0\" r=\"4000.000\" stroke=\"black\" fill=\"yellow\" stroke-width=\"2\" />";
//	svgString += "<circle cx=\"0\" cy=\"0\" r=\"2000.000\" stroke=\"black\" fill=\"green\" stroke-width=\"2\" />";
//	svgString += "<circle cx=\"0\" cy=\"0\" r=\"1000.000\" stroke=\"black\" fill=\"pink\" stroke-width=\"2\" />";
//	svgString += "<circle cx=\"0\" cy=\"0\" r=\"500.000\" stroke=\"black\" fill=\"red\" stroke-width=\"2\" />";
//	svgString += "<circle cx=\"0\" cy=\"0\" r=\"250.000\" stroke=\"black\" fill=\"blue\" stroke-width=\"2\" />";

	if (maxPointListData) svgString += AddPointListDataToSvg(maxPointListData);
	if (toolPointListData) svgString += AddPointListDataToSvg(toolPointListData);
	svgString += "</svg>";
	
	var canvas = document.getElementById('splinesCanvas');
	var ctx = canvas.getContext('2d');
	var DOMURL = window.URL || window.webkitURL || window;

	var svg = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
	var url = DOMURL.createObjectURL(svg);
	img.onload = function () {
		DOMURL.revokeObjectURL(url);
	};
	img.src = url;
}
*/

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
	var pOffset;
	var eOffset;
	var iOffset = 0;
	var selectedOffset = -1;
	
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
	pOffset = dOffset + 1; // will be appended at the end
	eOffset = pOffset + 1; // will be appended at the end
	
	var numSplinePoints = Math.floor((lines.length - headerNumLines) / 2); // exclude the header and ignore any odd numbered line at end of file (may be blank)
	
	return {
		fileViaMax : fileViaMax,
		headerNumLines : headerNumLines,
		itemsPerLine : itemsPerLine,
		numSplinePoints : numSplinePoints,
		iOffset : iOffset,
		xOffset : xOffset,
		yOffset : yOffset,
		zOffset : zOffset,
		selectedOffset : selectedOffset,
		dOffset : dOffset,
		pOffset : pOffset, 
		eOffset : eOffset
	}
}

function CsvFileToPointList(ct)
{
	var lines = ct.split('\n'); 
	var csvType = CsvFileType(lines);
	
	var numSplinePoints = csvType.numSplinePoints;
	var pointList = [];
	var pointIndex = 0;
	
	var xOffset = csvType.xOffset;
	var yOffset = csvType.yOffset;
	var zOffset = csvType.zOffset;
	var dOffset = csvType.dOffset;
	var pOffset = csvType.pOffset;
	var eOffset = csvType.eOffset;

	var i = csvType.headerNumLines;
	var itemsPerLine = csvType.itemsPerLine;
	
	var prevLeftPos = lines[i].getNums();
	var prevRightPos = lines[i+1].getNums();
	var prevMidXY = [(prevLeftPos[xOffset] + prevRightPos[xOffset])/2, (prevLeftPos[yOffset] + prevRightPos[yOffset])/2]; 

	var progress = 0;
	var leftProgress = 0;
	var rightProgress = 0;
	
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
		leftPos[dOffset] = progress;
		rightPos[dOffset] = progress;
		
		dx = leftPos[xOffset] - prevLeftPos[xOffset];
		dy = leftPos[yOffset] - prevLeftPos[yOffset];
		dist = Math.sqrt(dx*dx + dy*dy);
		leftProgress += dist;
		leftPos[pOffset] = leftProgress;
		leftPos[eOffset] = leftPos[zOffset]*VerticalScale;
		
		dx = rightPos[xOffset] - prevRightPos[xOffset];
		dy = rightPos[yOffset] - prevRightPos[yOffset];
		dist = Math.sqrt(dx*dx + dy*dy);
		rightProgress += dist;
		rightPos[pOffset] = rightProgress;
		rightPos[eOffset] = rightPos[zOffset]*VerticalScale;
		
		if(objUpdates.length != 0) {
			leftPos[xOffset] = objUpdates[pointIndex][0][0];
			rightPos[xOffset] = objUpdates[pointIndex][1][0];
			leftPos[yOffset] = objUpdates[pointIndex][0][1];
			rightPos[yOffset] = objUpdates[pointIndex][1][1];
			leftPos[zOffset] = objUpdates[pointIndex][0][2];
			rightPos[zOffset] = objUpdates[pointIndex][1][2];
		}
		pointList[pointIndex] = [leftPos,rightPos];
		pointIndex++;

		prevMidXY = midXY;
		prevLeftPos = leftPos;
		prevRightPos = rightPos;
		i += 2;
	}
	if(objUpdates.length != 0) {
		document.getElementById("csvFilename_div").style.visibility="visible";
		document.getElementById("objFilename_div").style.visibility="visible";
	}
	return {
		pointList: pointList,
		csvType: csvType
	};
}

function ReadEditedObj(ct)
{
	var lines = ct.split('\n'); 
	
	var i = 4;
	var pairIndex = 0;
	while(1)
	{
		if (lines[i].search("v ") != 0) break;		
		var leftPos = lines[i].getNums();
		var rightPos = lines[i+1].getNums();
		objUpdates[pairIndex] = [leftPos, rightPos];
		i += 2;
		pairIndex++;
	}
}

function GetMinMaxXYInPointListData(pointListData)
{
	var minX = Number.MAX_VALUE;
	var minY = Number.MAX_VALUE;
	var maxX = Number.MIN_VALUE;
	var maxY = Number.MIN_VALUE;

	var zOffset = pointListData.csvType.zOffset;
	var dOffset = pointListData.csvType.dOffset;

	for (var i = 0; i < pointListData.pointList.length; i++) {
		var point = pointListData.pointList[i][0]; //left
		if (point[dOffset] < minX) minX = point[dOffset];
		if (point[zOffset] < minY) minY = point[zOffset];
		if (point[dOffset] > maxX) maxX = point[dOffset];
		if (point[zOffset] > maxY) maxY = point[zOffset];
		
		point = pointListData.pointList[i][1]; //right
		if (point[dOffset] < minX) minX = point[dOffset];
		if (point[zOffset] < minY) minY = point[zOffset];
		if (point[dOffset] > maxX) maxX = point[dOffset];
		if (point[zOffset] > maxY) maxY = point[zOffset];
	}
	
	return {
		minX: minX,
		minY: minY,
		maxX: maxX,
		maxY: maxY
	};
}

function GetDisplayTranslationForSplineFiles()
{
	var minY = Number.MAX_VALUE;
	if (toolPointListData) {
		var minXYTool = GetMinMaxXYInPointListData(toolPointListData);
		minY = Math.min(minY, minXYTool.minY);
	}
	if (maxPointListData) {
		var minXYMax = GetMinMaxXYInPointListData(maxPointListData);
		minY = Math.min(minY, minXYMax.minY);
	}
	
	return [-1000, -1000 +minY*VerticalScale, 1, -1];
}

function AddHeightSplinesToEditor()
{
	var numLeftPoints = 0;
	var numRightPoints = 0;
	
	LeftSplinePoints = new Array();
	RightSplinePoints = new Array();
	
	var dOffset = toolPointListData.csvType.dOffset;
	var zOffset = toolPointListData.csvType.zOffset;
	var eOffset = toolPointListData.csvType.eOffset;
	var pOffset = toolPointListData.csvType.pOffset;
	var selectedOffset = toolPointListData.csvType.selectedOffset;
	
	for (var i = 0; i < toolPointListData.pointList.length; i++) {
		var leftPos = toolPointListData.pointList[i][0];
		var rightPos = toolPointListData.pointList[i][1];
		var forceSelect = false;
		if (i == toolPointListData.pointList.length - 1) {
			/*
				last point:
				in 2d and 3d the last point is a repeat of the first (the track is a loop) but here we are 
				making a height profile so the start point is at the left and the end point is at the right. 
				we need to add the end point whereas in 2 or 3d we wouldn't as it would be co-incident 
				with the start point
			*/
			forceSelect = true;
		}
		if (forceSelect || leftPos[selectedOffset] == 1) {
//			LeftSplinePoints.push([leftPos[dOffset], leftPos[zOffset]*VerticalScale]);
			LeftSplinePoints.push(leftPos);
			numLeftPoints++;
		}
		if (forceSelect || rightPos[selectedOffset] == 1) {
//			RightSplinePoints.push([rightPos[dOffset], rightPos[zOffset]*VerticalScale]);
			RightSplinePoints.push(rightPos);
			numRightPoints++;
		}
	}
	
/*
	var channelIndices = [0,1];
	var timeChannelIndices = [0];	
	
	LeftSplinePath = AddSplineToEditor(0, LeftSplinePoints, numLeftPoints, false, 0, 1, 0.5, "magenta", editableKnotRadius, 0, true, channelIndices, timeChannelIndices, "wrapped");
	RightSplinePath = AddSplineToEditor(1, RightSplinePoints, numRightPoints, false, 0, 1, 0.5, "cyan", editableKnotRadius, 0, true, channelIndices, timeChannelIndices, "wrapped");
*/
	var channelIndices = [eOffset];
	var timeChannelIndices = [pOffset];	
	
	LeftSplinePath = AddSplineToEditor(0, LeftSplinePoints, numLeftPoints, false, dOffset, eOffset, 0.5, "magenta", editableKnotRadius, 0, true, channelIndices, timeChannelIndices, "wrapped");
	RightSplinePath = AddSplineToEditor(1, RightSplinePoints, numRightPoints, false, dOffset, eOffset, 0.5, "cyan", editableKnotRadius, 0, true, channelIndices, timeChannelIndices, "wrapped");
	
	UpdateCsvPanel(toolPointListData); 
	UpdateObjPanel(toolPointListData); 
}

function AddNewPoint(splinePath, insertAt)
{
	/*
		When we add a new point we are adding the point in the editor (TrackSplinePaths.js) 
		but in this function we snap the new point to an existing toolPointListData.pointList[i][sideIndex] from the csv data. 
		We are not creating a new point here, just selecting an existing point
	*/
	var dOffset = toolPointListData.csvType.dOffset;
	var eOffset = toolPointListData.csvType.eOffset;
	var pOffset = toolPointListData.csvType.pOffset;
	var zOffset = toolPointListData.csvType.zOffset;
	var selectedOffset = toolPointListData.csvType.selectedOffset;
	var sideIndex = splinePath.splineReferenceIndex;
	
	/*
		snap splinePath.K[insertAt].point to an existing point in our splinePoints
	*/
	var pointIndex = SnapPointToExistingPoint(splinePath.K[insertAt].point, sideIndex);
	splinePath.K[insertAt].point[0] = toolPointListData.pointList[pointIndex][sideIndex][dOffset];
	toolPointListData.pointList[pointIndex][sideIndex][selectedOffset] = 1;
	//splinePath.K[i].point[0] = splinePoints[pointIndex][dOffset];
	//splinePoints[pointIndex][selectedOffset] = 1;
}

/*
	for (var i = 0; i < toolPointListData.pointList.length; i++) {
		if (toolPointListData.pointList[i][sideIndex][dOffset] == snappedX) {
			splinePoints.splice(insertAt, 0, toolPointListData.pointList[i][sideIndex]);
			toolPointListData.pointList[i][sideIndex][selectedOffset] = 1;
			break; 
		}
	}

			point[dOffset] = splinePath.K[insertAt].point[0];
			point[eOffset] = splinePath.K[insertAt].point[1];
			point[zOffset] = splinePath.K[insertAt].point[1] / VerticalScale;
			point[selectedOffset] = 1;
	
			var t = splinePoints[insertAt][dOffset] - splinePoints[insertAt-1][dOffset];
			var d = splinePoints[insertAt+1][dOffset] - splinePoints[insertAt-1][dOffset];
			var p = splinePoints[insertAt+1][pOffset] - splinePoints[insertAt-1][pOffset];
			point[pOffset] = splinePoints[insertAt-1][pOffset] + p * t/d;
*/

function RemovePoint(splinePath, removeAt, point)
{
	/*
		When we remove a point we are removing the point in the editor (TrackSplinePaths.js) 
		but in this function we are just switching off its selected flag
	*/
	var selectedOffset = toolPointListData.csvType.selectedOffset;
	var dOffset = toolPointListData.csvType.dOffset;

	var sideIndex = splinePath.splineReferenceIndex;
	
	/*
		find the point in our csv data (toolPointListData.pointList[i][sideIndex]) 
	*/
	for (var i = 0; i < toolPointListData.pointList.length; i++) {
		if (toolPointListData.pointList[i][sideIndex][dOffset] == point[0]) {
			toolPointListData.pointList[i][sideIndex][selectedOffset] = 0;
			break; 
		}
	}
}	
/*
	if (splinePoints[removeAt][xOffset] == 0) {
		// no xvalue, removeAt is the duplicate
		splinePoints.splice(removeAt, 1);
	}
	else if (splinePoints[removeAt][dOffset] == splinePoints[removeAt-1][dOffset]) {
		// removeAt-1 is the duplicate
		splinePoints.splice(removeAt-1, 1);
	}
	else {//if (splinePoints[removeAt][dOffset] == splinePoints[removeAt+1][dOffset]) {
		// removeAt+1 is the duplicate
		splinePoints.splice(removeAt+1, 1);
	}
*/


function AddPointListDataToEditor(pointListData) 
{
	var zOffset = pointListData.csvType.zOffset;
	var dOffset = pointListData.csvType.dOffset;
	
	if (pointListData.csvType.fileViaMax) {
		AddLinePath(pointListData.pointList, "orange", 0.1, 0, dOffset, zOffset);//left
		AddLinePath(pointListData.pointList, "purple", 0.1, 1, dOffset, zOffset);//right
	}
	else {
		AddLinePath(pointListData.pointList, "red", 0.05, 0, dOffset, zOffset);//left
		AddLinePath(pointListData.pointList, "blue", 0.05, 1, dOffset, zOffset);//right
		var aOffset = 3;
		AddLinePath(pointListData.pointList, "magenta", 0.1, 0, dOffset, aOffset);//left
		AddLinePath(pointListData.pointList, "cyan", 0.1, 1, dOffset, aOffset);//right
	}
}
	
function AddLinePath(pointList, color, lineWidth, sideIndex, xIndex, yIndex)
{
	var linePoints = new Array();
	
	for (var i = 0; i < pointList.length; i++) {
		var pos = pointList[i][sideIndex];
		linePoints.push([pos[xIndex], pos[yIndex]*VerticalScale]);
	}
		
	AddLinePathToEditor(linePoints, linePoints.length, false, 0, 1, lineWidth, color);
}

function ClearSelectedFlags(sideIndex)
{
	var selectedOffset = toolPointListData.csvType.selectedOffset;

	for (var i = 0; i < toolPointListData.pointList.length; i++) {
		toolPointListData.pointList[i][sideIndex][selectedOffset] = 0;
	}
}

function SnapPointToExistingPoint(point, sideIndex)
{
	var dOffset = toolPointListData.csvType.dOffset;
	var selectedOffset = toolPointListData.csvType.selectedOffset;

	var pos = toolPointListData.pointList[0][sideIndex];
	var prevPos = pos;
	var i;
	for (i = 0; i < toolPointListData.pointList.length; i++) {
		pos = toolPointListData.pointList[i][sideIndex];
		if (point[0] < pos[dOffset]) break;
		prevPos = pos;
	}
	if (i == toolPointListData.pointList.length) {
		return i - 1;
	}
	else {
		var d0 = prevPos[dOffset] - point[0];
		var d1 = pos[dOffset] - point[0];
		
		if (Math.abs(d0) < Math.abs(d1)) {
			//prevPos[selectedOffset] = 1;
			//return prevPos[dOffset];
			return i - 1;
		}
		else {
			//pos[selectedOffset] = 1;
			//return pos[dOffset];
			return i;
		}
	}
}

function UpdateSplinePoints(splinePath)
{
	var dOffset = toolPointListData.csvType.dOffset;
	var eOffset = toolPointListData.csvType.eOffset;
	var pOffset = toolPointListData.csvType.pOffset;
	var zOffset = toolPointListData.csvType.zOffset;
	var selectedOffset = toolPointListData.csvType.selectedOffset;
	var sideIndex = splinePath.splineReferenceIndex;
	
	/*
		the user may have dragged a knot and dropped it near to an existing splinePoint (csv point)
		we need to snap the point to any existing csv points, first we clear all the selected flags
	*/
	ClearSelectedFlags(sideIndex);
	
	/*
		loop through all the TrackSplinePoints.js spline points and snap the X values to existing csv points
	*/
	for (var i = 0; i < splinePath.K.length; i++) {
		var pointIndex = SnapPointToExistingPoint(splinePath.K[i].point, sideIndex);
//		splinePath.K[i].point[0] = splinePoints[pointIndex][dOffset];
		splinePath.K[i].point[0] = toolPointListData.pointList[pointIndex][sideIndex][dOffset];
	}
	
	/*
		now loop through to remove any duplicates caused by the snapping
	*/
	var length = splinePath.K.length;
	for (var i = 0; i < length; i++) {
		if ((i != 0 && splinePath.K[i].point[0] == splinePath.K[i-1].point[0]) ||
		    (i != length - 1 && splinePath.K[i].point[0] == splinePath.K[i+1].point[0])) {
			/*
				point i is now a duplicate, remove it
				find the knot in the TrackSplinePaths.js array of knots and remove it
			*/
			var knotToRemove = splinePath.K[i];
			knots.splice(knots.indexOf(knotToRemove), 1);
			
			/*
				and remove it from the displayed spline
			*/
			splinePath.K.splice(i, 1);

			length--;
			i--;
		}
	}

	/*
		now reselect the csv points and update the z values and exaggerated z values
	*/
	for (var i = 0; i < splinePath.K.length; i++) {
		var pointIndex = SnapPointToExistingPoint(splinePath.K[i].point, sideIndex);
		toolPointListData.pointList[pointIndex][sideIndex][selectedOffset] = 1;
		toolPointListData.pointList[pointIndex][sideIndex][eOffset] = splinePath.K[i].point[1];
		toolPointListData.pointList[pointIndex][sideIndex][zOffset] = splinePath.K[i].point[1] / VerticalScale;
//		splinePoints[pointIndex][selectedOffset] = 1;
//		splinePoints[pointIndex][eOffset] = splinePath.K[i].point[1];
//		splinePoints[pointIndex][zOffset] = splinePath.K[i].point[1] / VerticalScale;
	}
}
/*
	}

				
				
			if (i > 0 && LeftSplinePoints[i][pOffset] == 0) {
				var t = LeftSplinePoints[i][dOffset] - LeftSplinePoints[i-1][dOffset];
				var d = LeftSplinePoints[i+1][dOffset] - LeftSplinePoints[i-1][dOffset];
				var p = LeftSplinePoints[i+1][pOffset] - LeftSplinePoints[i-1][pOffset];;
				LeftSplinePoints[i][pOffset] = LeftSplinePoints[i-1][pOffset] + p * t/d;
			}
* /
		}
	}
	else if (splinePath == RightSplinePath) {
		ClearSelectedFlags(1);
		for (var i = 0; i < RightSplinePoints.length; i++) {
			splinePath.K[i].point[0] = SnapPointToExistingPoint(splinePath.K[i].point, 1);
/*
			RightSplinePoints[i][dOffset] = splinePath.K[i].point[0];
			RightSplinePoints[i][eOffset] = splinePath.K[i].point[1];
			RightSplinePoints[i][zOffset] = splinePath.K[i].point[1] / VerticalScale;
			if (i > 0 && RightSplinePoints[i][pOffset] == 0) {
				var t = RightSplinePoints[i][dOffset] - RightSplinePoints[i-1][dOffset];
				var d = RightSplinePoints[i+1][dOffset] - RightSplinePoints[i-1][dOffset];
				var p = RightSplinePoints[i+1][pOffset] - RightSplinePoints[i-1][pOffset];;
				RightSplinePoints[i][pOffset] = RightSplinePoints[i-1][pOffset] + p * t/d;
			}
		}
*/

function NotifySplineCoordinatesUpdated(splinePath)
{
	if (LeftSplinePath && RightSplinePath) {
		UpdateSplinePoints(splinePath);
		UpdateHeightValues(splinePath);
		UpdateCsvPanel(toolPointListData);
		UpdateObjPanel(toolPointListData);
	}
}

function UpdateHeightValues(splinePath)
{
	var xOffset = toolPointListData.csvType.xOffset;
	var yOffset = toolPointListData.csvType.yOffset;
	var zOffset = toolPointListData.csvType.zOffset;
	var dOffset = toolPointListData.csvType.dOffset;
	var eOffset = toolPointListData.csvType.eOffset;
	var pOffset = toolPointListData.csvType.pOffset;
	var selectedOffset = toolPointListData.csvType.selectedOffset;
	
	var newCRSpline;
	var pzSplinePoints = new Array();
	
	var sideIndex = splinePath.splineReferenceIndex;

	for (var i = 0; i < toolPointListData.pointList.length; i++) {
		var pos = toolPointListData.pointList[i][sideIndex];
		var forceSelect = false;
		if (i == toolPointListData.pointList.length - 1) {
			/*
				last point:
				in 2d and 3d the last point is a repeat of the first (the track is a loop) but here we are 
				making a height profile so the start point is at the left and the end point is at the right. 
				we need to add the end point whereas in 2 or 3d we wouldn't as it would be co-incident 
				with the start point
			*/
			forceSelect = true;
		}
		if (forceSelect || pos[selectedOffset] == 1) {
			pzSplinePoints.push([pos[pOffset],pos[zOffset]]);
		}
	}
	
	/*
		here we create a new spline parameterized according to the progress along this particular side (pOffset)
		and project each csv point onto that spline, we don't see this spline as what we see is the two edges 
		parameterized according to progress along the middle (dOffset)
	*/
	newCRSpline = new CatmullRom(pzSplinePoints, [0,1], [0], "wrapped");
	newCRSpline.InterpolateSplineToTolerance(0.001, "CatmullRomTypeChordal");
		
	for (var i = 0; i < toolPointListData.pointList.length; i++) {
		var newHeight = newCRSpline.ProjectPointOnSpline([toolPointListData.pointList[i][sideIndex][pOffset], toolPointListData.pointList[i][sideIndex][zOffset]]);

		toolPointListData.pointList[i][sideIndex][zOffset] = newHeight;
		toolPointListData.pointList[i][sideIndex][eOffset] = newHeight * VerticalScale;
	}
}

function UpdateCsvPanel(pointListData)
{
	var output = CSVHeaderLine + "\n" + CSVDatumLine + "\n";
	
	if (LeftSplinePath && RightSplinePath) {
		var xOffset = pointListData.csvType.xOffset;
		var yOffset = pointListData.csvType.yOffset;
		var zOffset = pointListData.csvType.zOffset;
		var dOffset = pointListData.csvType.dOffset;
		
		for (var i = 0; i < pointListData.pointList.length; i++) {
			var leftPos = pointListData.pointList[i][0];
			output += leftPos[0].toFixed(0) + ", "; 
			output += leftPos[1] + ", "; 
			output += leftPos[2] + ", "; 
			output += leftPos[3].toFixed(3) + ", "; 
			output += leftPos[4].toFixed(3) + ", "; 
			output += leftPos[5].toFixed(3) + ", "; 
			output += leftPos[6].toFixed(3) + ", "; 
			output += leftPos[7].toFixed(3) + ", "; 
			output += leftPos[8].toFixed(0) + "\n"; 

			var rightPos = pointListData.pointList[i][1];
			output += rightPos[0].toFixed(0) + ", "; 
			output += rightPos[1] + ", "; 
			output += rightPos[2] + ", "; 
			output += rightPos[3].toFixed(3) + ", "; 
			output += rightPos[4].toFixed(3) + ", "; 
			output += rightPos[5].toFixed(3) + ", "; 
			output += rightPos[6].toFixed(3) + ", "; 
			output += rightPos[7].toFixed(3) + ", "; 
			output += rightPos[8].toFixed(0) + "\n"; 
		}
	}
	document.getElementById("ta_csvoutput").style.visibility="visible";
	document.getElementById("ta_csvoutput").value=output;
}

function UpdateObjPanel(pointListData)
{
	var output = "";
	if (LeftSplinePath && RightSplinePath) {
		var xOffset = pointListData.csvType.xOffset;
		var yOffset = pointListData.csvType.yOffset;
		var zOffset = pointListData.csvType.zOffset;
		var dOffset = pointListData.csvType.dOffset;
		
		for (var i = 0; i < pointListData.pointList.length; i++) {
			var leftPos = pointListData.pointList[i][0];
			var rightPos = pointListData.pointList[i][1];

			output += "v " + leftPos[xOffset].toFixed(3) + " " + leftPos[yOffset].toFixed(3) + " " + leftPos[zOffset].toFixed(3) + "\n";
			output += "v " + rightPos[xOffset].toFixed(3) + " " + rightPos[yOffset].toFixed(3) + " " + rightPos[zOffset].toFixed(3) + "\n";
		}
			
		var l1 = 0 * 2 + 1;
		var r1 = l1 + 1;
		var l2;
		var r2;
			
		for (var i = 1; i < pointListData.pointList.length; i++) {
			var l2 = i * 2 + 1;
			var r2 = l2 + 1;
			output += "f " + l1 + " " + r1 + " " + r2 + "\n";
			output += "f " + r2 + " " + l2 + " " + l1 + "\n";
			l1 = l2;
			r1 = r2;
		}
		l2 = 0 * 2 + 1;
		r2 = l2 + 1;
		output += "f " + l1 + " " + r1 + " " + r2 + "\n";
		output += "f " + r2 + " " + l2 + " " + l1 + "\n";
	}
	document.getElementById("ta_objoutput").style.visibility="visible";
	document.getElementById("ta_objoutput").value=output;
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

function PointIsLeftOf(v, w, p)
{
// left handed
	return (w[0] - v[0]) * (p[1] - v[1]) - (w[1] - v[1]) * (p[0] - v[0]) > 0.0 ? true : false;
// right handed
//	return (w[0] - v[0]) * (p[1] - v[1]) - (w[1] - v[1]) * (p[0] - v[0]) < 0.0 ? true : false;

}

function AddCurvaturePath(pointListData)
{
	var xOffset = pointListData.csvType.xOffset;
	var yOffset = pointListData.csvType.yOffset;
	var zOffset = pointListData.csvType.zOffset;
	var dOffset = pointListData.csvType.dOffset;
	var pointList = pointListData.pointList;
	var numPoints = pointList.length;
	var curvaturePoints = new Array();
	var curvatureCompareDist = 3;
	var curvatureVerticalScale = 1500.0;

	var minmax = GetMinMaxXYInPointListData(pointListData)
//	var curvatureVerticalOffset = VerticalScale * (minmax.minY + minmax.maxY) / 2;
	var curvatureVerticalOffset = VerticalScale * pointList[0][0][zOffset];

	var testDist = curvatureCompareDist;
	for (var j = 0; j < numPoints; j++) {
		var thisIndex = j;
		var prevIndex = j - testDist;
		var nextIndex = j + testDist;
		if (prevIndex < 0) prevIndex += numPoints;
		if (nextIndex > numPoints - 1) nextIndex -= numPoints;
		var pointPrevL = [pointList[prevIndex][0][xOffset], pointList[prevIndex][0][yOffset]];
		var pointThisL = [pointList[thisIndex][0][xOffset], pointList[thisIndex][0][yOffset]];
		var pointNextL = [pointList[nextIndex][0][xOffset], pointList[nextIndex][0][yOffset]];
		var curvatureLeft = Calculate2DCurvature(pointPrevL, pointThisL, pointNextL);
		var pointPrevR = [pointList[prevIndex][1][xOffset], pointList[prevIndex][1][yOffset]];
		var pointThisR = [pointList[thisIndex][1][xOffset], pointList[thisIndex][1][yOffset]];
		var pointNextR = [pointList[nextIndex][1][xOffset], pointList[nextIndex][1][yOffset]];
		var curvatureRight = Calculate2DCurvature(pointPrevR, pointThisR, pointNextR);
		var curvature;

		if (curvatureLeft > curvatureRight) {
			curvature = curvatureLeft;
			if (PointIsLeftOf(pointPrevL, pointNextL, pointThisL)) curvature = -curvature;
		}
		else {
			curvature = curvatureRight;
			if (PointIsLeftOf(pointPrevR, pointNextR, pointThisR)) curvature = -curvature;
		}
		curvaturePoints.push([pointList[j][0][dOffset], curvature*curvatureVerticalScale + curvatureVerticalOffset]);
	}

	AddLinePathToEditor(curvaturePoints, curvaturePoints.length, false, 0, 1, 1.0, "black");
	
	var line = [curvaturePoints[0], curvaturePoints[curvaturePoints.length - 1]];
	AddLinePathToEditor(line, line.length, false, 0, 1, 0.5, "black");
}

function updateCoordsDisplay(x, y)
{
	document.getElementById('altitude').value = (y / VerticalScale).toFixed(3);
	document.getElementById("csvFilename_div").style.visibility="visible";
	document.getElementById("objFilename_div").style.visibility="visible";
}					

function showNodeInfo(options) 
{
	if (options.existingKnot && options.knotIndex != -1) {
		var iOffset = toolPointListData.csvType.iOffset;
		var xOffset = toolPointListData.csvType.xOffset;
		var yOffset = toolPointListData.csvType.yOffset;
		var zOffset = toolPointListData.csvType.zOffset;
		var dOffset = toolPointListData.csvType.dOffset;
		var eOffset = toolPointListData.csvType.eOffset;
		var d = options.existingKnot.point[0];
		var z = options.existingKnot.point[1];
		var sideIndex = options.splineReferenceIndex;
		for (var i = 0; i < toolPointListData.pointList.length; i++) {
			var pos = toolPointListData.pointList[i][sideIndex];
			if (d == pos[dOffset] && z == pos[eOffset]) {
				document.getElementById('index').value = pos[iOffset].toFixed(0);
				document.getElementById('xpos').value = pos[xOffset];
				document.getElementById('ypos').value = pos[yOffset];
				document.getElementById('altitude').value = pos[zOffset].toFixed(3);
				document.getElementById('progress').value = pos[dOffset].toFixed(3);
				break;
			}
		}
	}
	else {
		document.getElementById('index').value = "";
		document.getElementById('xpos').value = "";
		document.getElementById('ypos').value = "";
		document.getElementById('altitude').value = "";
		document.getElementById('progress').value = "";
	}
}
			
