// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

var img = new Image();
var maxPointListData = null;
var toolPointListData = null;
var verticalScale = 15;
function init() 
{
    InitialiseSplineEditor(document.getElementById('splinesCanvas'));

	/*
		setup the event listeners for file selection
	*/
	var maxElement = document.getElementById('fileInputCsvMax');
	maxElement.addEventListener('change', readCsvFile, false);
	maxElement.fileIndex = 0;
		
	var toolElement = document.getElementById('fileInputCsvTool');
	toolElement.addEventListener('change', readCsvFile, false);
	toolElement.fileIndex = 1;
}

// readSingleFile from http://stackoverflow.com/questions/17648871/how-can-i-parse-a-text-file-using-javascript
// article also shows how to load a file without user selection using an ajax request 
function readCsvFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		var index = evt.target.fileIndex;
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			
			if (index == 0) maxPointListData = CsvFileToPointList(ct);
			else toolPointListData = CsvFileToPointList(ct);
			
			updateBlobAndDisplay();
		}
		r.readAsText(f);
		
	} else { 
		alert("Failed to load file");
	}
}

function updateBlobAndDisplay()
{
	updateBlob();
	updateDisplay();
	theCanvasState.valid = false;
	theCanvasState.draw();
}
	
function AddFrameToSVG(pointList, lineOffset, xOffset, yOffset)
{
	var svgString = "";
	var startPoint = pointList[0][lineOffset];
	var endPoint = pointList[pointList.length - 1][lineOffset];
	
	svgString += "<line x1=\"" + startPoint[xOffset] + "\" y1=\"" + 0 +  "\" x2=\"" + startPoint[xOffset] + "\" y2=\"" + (startPoint[yOffset]*verticalScale).toFixed(3) + "\" />\n";
	svgString += "<line x1=\"" + startPoint[xOffset] + "\" y1=\"" + 0 +  "\" x2=\"" + endPoint[xOffset] + "\" y2=\"" + 0 + "\" />\n";
	svgString += "<line x1=\"" + endPoint[xOffset] + "\" y1=\"" + 0 +  "\" x2=\"" + endPoint[xOffset] + "\" y2=\"" + (endPoint[yOffset]*verticalScale).toFixed(3) + "\" />\n";
	return svgString;
}

function AddPointsToSVG(pointList, lineOffset, xOffset, yOffset)
{
	var svgString = "";
	var prevPoint = pointList[0][lineOffset];
	for (i = 0; i < pointList.length; i++) {
		var point = pointList[i][lineOffset];
		svgString += "<line x1=\"" + prevPoint[xOffset] + "\" y1=\"" + (prevPoint[yOffset]*verticalScale).toFixed(3) +  "\" x2=\"" + point[xOffset] + "\" y2=\"" + (point[yOffset]*verticalScale).toFixed(3) + "\" />\n";
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
		pointList[pointIndex] = [leftPos,rightPos];
		pointIndex++;

		prevMidXY = midXY;
		i += 2;
	}
	return {
		pointList: pointList,
		csvType: csvType
	};
}

function GetMinXYInPointListData(pointListData)
{
	var minX = Number.MAX_VALUE;
	var minY = Number.MAX_VALUE;

	var zOffset = pointListData.csvType.zOffset;
	var dOffset = pointListData.csvType.dOffset;

	for (var i = 0; i < pointListData.pointList.length; i++) {
		var point = pointListData.pointList[i][0]; //left
		if (point[dOffset] < minX) minX = point[dOffset];
		if (point[zOffset] < minY) minY = point[zOffset];
		
		point = pointListData.pointList[i][1]; //right
		if (point[dOffset] < minX) minX = point[dOffset];
		if (point[zOffset] < minY) minY = point[zOffset];
	}
	
	return {
		minX: minX,
		minY: minY
	};
}

function GetDisplayTranslationForSplineFiles()
{
	var minY = Number.MAX_VALUE;
	if (toolPointListData) {
		var minXYTool = GetMinXYInPointListData(toolPointListData);
		minY = Math.min(minY, minXYTool.minY);
	}
	if (maxPointListData) {
		var minXYMax = GetMinXYInPointListData(maxPointListData);
		minY = Math.min(minY, minXYMax.minY);
	}
	
	return [-1000, -1000 +minY*verticalScale, 1, -1];
}

