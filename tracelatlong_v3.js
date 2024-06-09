// Here I convert to V3 of the Google maps api
var output_lat=new Array(0);
var output_lng=new Array(0);
var output_m=new Array(0);
var outputDiv=document.getElementById('outputDiv');
var map;
var routeMarkers=new Array(0);
var geocoder;
var latlngbounds;
var addresslimit=100;

var majorAxis = 6378206.4; // Clark 66 Spheroid major axis in meters 
var minorAxis = 6356583.8; // Clark 66 Spheroid minor axis in meters
var a = majorAxis / 2.0;
var b = minorAxis / 2.0;
var radiusOfEarthAtCenterOfTrack;
var lamda0;
var n;
var F;
var p0;

function initialize()
{
	var latlng=new google.maps.LatLng(41.57003614847478,2.2612298895001004); // catalunya
	var myOptions={
		zoom:24,
		center:latlng,
		mapTypeId:google.maps.MapTypeId.SATELLITE,
		draggableCursor:'crosshair',
		mapTypeControlOptions:{style:google.maps.MapTypeControlStyle.DROPDOWN_MENU},
		scaleControl:true
	};
	map=new google.maps.Map(document.getElementById("map_canvas"),myOptions);
	elevator=new google.maps.ElevationService();
	google.maps.event.addListener(map,'click',mapclickedevent);
	geocoder=new google.maps.Geocoder();
	latlngbounds=new google.maps.LatLngBounds();
}

function foundsingle(first)
{
	var latlng=new google.maps.LatLng(parseFloat(first.lat),parseFloat(first.lng));
	var obj=new Object();
	obj.latLng=latlng;
	getElevation(obj);
}

function mapclickedevent(event)
{
	var clickedLocation=event.latLng;
	getElevation(clickedLocation);
}

