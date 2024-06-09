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
var NewPointListData = null;
var NumLODPoints = [];
var NumInterpolatedPoints = [];
var NumPieces;
var MaxPointsPerPiece = 150;

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
	
	var objElement = document.getElementById("out-obj-filename");
	objElement.placeholder = basename;

	PointListData = CsvFileToPointList(ct);

	var wrap = true; // all tracks are loops
	if (wrap) {
		/*
			wrap the first point to follow the last in the PointListData
		*/
		PointListData.leftPointList.push(PointListData.leftPointList[0]);
		PointListData.rightPointList.push(PointListData.rightPointList[0]);
	}
	
	/*
		interpolate necessary extra points by fitting splines
	*/
	NewPointListData = InterpolatePointsOnPath();
	var sum = 0;
	for (var i = 0; i < NumPieces; i++) sum += NumInterpolatedPoints[i];
	MaxPointsPerPiece = sum / NumPieces;
	
	NewPointListData = InterpolatePointsOnPath();
	NewPointListData.csvType = PointListData.csvType;

	if (wrap) {
		/*
			wrap the first point to follow the last in the NewPointListData
		*/
		NewPointListData.leftPointList.push(NewPointListData.leftPointList[0]);
		NewPointListData.rightPointList.push(NewPointListData.rightPointList[0]);
	}

	var xOffset = PointListData.csvType.xOffset;
	var yOffset = PointListData.csvType.yOffset;
	var numPoints = PointListData.leftPointList.length;
	var newNumPoints = NewPointListData.leftPointList.length;
	AddLinePathToEditor(NewPointListData.leftPointList, newNumPoints, true, xOffset, yOffset, 0.05, "red");
	AddLinePathToEditor(NewPointListData.rightPointList, newNumPoints, true, xOffset, yOffset, 0.05, "red");

	AddLinePathToEditor(PointListData.leftPointList, numPoints, true, xOffset, yOffset, 0.05, "black");
	AddLinePathToEditor(PointListData.rightPointList, numPoints, true, xOffset, yOffset, 0.05, "black");
	for (var j = 0; j < numPoints; j++) {
		var position = [];
		position[0] = [PointListData.leftPointList[j][xOffset], PointListData.leftPointList[j][yOffset]];
		position[1] = [PointListData.rightPointList[j][xOffset], PointListData.rightPointList[j][yOffset]];
		AddLinePathToEditor(position, 2, false, 0, 1, 0.05, "black");
	}
	updateDisplay();
	UpdateObjPanel(NewPointListData);
	
output_div
	document.getElementById('output_div').style.visibility='visible';
	document.getElementById('objFilename_div').style.visibility='visible';
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

function saveObjFile() 
{
	var element = document.getElementById("out-obj-filename");
	var fileAsText = document.getElementById("ta_objoutput").value;
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_interpolatedPath.obj";
	saveAs(blob, filename);
	
	var scaledData = BuildObjData(NewPointListData, "", [PointListData.leftPointList.length], 10.0, 0);
	blob = new Blob([scaledData.output], {type: "text/plain;charset=utf-8"}); 
	filename = (element.value || element.placeholder) + "_exagerated.obj";
	saveAs(blob, filename);
	
	var texturedAndCut = BuildSplitObjData(NewPointListData, "", NumInterpolatedPoints, 1.0, 0);
	blob = new Blob([texturedAndCut.output], {type: "text/plain;charset=utf-8"}); 
	filename = (element.value || element.placeholder) + "_texturedAndCut.obj";
	saveAs(blob, filename);
	
	var texturedAndCutLOD = BuildSplitObjData(PointListData, "_LOD", NumLODPoints, 1.0, texturedAndCut.numRepeats); // add original clicked points as LOD version
	blob = new Blob([texturedAndCutLOD.output], {type: "text/plain;charset=utf-8"}); 
	filename = (element.value || element.placeholder) + "_texturedAndCutLOD.obj";
	saveAs(blob, filename);
}

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

