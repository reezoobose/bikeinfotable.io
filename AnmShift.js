// String.prototype.getNums from http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
String.prototype.getNums= function(){
    var rx=/[+-]?((\.\d+)|(\d+(\.\d+)?)([eE][+-]?\d+)?)/g,
    mapN= this.match(rx) || [];
    return mapN.map(Number);
};

function init() 
{
}

function getTxtFromTextArea()
{
	var ta_element = document.getElementById('ta_txtinput');
	var ct = ta_element.value;
	ProcessTxtData(ct, "");
}

function ProcessTxtData(ct, name)
{
	var outString = "";
	var nodeOffset = Number(document.getElementById('node-offset').value);
	var lines = ct.split('\n'); 

	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search("\\[Node") != -1) {
			var node = (lines[i].getNums())[0];
			outString += "\[Node" + (node + nodeOffset).toFixed(0) + "\]"  + "\n";
		}
		else if (lines[i].search("name = blend") != -1) {
			var blendNum = (lines[i].getNums())[0];
			outString += "name = blend" + (blendNum + nodeOffset).toFixed(0) + "\n";
		}
		else if (lines[i].search("parent = ") != -1) {
			var parent = (lines[i].getNums())[0];
			outString += "parent = " + (parent + nodeOffset).toFixed(0) + "\n";
		}
		else {
			outString += lines[i] + "\n";
		}
	}
	document.getElementById('ta_txtoutput').value = outString;
	document.getElementById('ta_txtoutput').style.visibility='visible';
}

