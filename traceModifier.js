// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

var map;
var routeMarkers=new Array(0);
var xPos=new Array(0); // for when a csv file from Max is used as input
var yPos=new Array(0); // for when a csv file from Max is used as input
var smoothedHeights=new Array(0);
var resultDistances=new Array(0);
var selectedPoints=new Array(0);
var numPointPairs=0;
var geocoder;
var latlngbounds;
var addresslimit=100;
var LeftLineString;
var RightLineString;

var majorAxis = 6378206.4; // Clark 66 Spheroid major axis in meters 
var minorAxis = 6356583.8; // Clark 66 Spheroid minor axis in meters
var a = majorAxis / 2.0;
var b = minorAxis / 2.0;
var radiusOfEarthAtCenterOfTrack;
var lamda0;
var n;
var F;
var p0;

var defaultLookAtAltitude = 0; // look at point is 0m off the ground
var defaultLookAtHeading = 0; // looking north
var defaultLookAtTilt = 65; // 90 is looking at horizon
var defaultLookAtRange = 100; // camera is this many meters from the look at point

var ge = null;
var globePlacemark = null;
var terrainPlacemark = null;
var buildingsPlacemark = null;

var mouseDownX = -1;
var mouseDownY = -1;
var dragInfo;
var pointIndex = 0;

var flyLookAt;
var flyLatitude;
var flyLongitude;
var flyAltitude = 1;
var flyTilt = 90;
var flyRange = 0;
var flyIndex = 0;

function init() 
{
	/*
		setup the event listener for file selection
	*/
	document.getElementById('fileInputCsv').addEventListener('change', readCsvFile, false);
	clearmap();
}

function makePlacemark(lat, lng, alt, altMode) 
{  
	var pm;
	pm = [lat, lng, alt, altMode];
	routeMarkers.push(pm);
	
    return pm;
}

function parseXML()
{
	if (window.DOMParser)
	{
		parser=new DOMParser();
		xmlDoc=parser.parseFromString(txt,"text/xml");
	}
	else // Internet Explorer
	{
		xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async=false;
		xmlDoc.loadXML(txt);
	}
}

function clearmap()
{
	/*
		re-initialize our routeMarkers array
	*/
	routeMarkers=new Array(0);
	smoothedHeights=new Array(0);
	resultDistances=new Array(0);
	selectedPoints=new Array(0);
	
	/*
		and clear the html
	*/
	document.getElementById("csvFilename_div").style.visibility="hidden";
	document.getElementById("ta_csvoutput").value="";
	document.getElementById("kmlFilename_div").style.visibility="hidden";
	document.getElementById("ta_kmloutput").value="";
	document.getElementById("objFilename_div").style.visibility="hidden";
	document.getElementById("ta_objoutput").value="";
}

function CalcLambertProjection(latitudeCenter, longitudeCenter, heightAtCenter)
{
	/*
		We have gps data in latitude and longitude. to get coordinates on the plane we need a projection.
		We use a Lambert conformal conic projection mapping the data from a sphere to the plane.
		we make an accommodation for the earth being an approximate ellipsoid by at least using the appropriate radius of the earth
		at the side of the track based on the Clark 66 Spheroid.
	*/
	latitudeCenter *= Math.PI / 180.0;
	longitudeCenter *= Math.PI / 180.0;
	var aa = a * Math.sin(latitudeCenter);
	var bb = b * Math.cos(latitudeCenter);

	var radiusAtLatitude = a*b / Math.sqrt(aa*aa + bb*bb); // radius at sea level according to Clark 66 spheroid
	radiusOfEarthAtCenterOfTrack = radiusAtLatitude + heightAtCenter;

	/*
		The conic projection aligns a tangential cone at the desired latitude or can use two latitudes (standard parallels)
		to minimize error, we minimize error by selecting our latitudes (theta1 and theta2) as the mid points between
		the center and min, and the center and max
	*/
	lamda0 = longitudeCenter;
	var theta0 = latitudeCenter;
	
	/*
		following calc from wikipedia: http://en.wikipedia.org/wiki/Lambert_conformal_conic_projection
	*/
	/*
		for two standard parallels
		var theta1 = (latitudeCenter + minLatitude) / 2.0;
		var theta2 = (latitudeCenter + maxLatitude) / 2.0;
		var n = Math.log(Math.cos(theta1) / Math.cos(theta2)) / Math.log(Math.tan(Math.PI/4 + theta2 / 2) / Math.tan(Math.PI/4 + theta1 / 2));
		var F = Math.cos(theta1) * Math.pow(Math.tan(Math.PI/4 + theta1 / 2), n) / n;
	*/
	n = Math.sin(theta0);
	F = Math.cos(theta0) * Math.pow(Math.tan(Math.PI/4 + theta0 / 2), n) / n;
	
	p0 = F / Math.pow(Math.tan(Math.PI/4 + theta0 / 2), n);
}