function BuildObjData(pointListData, suffix, numPointsArray, scalar, numRepeats)
{
	/*
		first we calculate the numRepeats and the repeatLength for the texture coordinates
	*/
	var	result = CalculateTextureRepeats(pointListData);
	if (numRepeats == 0) numRepeats = result.numRepeats;
	var repeatLength = result.totalProgress / numRepeats;

	var output = "";
	var objectName = "object_interpolatedPath";
	objectName = objectName + suffix;
	output += "# MotoGP Interpolated Path Generator\n";
	output += "\nmtllib " + "road.mtl\n\n";
	output += "#\n";
	output += "# " + objectName + "\n";
	output += "#\n";

	var startIndex = 0;
	var numPoints = numPointsArray[0];//pointListData.leftPointList.length;
	
	output += FormatVertices(pointListData, startIndex, numPoints, scalar);
		
	var uStart = 10.0;
	var result = FormatTextureCoordsAndFaces(pointListData, startIndex, numPoints, repeatLength, uStart, objectName);
	output += result.output;
	
	return {
		output : output,
		numRepeats : numRepeats
	};
}

function BuildSplitObjData(pointListData, suffix, numPointsArray, scalar, numRepeats)
{
	// NumLODPoints = [];
	// NumInterpolatedPoints = [];
	// NumPieces;
	/*
		first we calculate the numRepeats and the repeatLength for the texture coordinates
	*/

	var	result = CalculateTextureRepeats(pointListData);
	if (numRepeats == 0) numRepeats = result.numRepeats;
	var repeatLength = result.totalProgress / numRepeats;

	var output = "";
	output += "# MotoGP Interpolated Path Generator\n";
	output += "\nmtllib " + "road.mtl\n";

	var startIndex = 0;
	var numPoints;
	var piece;
	var uStart = 10.0;
	
	for (piece = 0; piece < NumPieces; piece++) {
	//for (piece = 1; piece < 2; piece++) {
		var objectName = "object_" + piece + "_interpolatedPath" + suffix;
		output += "#\n";
		output += "# " + objectName + "\n";
		output += "#\n";
		//numPoints = numPointsArray[piece] + ((piece != 0)? 1 : 0);
		numPoints = numPointsArray[piece] + 1;
		
		output += FormatVertices(pointListData, startIndex, numPoints, scalar);
	
		var result = FormatTextureCoordsAndFaces(pointListData, startIndex, numPoints, repeatLength, uStart, objectName);
		output += result.output;
		uStart = result.uStart;
		startIndex += numPoints - 1;
	}
	return {
		output : output,
		numRepeats : numRepeats
	};
}

function CalculateTextureRepeats(pointListData)
{
	var xOffset = pointListData.csvType.xOffset;
	var yOffset = pointListData.csvType.yOffset;
	
	var numPoints = pointListData.leftPointList.length;

	var dx = pointListData.leftPointList[1][xOffset] - pointListData.rightPointList[1][xOffset];
	var dy = pointListData.leftPointList[1][yOffset] - pointListData.rightPointList[1][yOffset];
	var trackWidth = Math.sqrt(dx*dx + dy*dy);
	var leftPos;
	var rightPos;
	var prevLeftPos = pointListData.leftPointList[0];
	var prevRightPos = pointListData.rightPointList[0];
	var totalProgress = 0.0;
	var dl;
	var dr;
	var progress;
	
	for (var i = 0; i <= numPoints; i++) {
		leftPos = pointListData.leftPointList[i % numPoints];
		rightPos = pointListData.rightPointList[i % numPoints];

		dx = leftPos[xOffset] - prevLeftPos[xOffset];
		dy = leftPos[yOffset] - prevLeftPos[yOffset];
		dl = Math.sqrt(dx*dx + dy*dy);

		dx = rightPos[xOffset] - prevRightPos[xOffset];
		dy = rightPos[yOffset] - prevRightPos[yOffset];
		dr = Math.sqrt(dx*dx + dy*dy);
		
		progress = (dl + dr) / 2;
		totalProgress += progress;
		
		prevLeftPos = leftPos;
		prevRightPos = rightPos;
	}
	/*
		multiply totalProgress by 0.9 to stretch the texture out by about 10%
	*/
	//totalProgress *= 0.9;
	var numRepeats = Math.round(totalProgress/trackWidth);
	numRepeats = Math.floor(numRepeats * 0.9);
	var repeatLength = totalProgress / numRepeats;
	return {
		totalProgress : totalProgress,
		numRepeats : numRepeats
	}
}