function getElevation(clickedLocation)
{
	var locations=[];
	locations.push(clickedLocation);
	var positionalRequest={'locations':locations};
	elevator.getElevationForLocations(positionalRequest,
		function(results,status)
		{
			if(status==google.maps.ElevationStatus.OK)
			{
				if(results[0])
				{
					outputDiv.innerHTML="Last point clicked : "+results[0].elevation.toFixed(3)+" m";
					var marker=placeMarker(clickedLocation,results[0].elevation.toFixed(3)+" m\nindex = " + routeMarkers.length);
					marker.setMap(map);
					routeMarkers.push(marker);
					latlngbounds.extend(clickedLocation);
					output_lat.push(clickedLocation.lat());
					output_lng.push(clickedLocation.lng());
					output_m.push(results[0].elevation);
					ftn_makecsv();
				}
				else
				{
					outputDiv.innerHTML="No results found";
				}
			}
			else
			{
				outputDiv.innerHTML="Elevation service failed due to: "+status;
			}
		}
	);
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
function placeMarker(location,text)
{
	var image=new google.maps.MarkerImage('http://www.daftlogic.com/images/gmmarkersv3/stripes.png',new google.maps.Size(20,34),new google.maps.Point(0,0),new google.maps.Point(9,33));
	var marker=new google.maps.Marker({position:location,map:map,icon:image,title:text,draggable:true});
	google.maps.event.addListener(marker,  'rightclick',  
		function() 
		{ 
			var index = routeMarkers.indexOf(marker);
			routeMarkers[index].setMap(null);
			routeMarkers.splice(index,1);
			output_lat.splice(index,1);
			output_lng.splice(index,1);
			output_m.splice(index,1);
			ftn_makecsv();
		}
	);
	return marker;
}
function clearmap()
{
	if(routeMarkers)
	{
		for(i in routeMarkers)
		{
			routeMarkers[i].setMap(null);
		}
	}
	routeMarkers=new Array(0);
	outputDiv.innerHTML="";
	latlngbounds=new google.maps.LatLngBounds();
	output_lat=new Array(0);
	output_lng=new Array(0);
	output_m=new Array(0);
	document.getElementById("ta_csvoutput").style.visibility="hidden";
	document.getElementById("ta_csvoutput").value="";
	document.getElementById("ta_kmloutput").style.visibility="hidden";
	document.getElementById("ta_kmloutput").value="";
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

	var posX = (x * radiusOfEarthAtCenterOfTrack);
	var posY = (y * radiusOfEarthAtCenterOfTrack);
	return [posX, posY];
}

function ftn_toggleLRLRLR()
{
	if (document.getElementById("cb_output_LRLRLR").checked) {
		document.getElementById("cb_output_LLLRRR").checked = false;
	}
	else {
		document.getElementById("cb_output_LLLRRR").checked = true;
	}
	ftn_makecsv();
}
	
function ftn_toggleLLLRRR()
{
	if (document.getElementById("cb_output_LLLRRR").checked) {
		document.getElementById("cb_output_LRLRLR").checked = false;
	}
	else {
		document.getElementById("cb_output_LRLRLR").checked = true;
	}
	ftn_makecsv();
}
	
function ftn_makecsv()
{
	var index=0;

	CalcLambertProjection(output_lat[0], output_lng[0], output_m[0]);

	document.getElementById("ta_csvoutput").style.visibility="visible";
	document.getElementById("ta_csvoutput").value="";
	output = "index";
	if(document.getElementById("cb_output_latlng").checked)
	{
		output += ",latitude,longitude";
	}
	if(document.getElementById("cb_output_meters").checked)
	{
		output += ",altitude";
	}
	if(document.getElementById("cb_output_lambert").checked)
	{
		output += ",xPos,yPos";
	}
	output += "\n";

	for(var index = 0; index < routeMarkers.length; index ++)
	{
		var result = ProjectLambert(output_lat[index], output_lng[index]);
		output += index;
		if(document.getElementById("cb_output_latlng").checked)
		{
			output += "," + output_lat[index]
			output += "," + output_lng[index];
		}
		if(document.getElementById("cb_output_meters").checked)
		{
			output += "," + (output_m[index].toFixed(3));
		}
		if(document.getElementById("cb_output_lambert").checked)
		{
			output += "," + (result[0].toFixed(3));
			output += "," + (result[1].toFixed(3));
		}
		output += "\n";
	}
	document.getElementById("ta_csvoutput").value=output;
	
	ftn_makekml();
}

function formatKmlPoint(index)
{
	var string = "";
	var result = ProjectLambert(output_lat[index], output_lng[index]);

	if(document.getElementById("cb_output_lambert").checked)
	{
		string += " " + (result[0].toFixed(3));
		string += "," + (result[1].toFixed(3));
	}
	else if(document.getElementById("cb_output_latlng").checked)
	{
		string += " " + output_lat[index];
		string += "," + output_lng[index];
	}
	if(document.getElementById("cb_output_meters").checked)
	{
		string += "," + (output_m[index].toFixed(3));
	}
	return string;
}

function ftn_makekml()
{
	var index=0;
	document.getElementById("ta_kmloutput").style.visibility="visible";
	document.getElementById("ta_kmloutput").value="";

	output =  "<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n"
	output += "  <XXLHeader>\n";
	output += "    <Projection>Lambert</Projection>\n";
	output += "    <Spheroid>\n";
	output += "      <majorAxis>" + majorAxis + "</majorAxis>\n";
	output += "      <minorAxis>" + minorAxis + "</minorAxis>\n";
	output += "    </Spheroid>\n";
	output += "    <Datum>\n";
	output += "      <latitude>" + output_lat[0] + "</latitude>\n";
	output += "      <longitude>" + output_lng[0] + "</longitude>\n";
	output += "      <altitude>" + output_m[0] + "</altitude>\n";
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
	
	var index = 1; // skip the datum
	if (document.getElementById("cb_output_LRLRLR").checked) {
		while (index < routeMarkers.length) // left edge
		{
			output += formatKmlPoint(index);
			index += 2;
		}
	}
	else 
	{
		while (index < routeMarkers.length / 2) // left edge
		{
			output += formatKmlPoint(index);
			index++;
		}
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

	if(document.getElementById("cb_output_LRLRLR").checked) {
		index = 2;
		while (index < routeMarkers.length) // right edge
		{
			output += formatKmlPoint(index);
			index += 2;
		}
	}
	else
	{
		while (index < routeMarkers.length) // right edge
		{
			output += formatKmlPoint(index);
			index++;
		}
	}
	output += "</coordinates>\n";
	output += "            </LinearRing>\n";
    output += "          </outerBoundaryIs>\n";
    output += "        </Polygon>\n";
    output += "      </Placemark>\n";
	output += "    </Folder>\n";
    output += "  </Document>\n";
    output += "</kml>\n";
 	
	document.getElementById("ta_kmloutput").value=output;
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
				map.setCenter(point);
				map.fitBounds(results[0].geometry.viewport);
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

google.maps.event.addDomListener(window, 'load', initialize);