function ProjectLambert(latitude, longitude) 
{
	latitude *= Math.PI / 180.0;
	longitude *= Math.PI / 180.0;

	var lamda = longitude;
	var theta = latitude;
	var nLamdaDelta = n*(lamda - lamda0);
	var p = F / Math.pow(Math.tan(Math.PI/4 + theta / 2), n);

	var x = p * Math.sin(nLamdaDelta);
	var y = p0 - p * Math.cos(nLamdaDelta);

	var posX = (x * 2.0 * radiusOfEarthAtCenterOfTrack);
	var posY = (y * 2.0 * radiusOfEarthAtCenterOfTrack);
	return [posX, posY];
}

function getPointData(index)
{
	var lat;
	var lng;
	var alt;

	if (ge) {
		var placemark = routeMarkers[index];
		var point = placemark.getGeometry();
		lat = point.getLatitude();
		lng = point.getLongitude();
		alt = point.getAltitude();	
	}
	else {
		lat = routeMarkers[index][0];
		lng = routeMarkers[index][1];
		alt = routeMarkers[index][2];
	}
	if (lat != 0 && lng != 0) {
		result = ProjectLambert(lat, lng);
	}
	else {
		result = [xPos[index],yPos[index]];
	}
	
	return {
		lat: lat,
		lng: lng,
		alt: alt,
		X: result[0],
		Y: result[1]
	};
}
	
function ftn_updatePanels()
{
	numPointPairs = Math.trunc((routeMarkers.length -1)/2);
	var lat = routeMarkers[0][0];
	var lng = routeMarkers[0][1];
	var alt = routeMarkers[0][2];
	CalcLambertProjection(lat, lng, alt);
	
	SmoothHeights();
	ftn_makecsv();
	ftn_makekml();
	ftn_makeobj();
}

function ftn_makecsv()
{
	var output = "";
	if (routeMarkers.length > 0) {
		var index=0;
		output = "index";
		output += ",latitude,longitude";
		output += ",altitude";
		output += ",xPos,yPos";
		output += ",smoothedZ";
		output += ",progress";
		output += ",selected";
		output += "\n";

		for(var index = 0; index < routeMarkers.length; index ++)
		{
			output += index;
			var pointData = getPointData(index);

			output += "," + pointData.lat;
			output += "," + pointData.lng;
			output += "," + pointData.alt.toFixed(3);
			output += "," + pointData.X.toFixed(3);
			output += "," + pointData.Y.toFixed(3);
			output += "," + smoothedHeights[index].toFixed(3);
			output += "," + resultDistances[index].toFixed(3);
			output += "," + selectedPoints[index];
			output += "\n";
		}
		document.getElementById("csvFilename_div").style.visibility="visible";
		document.getElementById("ta_csvoutput").value=output;
 	}
	else {
		document.getElementById("csvFilename_div").style.visibility="hidden";
		document.getElementById("ta_csvoutput").value="";
	}
}

function formatKmlPoint(index)
{
	var string = "";
	var pointData = getPointData(index);
	
	string += " " + pointData.lat;
	string += "," + pointData.lng;
	string += "," + pointData.alt.toFixed(3);
	return string;
}

function getLeftIndex(index)
{
	return 1 + index * 2;
}

function getRightIndex(index)
{
	return 1 + 1 + index * 2;
}