function FormatVertices(pointListData, startIndex, numPairs, scalar)
{
	var xOffset = pointListData.csvType.xOffset;
	var yOffset = pointListData.csvType.yOffset;
	var zOffset = pointListData.csvType.zOffset;
	var output = "";
	
	for (var i = startIndex; i < startIndex + numPairs; i++) {
		var leftPos = pointListData.leftPointList[i];
		var rightPos = pointListData.rightPointList[i];

		output += "v " + leftPos[xOffset].toFixed(3) + " " + leftPos[yOffset].toFixed(3) + " " + (leftPos[zOffset] * scalar).toFixed(3) + "\n";
		output += "v " + rightPos[xOffset].toFixed(3) + " " + rightPos[yOffset].toFixed(3) + " " + (rightPos[zOffset] * scalar).toFixed(3) + "\n";
	}
	output += "# " + numPairs*2 + " vertices\n\n";
	return output;
}

function FormatTextureCoordsAndFaces(pointListData, startIndex, numPairs, repeatLength, uStart, objectName)
{
	var xOffset = pointListData.csvType.xOffset;
	var yOffset = pointListData.csvType.yOffset;
	var output = "";
	var faceOutput = "";
	
	faceOutput += "g " + objectName + "\n";
	faceOutput += "usemtl road\n";
	faceOutput += "s 1\n";

	var leftPos;
	var rightPos;
	var prevLeftPos = pointListData.leftPointList[startIndex];
	var prevRightPos = pointListData.rightPointList[startIndex];
	var dl;
	var dr;
	var progress;
	
	var u = uStart;
	var vLeft = 0.0;
	var vRight = 1.0;

	var numTexPairs = numPairs;

/*
	for (var i = startIndex + 1, ipLeft = 1, itLeft = 1, ipRight = 2, itRight = 2; 
	         i < startIndex + numPairs; 
			 i++, ipLeft += 2, itLeft += 2, ipRight += 2, itRight += 2) {
*/				 
	
	/*
		do this loop so we can calculate how many tex pairs we need
	for (var i = startIndex + 1, ipLeft = 1, itLeft = 1, ipRight = 2, itRight = 2; 
	         i < startIndex + numPairs; 
			 i++, ipLeft += 2, itLeft += 2, ipRight += 2, itRight += 2) {
	*/
	for (var i = startIndex + 1, ipLeft = -(numPairs*2 -1), itLeft = -(numTexPairs*2 -1), ipRight = -(numPairs*2), itRight = -(numTexPairs*2); 
	         i < startIndex + numPairs; 
			 i++, ipLeft += 2, itLeft += 2, ipRight += 2, itRight += 2) {
		leftPos = pointListData.leftPointList[i];
		rightPos = pointListData.rightPointList[i];

		dx = leftPos[xOffset] - prevLeftPos[xOffset];
		dy = leftPos[yOffset] - prevLeftPos[yOffset];
		dl = Math.sqrt(dx*dx + dy*dy);

		dx = rightPos[xOffset] - prevRightPos[xOffset];
		dy = rightPos[yOffset] - prevRightPos[yOffset];
		dr = Math.sqrt(dx*dx + dy*dy);
		
		progress = (dl + dr) / 2;
		u -= progress / repeatLength;

		if (u < -10.0) {
			u += 20.0;
			itLeft += 2;
			itRight += 2;
			numTexPairs++;
		}
		prevLeftPos = leftPos;
		prevRightPos = rightPos;
	}	
	
	var u = uStart;
	prevLeftPos = pointListData.leftPointList[startIndex];
	prevRightPos = pointListData.rightPointList[startIndex];

	output += "vt " + u.toFixed(6) + " " + vLeft.toFixed(6) + " 0.000000\n";
	output += "vt " + u.toFixed(6) + " " + vRight.toFixed(6) + " 0.000000\n";

	for (var i = startIndex + 1, ipLeft = -(numPairs*2 -1), itLeft = -(numTexPairs*2 -1), ipRight = -(numPairs*2), itRight = -(numTexPairs*2); 
	         i < startIndex + numPairs; 
			 i++, ipLeft += 2, itLeft += 2, ipRight += 2, itRight += 2) {
		leftPos = pointListData.leftPointList[i];
		rightPos = pointListData.rightPointList[i];

		dx = leftPos[xOffset] - prevLeftPos[xOffset];
		dy = leftPos[yOffset] - prevLeftPos[yOffset];
		dl = Math.sqrt(dx*dx + dy*dy);

		dx = rightPos[xOffset] - prevRightPos[xOffset];
		dy = rightPos[yOffset] - prevRightPos[yOffset];
		dr = Math.sqrt(dx*dx + dy*dy);
		
		progress = (dl + dr) / 2;
		u -= progress / repeatLength;

		output += "vt " + u.toFixed(6) + " " + vLeft.toFixed(6) + " 0.000000\n";
		output += "vt " + u.toFixed(6) + " " + vRight.toFixed(6) + " 0.000000\n";

		faceOutput += "f " + ipLeft + "/" + itLeft + " " + (ipRight+2) + "/" + (itRight+2) + " " + ipRight + "/" + itRight + "\n";
		faceOutput += "f " + (ipRight+2) + "/" + (itRight+2) + " " + ipLeft + "/" + itLeft + " " + (ipLeft+2) + "/" + (itLeft+2) + "\n";

		if (u < -10.0) {
			u += 20.0;
			output += "vt " + u.toFixed(6) + " " + vLeft.toFixed(6) + " 0.000000\n";
			output += "vt " + u.toFixed(6) + " " + vRight.toFixed(6) + " 0.000000\n";
			itLeft += 2;
			itRight += 2;
			numTexPairs++;
		}
		prevLeftPos = leftPos;
		prevRightPos = rightPos;
	}
	
	output += "# " + (numTexPairs + 1)*2 + " texture coords\n\n";
	faceOutput += "# " + numPairs*2 + " polygons\n";

	return {
		output: output + faceOutput,
		uStart: u
	}
}


