// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
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
	var anmElement = document.getElementById('fileInputMix');
	anmElement.addEventListener('change', readMixFile, false);
}

function readMixFile(evt) 
{
	var f = evt.target.files[0];   
	if (f) {
		var r = new FileReader();
		r.onload = function(e) { 
			var contents = e.target.result;             
			var ct = r.result;
			document.getElementById("ta_txtoutput").value = "";
			ParseMixFile(ct, f.name);
		}
		r.readAsText(f);
		
	} else { 
		alert("Failed to load file");
	}
}

function ParseMixFile(ct, filename)
{
	var lines = ct.split('\r\n'); 
	var soundIndex = 0;
	var Filename = [];
	var BaseRPM = [];
	var RootNote = [];
	var RelativeNote = [];
	var NumberOfKeys = [];
	var key1RPM = [];
	var key1Vol = [];
	var key1Rate = [];
	var key2RPM = [];
	var key2Vol = [];
	var key2Rate = [];
	var key3RPM = [];
	var key3Vol = [];
	var key3Rate = [];
	var key4RPM = [];
	var key4Vol = [];
	var key4Rate = [];
	var key5RPM = [];
	var key5Vol = [];
	var key5Rate = [];
	var key6RPM = [];
	var key6Vol = [];
	var key6Rate = [];
	var key7RPM = [];
	var key7Vol = [];
	var key7Rate = [];
	var key8RPM = [];
	var key8Vol = [];
	var key8Rate = [];
	var key9RPM = [];
	var key9Vol = [];
	var key9Rate = [];
	var key10RPM = [];
	var key10Vol = [];
	var key10Rate = [];
	var IsStreaming = [];
	var LoopCount = [];
	var Group = [];
	var MinDistance = [];
	var MaxDistance = [];
	var EmitterMode = [];
	var PlayWhenAirborne = [];
	var Is3D = [];
	var outString = "";
	
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search("\\[Sound") != -1) {
			soundIndex = (lines[i].getNums())[0];
		}	
		if (lines[i].search("Filename") != -1) {
			//engines/motogp2/high5500.wav
			Filename[soundIndex] = lines[i].substring(lines[i].search("= ") + 2);
		}
		if (lines[i].search("BaseRPM") != -1) {
			//5500
			BaseRPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("RootNote") != -1) {
			//49
			RootNote[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("RelativeNote") != -1) {
			//2.11
			RelativeNote[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("NumberOfKeys") != -1) {
			//6
			NumberOfKeys[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key1RPM") != -1) {
			//4500
			key1RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key1Vol") != -1) {
			//25
			key1Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key1Rate") != -1) {
			//0.0
			key1Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key2RPM") != -1) {
			//5000
			key2RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key2Vol") != -1) {
			//45
			key2Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key2Rate") != -1) {
			//0.0
			key2Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key3RPM") != -1) {
			//5500
			key3RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key3Vol") != -1) {
			//75
			key3Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key3Rate") != -1) {
			//0.0
			key3Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key4RPM") != -1) {
			//5750
			key4RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key4Vol") != -1) {
			//75
			key4Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key4Rate") != -1) {
			//0.0
			key4Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key5RPM") != -1) {
			//6000
			key5RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key5Vol") != -1) {
			//45
			key5Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key5Rate") != -1) {
			//0.0
			key5Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key6RPM") != -1) {
			//6500
			key6RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key6Vol") != -1) {
			//25
			key6Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key6Rate") != -1) {
			//0.0
			key6Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key7RPM") != -1) {
			//6500
			key7RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key7Vol") != -1) {
			//25
			key7Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key7Rate") != -1) {
			//0.0
			key7Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key8RPM") != -1) {
			//6500
			key8RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key8Vol") != -1) {
			//25
			key8Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key8Rate") != -1) {
			//0.0
			key8Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key9RPM") != -1) {
			//6500
			key9RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key9Vol") != -1) {
			//25
			key9Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key9Rate") != -1) {
			//0.0
			key9Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key10RPM") != -1) {
			//6500
			key10RPM[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key10Vol") != -1) {
			//25
			key10Vol[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("key10Rate") != -1) {
			//0.0
			key10Rate[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("IsStreaming") != -1) {
			//False
			IsStreaming[soundIndex] = lines[i].substring(lines[i].search("= ") + 2);
		}
		if (lines[i].search("LoopCount") != -1) {
			//0
			LoopCount[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("Group") != -1) {
			//2
			Group[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("MinDistance") != -1) {
			//10
			MinDistance[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("MaxDistance") != -1) {
			//500
			MaxDistance[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("EmitterMode") != -1) {
			//2
			EmitterMode[soundIndex] = (lines[i].substring(lines[i].search("= ") + 2).getNums())[0];
		}
		if (lines[i].search("PlayWhenAirborne") != -1) {
			//True
			PlayWhenAirborne[soundIndex] = lines[i].substring(lines[i].search("= ") + 2);
		}
		if (lines[i].search("Is3D") != -1) {
			//True
			Is3D[soundIndex] = lines[i].substring(lines[i].search("= ") + 2);
		}
	}


	outString += "Sound,";
	outString += "Filename,";
	outString += "BaseRPM,";
	outString += "RootNote,";
	outString += "RelativeNote,";
	outString += "NumberOfKeys,";
	outString += "key1RPM,";
	outString += "key1Vol,";
	outString += "key1Rate,";
	outString += "key2RPM,";
	outString += "key2Vol,";
	outString += "key2Rate,";
	outString += "key3RPM,";
	outString += "key3Vol,";
	outString += "key3Rate,";
	outString += "key4RPM,";
	outString += "key4Vol,";
	outString += "key4Rate,";
	outString += "key5RPM,";
	outString += "key5Vol,";
	outString += "key5Rate,";
	outString += "key6RPM,";
	outString += "key6Vol,";
	outString += "key6Rate,";
	outString += "key7RPM,";
	outString += "key7Vol,";
	outString += "key7Rate,";
	outString += "key8RPM,";
	outString += "key8Vol,";
	outString += "key8Rate,";
	outString += "key9RPM,";
	outString += "key9Vol,";
	outString += "key9Rate,";
	outString += "key10RPM,";
	outString += "key10Vol,";
	outString += "key10Rate,";
	outString += "IsStreaming,";
	outString += "LoopCount,";
	outString += "Group,";
	outString += "MinDistance,";
	outString += "MaxDistance,";
	outString += "EmitterMode,";
	outString += "PlayWhenAirborne,";
	outString += "Is3D\n";
	
	for (var i = 0; i <= soundIndex; i++) {
		outString += i + ",";
		outString += ((typeof Filename[i] === "undefined") ? "" : Filename[i]) + ",";
		outString += ((typeof BaseRPM[i] === "undefined") ? "" : BaseRPM[i]) + ",";
		outString += ((typeof RootNote[i] === "undefined") ? "" : RootNote[i]) + ",";
		outString += ((typeof RelativeNote[i] === "undefined") ? "" : RelativeNote[i]) + ",";
		outString += ((typeof NumberOfKeys[i] === "undefined") ? "" : NumberOfKeys[i]) + ",";
		outString += ((typeof key1RPM[i] === "undefined") ? "" : key1RPM[i]) + ",";
		outString += ((typeof key1Vol[i] === "undefined") ? "" : key1Vol[i]) + ",";
		outString += ((typeof key1Rate[i] === "undefined") ? "" : key1Rate[i]) + ",";
		outString += ((typeof key2RPM[i] === "undefined") ? "" : key2RPM[i]) + ",";
		outString += ((typeof key2Vol[i] === "undefined") ? "" : key2Vol[i]) + ",";
		outString += ((typeof key2Rate[i] === "undefined") ? "" : key2Rate[i]) + ",";
		outString += ((typeof key3RPM[i] === "undefined") ? "" : key3RPM[i]) + ",";
		outString += ((typeof key3Vol[i] === "undefined") ? "" : key3Vol[i]) + ",";
		outString += ((typeof key3Rate[i] === "undefined") ? "" : key3Rate[i]) + ",";
		outString += ((typeof key4RPM[i] === "undefined") ? "" : key4RPM[i]) + ",";
		outString += ((typeof key4Vol[i] === "undefined") ? "" : key4Vol[i]) + ",";
		outString += ((typeof key4Rate[i] === "undefined") ? "" : key4Rate[i]) + ",";
		outString += ((typeof key5RPM[i] === "undefined") ? "" : key5RPM[i]) + ",";
		outString += ((typeof key5Vol[i] === "undefined") ? "" : key5Vol[i]) + ",";
		outString += ((typeof key5Rate[i] === "undefined") ? "" : key5Rate[i]) + ",";
		outString += ((typeof key6RPM[i] === "undefined") ? "" : key6RPM[i]) + ",";
		outString += ((typeof key6Vol[i] === "undefined") ? "" : key6Vol[i]) + ",";
		outString += ((typeof key6Rate[i] === "undefined") ? "" : key6Rate[i]) + ",";
		outString += ((typeof key7RPM[i] === "undefined") ? "" : key7RPM[i]) + ",";
		outString += ((typeof key7Vol[i] === "undefined") ? "" : key7Vol[i]) + ",";
		outString += ((typeof key7Rate[i] === "undefined") ? "" : key7Rate[i]) + ",";
		outString += ((typeof key8RPM[i] === "undefined") ? "" : key8RPM[i]) + ",";
		outString += ((typeof key8Vol[i] === "undefined") ? "" : key8Vol[i]) + ",";
		outString += ((typeof key8Rate[i] === "undefined") ? "" : key8Rate[i]) + ",";
		outString += ((typeof key9RPM[i] === "undefined") ? "" : key9RPM[i]) + ",";
		outString += ((typeof key9Vol[i] === "undefined") ? "" : key9Vol[i]) + ",";
		outString += ((typeof key9Rate[i] === "undefined") ? "" : key9Rate[i]) + ",";
		outString += ((typeof key10RPM[i] === "undefined") ? "" : key10RPM[i]) + ",";
		outString += ((typeof key10Vol[i] === "undefined") ? "" : key10Vol[i]) + ",";
		outString += ((typeof key10Rate[i] === "undefined") ? "" : key10Rate[i]) + ",";
		outString += ((typeof IsStreaming[i] === "undefined") ? "" : IsStreaming[i]) + ",";
		outString += ((typeof LoopCount[i] === "undefined") ? "" : LoopCount[i]) + ",";
		outString += ((typeof Group[i] === "undefined") ? "" : Group[i]) + ",";
		outString += ((typeof MinDistance[i] === "undefined") ? "" : MinDistance[i]) + ",";
		outString += ((typeof MaxDistance[i] === "undefined") ? "" : MaxDistance[i]) + ",";
		outString += ((typeof EmitterMode[i] === "undefined") ? "" : EmitterMode[i]) + ",";
		outString += ((typeof PlayWhenAirborne[i] === "undefined") ? "" : PlayWhenAirborne[i]) + ",";
		outString += ((typeof Is3D[i] === "undefined") ? "" : Is3D[i]);
		outString += "\n";
	}
	document.getElementById("ta_txtoutput").style.visibility = "visible";
	document.getElementById("ta_txtoutput").value = outString;
}