function ftn_makekml()
{
	var output = "";
	if (routeMarkers.length > 0) {
		var index=0;
		var datum = getPointData(0);

		output =  "<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n"
		output += "  <XXLHeader>\n";
		output += "    <Projection>Lambert</Projection>\n";
		output += "    <Spheroid>\n";
		output += "      <majorAxis>" + majorAxis + "</majorAxis>\n";
		output += "      <minorAxis>" + minorAxis + "</minorAxis>\n";
		output += "    </Spheroid>\n";
		output += "    <Datum>\n";
		output += "      <latitude>" + datum.lat + "</latitude>\n";
		output += "      <longitude>" + datum.lng + "</longitude>\n";
		output += "      <altitude>" + datum.alt + "</altitude>\n";
		output += "    </Datum>\n";
		output += "  </XXLHeader>\n";
		output += "  <Document>\n";
		output += "    <Folder>\n";
		output += "      <name>export_geo_both</name>\n";
		output += "      <Placemark>\n";
		output += "        <Polygon>\n";
		output += "          <altitudeMode>absolute</altitudeMode>\n";
		output += "            <outerBoundaryIs>\n";
		output += "            <LinearRing>\n";
		output += "              <coordinates>";
		
		for (var index = 0; index < numPointPairs; index++) {
			output += formatKmlPoint(getLeftIndex(index));
		}
		output += "</coordinates>\n";
		output += "            </LinearRing>\n";
		output += "          </outerBoundaryIs>\n";
		output += "        </Polygon>\n";
		output += "      </Placemark>\n";
		output += "      <Placemark>\n";
		output += "        <Polygon>\n";
		output += "          <altitudeMode>absolute</altitudeMode>\n";
		output += "            <outerBoundaryIs>\n";
		output += "            <LinearRing>\n";
		output += "              <coordinates>";

		for (var index = 0; index < numPointPairs; index++) {
			output += formatKmlPoint(getRightIndex(index));
		}
		output += "</coordinates>\n";
		output += "            </LinearRing>\n";
		output += "          </outerBoundaryIs>\n";
		output += "        </Polygon>\n";
		output += "      </Placemark>\n";
		output += "    </Folder>\n";
		output += "  </Document>\n";
		output += "</kml>\n";

		document.getElementById("kmlFilename_div").style.visibility="visible";
		document.getElementById("ta_kmloutput").value=output;
 	}
	else {
		document.getElementById("kmlFilename_div").style.visibility="hidden";
		document.getElementById("ta_kmloutput").value="";
	}
}

function ftn_makeobj()
{
	var output = "";
	if (routeMarkers.length > 0) {
		var index=0;
		for (index = 1; index < routeMarkers.length; index++) {// skip the datum point, it is at 0,0,0
			var pointData = getPointData(index);
			output += "v " + pointData.X.toFixed(3) + " " + pointData.Y.toFixed(3) + " " + smoothedHeights[index].toFixed(3) + "\n";
		}

		var l1 = getLeftIndex(0);
		var r1 = getRightIndex(0);
		var l2;
		var r2;
		
		if (numPointPairs > 1) {
			for (index = 1; index < numPointPairs; index++) {
				var l2 = getLeftIndex(index);
				var r2 = getRightIndex(index);
				output += "f " + l1 + " " + r1 + " " + r2 + "\n";
				output += "f " + r2 + " " + l2 + " " + l1 + "\n";
				l1 = l2;
				r1 = r2;
			}
			l2 = getLeftIndex(0);
			r2 = getRightIndex(0);
			output += "f " + l1 + " " + r1 + " " + r2 + "\n";
			output += "f " + r2 + " " + l2 + " " + l1 + "\n";
		}
		document.getElementById("objFilename_div").style.visibility="visible";
		document.getElementById("ta_objoutput").value=output;
 	}
	else {
		document.getElementById("objFilename_div").style.visibility="hidden";
		document.getElementById("ta_objoutput").value="";
	}
}

function saveCsvFile() 
{
	var element = document.getElementById("out-csv-filename");
	var fileAsText = document.getElementById("ta_csvoutput").value;
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_fromKml.csv";
	saveAs(blob, filename);
}

function saveKmlFile() 
{
	var element = document.getElementById("out-kml-filename");
	var fileAsText = document.getElementById("ta_kmloutput").value;
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + ".kml";
	saveAs(blob, filename);
}

