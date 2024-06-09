String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

function init() 
{
	/*
		setup the event listener for file selection
	*/
	var anmElement = document.getElementById('fileInputAnm');
	anmElement.addEventListener('change', readAnmFile, false);
}

function readAnmFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			document.getElementById("ta_txtoutput").value = "";
			ParseAnmFile(ct, f.name);
		}
		r.readAsArrayBuffer(f);
		
	} else { 
		alert("Failed to load file");
	}
}

function ParseAnmFile(ct, filename)
{
	var i;
	var j;
	var Uint8View = new Uint8Array(ct);
	var Int32View = new Int32Array(ct);
	var Float32View = new Float32Array(ct);
	var byteIndex = 0;

	var outString = "File " + filename + " converted to text\n\n";

	var numberOfMotions = Int32View[byteIndex/4];
	outString += "numberOfMotions = " + numberOfMotions + "\n";
	byteIndex += 4;

	for (i = 0; i < numberOfMotions; i++) {
		var motionName = "";
		var motionType = Int32View[byteIndex/4];
		byteIndex += 4;
	
		for (j = 0; j < 260; j++) {
			motionName += String.fromCharCode(Uint8View[byteIndex]);
			byteIndex++;
		}
		var numberOfKeys = Int32View[byteIndex/4];
		byteIndex += 4;

		outString += "Motion " + i + " = {\n";
		if (motionType == 2) {
			outString += "  motionType = LinearVector\n";
			outString += "  motionName = " + motionName + "\n";
			outString += "  numberOfKeys = " + numberOfKeys + "\n";
			for (j = 0; j < numberOfKeys; j++) {
				outString += "  Key " + j + " = { ";
				var time = Float32View[byteIndex/4];
				outString += "time = " + time + "; ";
				byteIndex += 4;
				var x = Float32View[byteIndex/4];
				byteIndex += 4;
				var y = Float32View[byteIndex/4];
				byteIndex += 4;
				var z = Float32View[byteIndex/4];
				byteIndex += 4;
				outString += "value = (" + x + ", " + y + ", " + z + ") ";
				outString += "}\n";
			}
		}
		if (motionType == 3) {
			outString += "  motionType = LinearQuaternion\n";
			outString += "  motionName = " + motionName + "\n";
			outString += "  numberOfKeys = " + numberOfKeys + "\n";
			for (j = 0; j < numberOfKeys; j++) {
				outString += "  Key " + j + " = { ";
				var time = Float32View[byteIndex/4];
				outString += "time = " + time + "; ";
				byteIndex += 4;
				var w = Float32View[byteIndex/4];
				byteIndex += 4;
				var x = Float32View[byteIndex/4];
				byteIndex += 4;
				var y = Float32View[byteIndex/4];
				byteIndex += 4;
				var z = Float32View[byteIndex/4];
				byteIndex += 4;
				outString += "value = (" + w + ", " + x + ", " + y + ", " + z + ") ";
				outString += "}\n";
			}
		}
		if (motionType == 7) {
			outString += "  motionType = LinearScale\n";
			outString += "  motionName = " + motionName + "\n";
			outString += "  numberOfKeys = " + numberOfKeys + "\n";
			for (j = 0; j < numberOfKeys; j++) {
				outString += "  Key " + j + " = { ";
				var time = Float32View[byteIndex/4];
				outString += "time = " + time + "; ";
				byteIndex += 4;
				var x = Float32View[byteIndex/4];
				byteIndex += 4;
				var y = Float32View[byteIndex/4];
				byteIndex += 4;
				var z = Float32View[byteIndex/4];
				byteIndex += 4;
				outString += "value = (" + x + ", " + y + ", " + z + ") ";
				outString += "}\n";
			}
		}
		outString += "}\n";
	}
	document.getElementById("ta_txtoutput").style.visibility = "visible";
	document.getElementById("ta_txtoutput").value = outString;
}

function saveAnmFile() 
{
	var element = document.getElementById("out-ai-filename");
	var blob = PrepareAnmAsArrayBuffer();
	var filename = "temp.anm";
	saveAs(blob, filename);
}

function PrepareAnmAsArrayBuffer()
{
	var i;
	var j;
	var outBuffer = new ArrayBuffer(1024*1024);
	var Uint8View = new Uint8Array(outBuffer);
	var Int32View = new Int32Array(outBuffer);
	var Float32View = new Float32Array(outBuffer);
	
	var inString = document.getElementById("ta_txtoutput").value;
	var lines = inString.split('\n'); 
	
	//numberOfMotions
	var numbers = lines[2].getNums();
	var numberOfMotions = numbers[0];
	var byteIndex = 0;
	Int32View[byteIndex/4] = numberOfMotions;
	byteIndex += 4;

	var lineNr = 3;
	for (i = 0; i < numberOfMotions; i++) {
		var motionNr = lines[lineNr++].getNums()[0];
		var string = lines[lineNr++];
		if (string.search("LinearVector") != -1) {
			motionType = 2;
		}
		else if (string.search("LinearQuaternion") != -1) {
			motionType = 3;
		}
		else if (string.search("LinearScale") != -1) {
			motionType = 7;
		}
		//motionType
		Int32View[byteIndex/4] = motionType;
		byteIndex += 4;

		string = lines[lineNr++];
		var motionName = string.substring(15,40);
		
		//motionName
		for (j = 0; j < motionName.length; j++) {
			Uint8View[byteIndex++] = motionName.charCodeAt(j);
		}
		for (;j < 260; j++) {
			Uint8View[byteIndex++] = 0;
		}
		
		var numberOfKeys = lines[lineNr++].getNums()[0];
		//numberOfKeys
		Int32View[byteIndex/4] = numberOfKeys;
		byteIndex += 4;
		
		for (j = 0; j < numberOfKeys; j++) {
			numbers = lines[lineNr++].getNums();
			var key = numbers[0];
			var time = numbers[1];
			//time
			Float32View[byteIndex/4] = time;
			byteIndex += 4;

			var value0 = numbers[2];
			Float32View[byteIndex/4] = value0;
			byteIndex += 4;

			var value1 = numbers[3];
			Float32View[byteIndex/4] = value1;
			byteIndex += 4;

			var value2 = numbers[4];
			Float32View[byteIndex/4] = value2;
			byteIndex += 4;

			if (motionType == 3) {
				var value3 = numbers[5];
				Float32View[byteIndex/4] = value3;
				byteIndex += 4;
			}
		}
		lineNr++
	}
	var blob = new Blob([outBuffer], {type: 'application/octet-binary'}); 
	blob = blob.slice(0,byteIndex);
	return blob;
}