function UpdateObjPanel(pointListData)
{
	var output = "";
	var numRepeats = 0;
	var result;
	result = BuildSplitObjData(NewPointListData, "", NumInterpolatedPoints, 1.0, 0);

	document.getElementById("ta_objoutput").style.visibility="visible";
	document.getElementById("ta_objoutput").value=result.output;
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

function InterpolatePointsOnPath()
{
	NumPieces = 0;
	NumInterpolatedPoints[NumPieces] = 0;
	NumLODPoints[NumPieces] = 0;
	
	var newLeftPointList = [];
	var newRightPointList = [];
	var xOffset = PointListData.csvType.xOffset;
	var yOffset = PointListData.csvType.yOffset;
	var zOffset = PointListData.csvType.zOffset;
	var linesPerSegment = 1024;
	var pointsPerSegment = linesPerSegment + 1;
	
	var leftCatmullRom = new CatmullRom(PointListData.leftPointList, [xOffset, yOffset, zOffset], [xOffset, yOffset, zOffset], "closed");
	var rightCatmullRom = new CatmullRom(PointListData.rightPointList, [xOffset, yOffset, zOffset], [xOffset, yOffset, zOffset], "closed");

    /*
        interpolate the spline into a set of points using CatmullRom
		chordal is smoother than centripetal. centripetal is too stiff
    */
    for (var i = 0; i < leftCatmullRom.numSegments; i++) {
		var leftSegmentPoints = leftCatmullRom.InterpolateSegmentUniform(i, "CatmullRomTypeChordal", pointsPerSegment);
		var rightSegmentPoints = rightCatmullRom.InterpolateSegmentUniform(i, "CatmullRomTypeChordal", pointsPerSegment);
		
 	    /*
			recursively interpolate the points, t is simply an index
		*/
		var keepPoints = [];
		var tolerance = 0.02; // in meters
		tstart = 0;
		tend = linesPerSegment;
		recur(tstart, tend);

		function recur(tstr, tend) {
			/*
				now we find the mid value of t and interpolate x and y at that value of t
			*/
			var tmid = (tstr + tend) / 2;
			var strPointL = leftSegmentPoints[tstr];
			var midPointL = leftSegmentPoints[tmid];
			var endPointL = leftSegmentPoints[tend];
			var strPointR = rightSegmentPoints[tstr];
			var midPointR = rightSegmentPoints[tmid];
			var endPointR = rightSegmentPoints[tend];
 
			/*
				drop the midPoint onto the line segment from startPoint to EndPoint
				and compare the distance with the tolerance
			*/
			var strL = [strPointL[xOffset], strPointL[yOffset], strPointL[zOffset]];
			var midL = [midPointL[xOffset], midPointL[yOffset], midPointL[zOffset]];
			var endL = [endPointL[xOffset], endPointL[yOffset], endPointL[zOffset]];
			var strR = [strPointR[xOffset], strPointR[yOffset], strPointR[zOffset]];
			var midR = [midPointR[xOffset], midPointR[yOffset], midPointR[zOffset]];
			var endR = [endPointR[xOffset], endPointR[yOffset], endPointR[zOffset]];

			var distL = DistPointToLine(midL, strL, endL);
			var distR = DistPointToLine(midR, strR, endR);
			
			if (distL < tolerance && distR < tolerance) {
				/*
					we think we're done but check for s curve
				*/
				if (tmid - tstr > 1) {
					var tmid2 = (tstr + tmid) / 2;
	 
					var midPoint2L = leftSegmentPoints[tmid2];
					var midPoint2R = rightSegmentPoints[tmid2];
					var mid2L = [midPoint2L[xOffset], midPoint2L[yOffset], midPoint2L[zOffset]];
					var mid2R = [midPoint2R[xOffset], midPoint2R[yOffset], midPoint2R[zOffset]];

					if (DistPointToLine(mid2L, strL, midL) <= distL &&
						DistPointToLine(mid2R, strR, midR) <= distR) {
						/*
							ok, not an s curve, we are done
						*/
						return;
					}
				}
				else {
					return;
				}
			}
			/*
				recur into the first half of this segment
			*/
			if (tmid - tstr > 1) recur(tstr, tmid);
			
			/*
				add this point since we need it
			*/
			keepPoints.push(tmid);
			
			/*
				recur into the second half of this segment
			*/
			if (tend - tmid > 1) recur(tmid, tend);
		};

		newLeftPointList.push(PointListData.leftPointList[i]);
		newRightPointList.push(PointListData.rightPointList[i]);
		NumLODPoints[NumPieces]++;
		NumInterpolatedPoints[NumPieces]++;
		keepPoints.sort(compareNumbers);		
		for (var j = 0; j < keepPoints.length; j++) {
			var position = [];
			var leftPos = leftSegmentPoints[keepPoints[j]];
			var rightPos = rightSegmentPoints[keepPoints[j]];
			position[0] = [leftPos[xOffset], leftPos[yOffset]];
			position[1] = [rightPos[xOffset], rightPos[yOffset]];
			AddLinePathToEditor(position, 2, false, 0, 1, 0.2, "red");
			newLeftPointList.push(leftPos);
			newRightPointList.push(rightPos);
			NumInterpolatedPoints[NumPieces]++;
		}
		if (NumInterpolatedPoints[NumPieces] >= MaxPointsPerPiece) {
			NumPieces++;
			NumInterpolatedPoints[NumPieces] = 0;
			NumLODPoints[NumPieces] = 0;
		}
	}
//	if (NumPieces != 1) {
//		newLeftPointList.push(PointListData.leftPointList[0]);
//		newRightPointList.push(PointListData.rightPointList[0]);
//		NumInterpolatedPoints[NumPieces]++;
//	}
	if (NumInterpolatedPoints[NumPieces] != 0) {
		NumPieces++;
	}
	return {
		leftPointList: newLeftPointList,
		rightPointList: newRightPointList
	};
}