function saveObjFile() 
{
	var element = document.getElementById("out-obj-filename");
	var fileAsText = document.getElementById("ta_objoutput").value;
	var blob = new Blob([fileAsText], {type: "text/plain;charset=utf-8"}); 
	var filename = (element.value || element.placeholder) + "_fromKml.obj";
	saveAs(blob, filename);
}

function submitenter(myfield,e)
{
	var keycode;
	if(window.event)keycode=window.event.keyCode;
	else if(e)keycode=e.which;
	else return true;
	if(keycode==13)
	{
		ftn_quickfind2(document.getElementById('goto').value);
		document.getElementById("goto").focus();
		document.getElementById("goto").select();
		return false;
	}
	else
	{
		return true;
	}
}

function ftn_quickfind2(address)
{
	document.getElementById("btn_go").value="Searching...";
	geocoder.geocode({'address':address},
		function(results,status)
		{
			if(status==google.maps.GeocoderStatus.OK)
			{
				var point=results[0].geometry.location;
				var la = ge.createLookAt('');
				la.set(point.lat(), point.lng(), defaultLookAtAltitude, ge.ALTITUDE_RELATIVE_TO_GROUND, defaultLookAtHeading, defaultLookAtTilt, defaultLookAtRange);
			    ge.getView().setAbstractView(la);

				//map.setCenter(point);
				//map.fitBounds(results[0].geometry.viewport);
				document.getElementById("btn_go").value="Found";
			}
			else
			{
				document.getElementById("btn_go").value="Not Found";
			}
		}
	);
}

function ftn_zoomtofit()
{
	map.setCenter(latlngbounds.getCenter());
	map.fitBounds(latlngbounds);
}

function ftn_processaddressupload(str_addresses)
{
	lines=str_addresses.split('\n');
	if(lines.length>addresslimit)
	{
		lines=lines.slice(0,addresslimit);
	}
	cnt=0;
	nextaddress();
}

function nextaddress()
{
	if(cnt>=lines.length)
	{
		document.getElementById("btn_ok").title="Complete!";
		ftn_zoomtofit();
		return;
	}
	else
	{
		document.getElementById("btn_ok").title="Processed "+(cnt+1)+"/"+lines.length;
	}
	ftn_geocodeaddress(lines[cnt],getElevation);
	cnt++;
}

function ftn_geocodeaddress(address,callbackFunction)
{
	geocoder.geocode({'address':address},
		function(results,status)
		{
			if(status==google.maps.GeocoderStatus.OK)
			{
				var point=results[0].geometry.location;
				callbackFunction(point);
				nextaddress();
			}
			else
			{
				alert("Address ("+address+")not found!");
				nextaddress();
			}
		}
	);
}

function readKmlFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		var index = evt.target.fileIndex;
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			
			parseKmlData(ct, f.name)
			//updateDisplay();
		}
		r.readAsText(f);
	} else { 
		alert("Failed to load file");
	}
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
			
			parseCsvData(ct, f.name)
			//updateDisplay();
		}
		r.readAsText(f);
	} else { 
		alert("Failed to load file");
	}
}

function getBasename(name) 
{
	var basename = name.substring(0, name.indexOf("_"));
	if (basename.length == 0) basename = name.substring(0, name.indexOf("."));
	if (basename.length == 0) basename = "placeholder";
	return basename;
}

function parseKmlData(ct, filename)
{
	var lines = ct.split('\n'); 
	var latLeft = [];
	var lngLeft = [];
	var altLeft = [];
	var latRight = [];
	var lngRight = [];
	var altRight = [];
	var processedLeft = false;
	var processedRight = false;
	var numPointsLeft = 0;
	var numPointsRight = 0;
	var datumLatitude = 0;
	var datumLongitude = 0;
	var datumAltitude = 0;
	var fMajorAxis = 0;
	var fMinorAxis = 0;
	
	clearmap();

	var basename = getBasename(filename);
	
	document.getElementById("out-csv-filename").placeholder = basename;
	document.getElementById("out-kml-filename").placeholder = basename;
	document.getElementById("out-obj-filename").placeholder = basename;
	
	var i = 0;
	while (i < lines.length) {
		var pos;
		var values;
		if (lines[i].search("<Spheroid>") != -1) {
			i++;
			if (lines[i].search("<majorAxis>") != -1) {
				var values = lines[i].getNums();
				if (values.length != 1) alert(" " + lines[i]);
				else {
					fMajorAxis = values[0];
				}
			} else alert("<Spheroid> expecting <majorAxis>");
			i++;
			if (lines[i].search("<minorAxis>") != -1) {
				var values = lines[i].getNums();
				if (values.length != 1) alert("<Spheroid> error in <minorAxis> " + lines[i]);
				else {
					fMinorAxis = values[0];
				}
			} else alert("<Spheroid> expecting <minorAxis>");
		}
		else if (lines[i].search("<Datum>") != -1) {
			i++;
			if (lines[i].search("<latitude>") != -1) {
				var values = lines[i].getNums();
				if (values.length != 1) alert(" " + lines[i]);
				else {
					datumLatitude = values[0];
				}
			} else alert("<Datum> expecting <latitude>");
			i++;
			if (lines[i].search("<longitude>") != -1) {
				var values = lines[i].getNums();
				if (values.length != 1) alert(" " + lines[i]);
				else {
					datumLongitude = values[0];
				}
			} else alert("<Datum> expecting <longitude>");
			i++;
			if (lines[i].search("<altitude>") != -1) {
				var values = lines[i].getNums();
				if (values.length != 1) alert(" " + lines[i]);
				else {
					datumAltitude = values[0];
				}
			} else alert("<Datum> expecting <altitude>");
		}
		else if (!processedLeft && lines[i].search("<coordinates>") != -1) {
			var values = lines[i].getNums();
			if (values.length < 1) alert("<coordinates> none in left spline " + lines[i]);
			else {
				var numPointsLeft = Math.floor(values.length/3);
				if (numPointsLeft * 3 != values.length) alert("<coordinates> not sets of 3 in left spline " + lines[i]);
				else {
					for (var k = 0, j = 0; k < numPointsLeft; k++) {
						latLeft[k] = values[j++];
						lngLeft[k] = values[j++];
						altLeft[k] = values[j++];
					}
				}
			}
			processedLeft = true;
		}
		else if (processedLeft && lines[i].search("<coordinates>") != -1) {
			var values = lines[i].getNums();
			if (values.length < 1) alert("<coordinates> none in right spline " + lines[i]);
			else {
				var numPointsRight = Math.floor(values.length/3);
				if (numPointsRight * 3 != values.length) alert("<coordinates> not sets of 3 in right spline " + lines[i]);
				else if (numPointsRight != numPointsLeft) alert("different number of left and right points!" + lines[i]);
				else {
					for (var k = 0, j = 0; k < numPointsRight; k++) {
						latRight[k] = values[j++];
						lngRight[k] = values[j++];
						altRight[k] = values[j++];
					}
				}
			}
			processedRight = true;
		}
		i++;
	}
	if (!processedLeft) {
		alert("<coordinates> missing left spline");
	}
	else if (!processedRight) {
		alert("<coordinates> missing right spline");
	}
	else {
		// successfully parsed
		if (fMajorAxis != 0 && fMinorAxis != 0) {
			majorAxis - fMajorAxis;
			minorAxis - fMinorAxis;
			a = majorAxis / 2.0;
			b = minorAxis / 2.0;
		}

		if (ge != null) {
			// fly to the track
			var la = ge.createLookAt('');
			la.set(datumLatitude, datumLongitude, defaultLookAtAltitude, ge.ALTITUDE_RELATIVE_TO_GROUND, 215, defaultLookAtTilt, defaultLookAtRange);
			ge.getView().setAbstractView(la);
			
			//place the datum marker
			terrainPlacemark = makePlacemark(datumLatitude, datumLongitude, datumAltitude, ge.ALTITUDE_ABSOLUTE);
			ge.getFeatures().appendChild(terrainPlacemark);
			
			//now process all the points making markers
			for (var i = 0; i < numPointsLeft; i++) {
				// add the left and right placemarks
				terrainPlacemark = makePlacemark(latLeft[i], lngLeft[i], altLeft[i], ge.ALTITUDE_ABSOLUTE);
				ge.getFeatures().appendChild(terrainPlacemark);
				
				terrainPlacemark = makePlacemark(latRight[i], lngRight[i], altRight[i], ge.ALTITUDE_ABSOLUTE);
				ge.getFeatures().appendChild(terrainPlacemark);

				// Add LineString points
				LeftLineString.getCoordinates().pushLatLngAlt(latLeft[i], lngLeft[i], 0);
				RightLineString.getCoordinates().pushLatLngAlt(latRight[i], lngRight[i], 0);
			}
		}
		else {
			makePlacemark(datumLatitude, datumLongitude, datumAltitude, 0);
			
			//now process all the points making markers
			for (var i = 0; i < numPointsLeft; i++) {
				// add the left and right placemarks
				makePlacemark(latLeft[i], lngLeft[i], altLeft[i], 0);
				makePlacemark(latRight[i], lngRight[i], altRight[i], 0);
			}
		}
		/*
			update the output panels
		*/
		ftn_updatePanels();
	}
}

function parseCsvData(ct, filename)
{
	var lines = ct.split('\n'); 
	var basename = getBasename(filename);
	
	document.getElementById("out-csv-filename").placeholder = basename;
	document.getElementById("out-kml-filename").placeholder = basename;
	document.getElementById("out-obj-filename").placeholder = basename;

	//xPos.push(0);
	//yPos.push(0);
	var values = lines[1].getNums(); // datum
	makePlacemark(values[1], values[2], values[3], 0);
	var i = 2;
	var alt;
	while (i < lines.length) {
		var values = lines[i].getNums();
		if (values.length != 4) {
			if (i == 2) alert("wrong type of csv file");
			break;
		}
		else {
			//xPos.push(values[1]);
			//yPos.push(values[2]);
			//alt = values[2];
			makePlacemark(values[1], values[2], values[3], 0);
		}
		i++;
	}
	/*
		update the output panels
	*/
	ftn_updatePanels();

}

function CreateLineString(color)
{
	// Create the LineString
	var lineStringPlacemark = ge.createPlacemark('');
	var lineString = ge.createLineString('');
	lineStringPlacemark.setGeometry(lineString);
	lineString.setAltitudeMode(ge.ALTITUDE_RELATIVE_TO_GROUND);
	
	// Create a style and set width and color of line.
	lineStringPlacemark.setStyleSelector(ge.createStyle(''));
	var lineStyle = lineStringPlacemark.getStyleSelector().getLineStyle();
	lineStyle.setWidth(5);
	lineStyle.getColor().set(color);  // aabbggrr format
	
	// Add the linestring to Earth
	ge.getFeatures().appendChild(lineStringPlacemark);
	
	return lineString;
}

function SmoothHeights()
{
	smoothedHeights[0] = (getPointData(0)).alt;
	selectedPoints[0] = 0;
	resultDistances[0] = 0;

	if (routeMarkers.length > 5) {
		SmoothHeightsOneSide(1);
		SmoothHeightsOneSide(2);
	}
}
		
function SmoothHeightsOneSide(startOffset)
{
	var k=0;
	var totalDist = 0;
	var heights = [];
	var distances = [];
	var prevPoint = getPointData(startOffset);
	var tolerance = 0.08;
	var point;
	var dx;
	var dy;
	var dist;
	
	/*
		we select the most pertinent points via the douglas peuker algorithm and then create a spline path 
		where progress along the track maps to x (the array distance) and height maps to y
		
		then looking these points up on the spline path creates a smoothed set of heights
	*/
	for(var index = startOffset; index < routeMarkers.length; index += 2)
	{
		point = getPointData(index);
		heights[k] = point.alt;
		dx = point.X - prevPoint.X;
		dy = point.Y - prevPoint.Y;
		dist = Math.sqrt(dx*dx + dy*dy);
		totalDist += dist;
		distances[k] = totalDist;
		prevPoint = point;
		k++;
	}
	
	/*
		repeat the first point at the end so douglas peuker is using the same start and end height
	*/
	var point = getPointData(startOffset);
	heights[k] = point.alt;
	dx = point.X - prevPoint.X;
	dy = point.Y - prevPoint.Y;
	dist = Math.sqrt(dx*dx + dy*dy);
	totalDist += dist;
	distances[k] = totalDist;
	
	/*
		select the points
	*/
	var selection = DouglasPeukerSelect(distances, heights, tolerance);
	selection[0] = 1; // always select the first point
	
	/*
		now build the coordinate array for the Catmull Rom spline formation
		since the spline path is open and we want continuity at the start point we insert
		the last selected point at the beginning and the first two points at the end
	*/
	var last = 0;
	for (var j = 0; j < selection.length; j++) {
		if (selection[j] == 1) {
			/*
				point was selected as relevant, add it to the set of coordinates
			*/
			last = j;
		}
	}

	var coordinates = new Array();
	coordinates[0] = [0, heights[last]];
	var distanceOffset = distances[selection.length - 1] - distances[last];
	
	var str = "coordinates.length = " + coordinates.length;
	k = 1;
	for (var j = 0; j < selection.length; j++) {
		if (selection[j] == 1) {
			/*
				point was selected as relevant, add it to the set of coordinates
			*/
			coordinates[k] = [distances[j] + distanceOffset, heights[j]];
			str += " " + j;
			k++;
		}
	}
	last = k-1;
	coordinates[k] = [coordinates[last][0] + coordinates[1][0], coordinates[1][1]];
	coordinates[k+1] = [coordinates[last][0] + coordinates[2][0], coordinates[2][1]];

//    setTimeout(function() {
//      alert(str);
//    }, 0);	
	/*
		now create the spline path and interpolate points along it
	*/
	var catmullRomSpline = new CatmullRom(coordinates);
	catmullRomSpline.InterpolateSplineToTolerance(0.001, "CatmullRomTypeChordal");
	
	/*
		now project each original height onto the spline to get the smoothed coordinates
	*/
	k = 0;
	for(var index = startOffset; index < routeMarkers.length; index += 2)
	{
		var pointXY = [];
		pointXY[0] = distances[k] + distanceOffset;
		pointXY[1] = heights[k];
		result = catmullRomSpline.DropPointOnSpline(pointXY);
		smoothedHeights[index] = result.point[1];
		resultDistances[index] = distances[k];
		if (selection[k]) {
			selectedPoints[index] = 1;
		}
		else {
			selectedPoints[index] = 0;
		}
		k++;
	}
}

function DistPointToLine(x1, y1, x2, y2, xp, yp)
{
	var dx = x2 - x1;
	var dy = y2 - y1;
	var lenSq = dx*dx + dy*dy;
	if (lenSq == 0) {
		/*
			zero length vector
		*/
		dx = x1 - xp;
		dy = y1 - yp;
	}
	else {
		var dxp = xp - x1;
		var dyp = yp - y1;

		var t = (dxp*dx + dyp*dy) / lenSq;

		var x = x1 + t * (x2 - x1);
		var y = y1 + t * (y2 - y1);
		
		dx = x - xp;
		dy = y - yp;
	}
	return Math.sqrt(dx*dx + dy*dy);
}

function DouglasPeukerSelect(xArray, yArray, tolerance)
{
	var selection = [];
	var numPoints = xArray.length;
	for (var i = 0; i < numPoints; i++) {
		selection[i] = 0;
	}
	var startIndex = 0;
	var endIndex = numPoints - 1;
	
	DouglasPeukerRecur(xArray, yArray, selection, startIndex, endIndex, tolerance);
	return selection;
}

function DouglasPeukerRecur(xArray, yArray, selection, startIndex, endIndex, tolerance)
{
	var maxDist = 0;
	var worstIndex;
	for (var i = startIndex + 1; i < endIndex - 1; i++) {
		var dist = DistPointToLine(xArray[startIndex], yArray[startIndex], xArray[endIndex], yArray[endIndex], xArray[i], yArray[i]);
		if (dist > maxDist) {
			maxDist = dist;
			worstIndex = i;
		}
	}
	if (maxDist < tolerance) {
		/*
			all points between startIndex and EndIndex are below the tolerance
		*/
	}
	else {
		/*
			need to keep this point, then recur into each half
		*/
		selection[worstIndex] = 1;
		DouglasPeukerRecur(xArray, yArray, selection, startIndex, worstIndex, tolerance);		
		DouglasPeukerRecur(xArray, yArray, selection, worstIndex, endIndex, tolerance);
	}
}
