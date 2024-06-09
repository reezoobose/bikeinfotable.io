function init() 
{
	/*
		setup the event listener for file selection
	*/
	var toolElement = document.getElementById('fileInputTxt');
	toolElement.addEventListener('change', readFile, false);
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
			
			ProcessUnicodeTextFile(ct);
		}
		r.readAsText(f);
		
	} 
	else { 
		alert("Failed to load file");
	}
}

function fixedCharCodeAt(str, idx) {
  // ex. fixedCharCodeAt('\uD800\uDC00', 0); // 65536
  // ex. fixedCharCodeAt('\uD800\uDC00', 1); // false
  idx = idx || 0;
  var code = str.charCodeAt(idx);
  var hi, low;
  
  // High surrogate (could change last hex to 0xDB7F to treat high
  // private surrogates as single characters)
  if (0xD800 <= code && code <= 0xDBFF) {
    hi = code;
    low = str.charCodeAt(idx + 1);
    if (isNaN(low)) {
      throw 'High surrogate not followed by low surrogate in fixedCharCodeAt()';
    }
    return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
  }
  if (0xDC00 <= code && code <= 0xDFFF) { // Low surrogate
    // We return false to allow loops to skip this iteration since should have
    // already handled high surrogate above in the previous iteration
    return false;
    /*hi = str.charCodeAt(idx - 1);
    low = code;
    return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;*/
  }
  return code;
}

function unicodeSplit(str, splitChar, foo)
{
    var str1 = "A↵  translations: [↵T";
    var n = str1.charCodeAt(1);
	var targetList = [];
	targetList[0] = "";
	var seperator = String.fromCharCode('\u21b5');
	var seperator2 = "↵ ";
	var seperator3 = String.fromCharCode(8629) + "äbc + ABC";
	var seperator4 = seperator3.charCodeAt(0);
	for(var i = 0; i < str.length; i++){
		var ch = str[i];
		var ch1 = str.charCodeAt(i);
		var ch2 = str.codePointAt(i);
		var ch3 = fixedCharCodeAt(str, i);
		if (ch3 != foo) {
			if (ch3 != 13) targetList[targetList.length - 1] += ch;//ignore CR
		}
		else {
			targetList.push("");
		}
	}
	return targetList;
}

function repeat(num,whatTo){
    var arr = [];
    for(var i=0;i<num;i++){
        arr.push(whatTo);
    }
    return arr;
}

function HandleQuotesAndBackSlashes(str)
{
	/*
		ASCII for " is 34
		ASCII for \ is 92
		if the string begins with a quote assumes whole string is in quotes and removes the first and last character
		(note we may no longer need this now we are using google doc tsv files 
		replaces " with escaped value of \" 
		replaces \ with escaped value \\
	*/
	var str2;
	var str3="";
	if (str.indexOf('\"') == 0) str2 = str.substring(1, str.length - 1);
	else str2 = str;
	
	for(var i = 0; i < str2.length; i++){
		var ch = str2[i];
		if (i != str2.length - 1) {
			var ch1 = fixedCharCodeAt(str2, i);
			var ch2 = fixedCharCodeAt(str2, i+1);
			// 34=="
			// 92==/
			/*
			if ((ch1 == 34) && (ch2 == 34)) {
				str3 += "\\\"";
				i++;
			}
			else if (ch1 == 34) {
				str3 += "\\\"";
				//i++;
			}
			else if (ch1 == 92) {
				str3 += "\\";
				//i++;
			}
			else {
				str3 += ch;
			}
			*/
			str3 += ch;
		}
		else {
			str3 += ch;
		}
	}
	
	return str3;
}

function MyReplace(string, token, replacement) 
{
	//str.replace() does not like the <>
	var index = string.indexOf(token);
	if (index != -1) {
		var edit = string.substring(0,index);
		edit += replacement;
		edit += string.substring(index + token.length, string.length);
		return edit;
	}
	return string;
}

function MyUnicodeReplace(string, token, replacement) 
{
	var outString = "";
	
	for (var i = 0; i < string.length; i++){
		var j;
		for (j = 0; j < token.length; j++) {
			if (string[i+j] != token[j]) break;
		}
		if (j == token.length) {
			i += j - 1;
			for (j = 0; j < replacement.length; j++) {
				outString += replacement[j];
			}
		}
		else {
			outString += string[i];
		}
	}
	
	return outString;
}

function EscapeQuotesForSQL(string) 
{
	return MyUnicodeReplace(string, "'", "''")
}

function ProcessUnicodeTextFile(ct)
{
	var FWC_parts;
	var FWC_UPPER_parts;
	var FWC_ABBREVIATION_parts;
	var startOfItem = 0;
	var notUsedOrdinal = 0;
	var outString = repeat(14,"");
	var dict = repeat(14,"");
	var tips = repeat(14,"");
	var qotd = repeat(14,"");
	outString[0]= "public enum StringTranslations {\r\n";
    //var sqlString="INSERT INTO mst (id,mstName,english,french,italian,german,spanish,russian,portuguese,chinese,bahasa,korean,japanese,thai,vietnamese) VALUES\n";
    var sqlString="INSERT INTO mst (id,mstName,english) VALUES\n";
	
	for (var pass = 0; pass < 2; pass++) {
		var lines = unicodeSplit(ct, '\\u21b5', 10);//"↵");

		for (var i = 1; i < lines.length; i++) {
			var str = lines[i];
			var parts = unicodeSplit(str, '\\u21b5', 9);

			var ordinal = parts[0];
			var screenNum = parts[1];
			var ScreenName = parts[2];
			var stringName = parts[3];
			if (stringName.length == 0) break;

			if (pass == 0) {
				if (stringName == "FWC") {
					FWC_parts = parts;
				}
				else if (stringName == "FWC_UPPER") {
					FWC_UPPER_parts = parts;
				}
				else if (stringName == "FWC_ABBREVIATION") {
					FWC_ABBREVIATION_parts = parts;
				}
			}
			else {
				var index = 0;
				for (var j = 4; j < parts.length; j++) {
					parts[j] = MyUnicodeReplace(parts[j], "<FWC>", FWC_parts[j]);				
					parts[j] = MyUnicodeReplace(parts[j], "<FWC_UPPER>", FWC_UPPER_parts[j]);				
					parts[j] = MyUnicodeReplace(parts[j], "<FWC_ABBREVIATION>", FWC_ABBREVIATION_parts[j]);				
				}
				
				var MasterEnglishVersion = parts[4];
				MasterEnglishVersion = HandleQuotesAndBackSlashes(MasterEnglishVersion);
				
				var Deprecated = parts[5];
				var TranslatedByAndovar = parts[6];
				var FrenchValue = parts[7];
				FrenchValue = HandleQuotesAndBackSlashes(FrenchValue);
				var ItalianValue = parts[8];
				ItalianValue = HandleQuotesAndBackSlashes(ItalianValue);
				var GermanValue = parts[9];
				GermanValue = HandleQuotesAndBackSlashes(GermanValue);
				var SpanishValue = parts[10];
				SpanishValue = HandleQuotesAndBackSlashes(SpanishValue);
				var RussianValue = parts[11];
				RussianValue = HandleQuotesAndBackSlashes(RussianValue);
				var PortugueseValue = parts[12];
				PortugueseValue = HandleQuotesAndBackSlashes(PortugueseValue);
				var ChineseValue = parts[13];
				ChineseValue = HandleQuotesAndBackSlashes(ChineseValue);
				var BahasaValue = parts[14];
				BahasaValue = HandleQuotesAndBackSlashes(BahasaValue);
				var KoreanValue = parts[15];
				KoreanValue = HandleQuotesAndBackSlashes(KoreanValue);
				var JapaneseValue = parts[16];
				JapaneseValue = HandleQuotesAndBackSlashes(JapaneseValue);
				var ThaiValue = parts[17];
				ThaiValue = HandleQuotesAndBackSlashes(ThaiValue);
				var VietnameseValue = parts[18];
				VietnameseValue = HandleQuotesAndBackSlashes(VietnameseValue);

				outString[1] += ordinal + "#" + stringName + "#" + MasterEnglishVersion + "\r\n";
				outString[2] += ordinal + "#" + stringName + "#" + FrenchValue + "\r\n";
				outString[3] += ordinal + "#" + stringName + "#" + ItalianValue + "\r\n";
				outString[4] += ordinal + "#" + stringName + "#" + GermanValue + "\r\n";
				outString[5] += ordinal + "#" + stringName + "#" + SpanishValue + "\r\n";
				outString[6] += ordinal + "#" + stringName + "#" + RussianValue + "\r\n";
				outString[7] += ordinal + "#" + stringName + "#" + PortugueseValue + "\r\n";
				outString[8] += ordinal + "#" + stringName + "#" + ChineseValue + "\r\n";
				outString[9] += ordinal + "#" + stringName + "#" + BahasaValue + "\r\n";
				outString[10] += ordinal + "#" + stringName + "#" + KoreanValue + "\r\n";
				outString[11] += ordinal + "#" + stringName + "#" + JapaneseValue + "\r\n";
				outString[12] += ordinal + "#" + stringName + "#" + ThaiValue + "\r\n";
				outString[13] += ordinal + "#" + stringName + "#" + VietnameseValue + "\r\n";
				if (i != 1) sqlString += ",\n";
				//sqlString += "(" + ordinal + ",'" + stringName + "','" + EscapeQuotesForSQL(MasterEnglishVersion) + "','" + EscapeQuotesForSQL(FrenchValue) + "','" + EscapeQuotesForSQL(ItalianValue) + "','" + EscapeQuotesForSQL(GermanValue) + "','" + EscapeQuotesForSQL(SpanishValue) + "','" + EscapeQuotesForSQL(RussianValue) + "','" + EscapeQuotesForSQL(PortugueseValue) + "','" + EscapeQuotesForSQL(ChineseValue) + "','" + EscapeQuotesForSQL(BahasaValue) + "','" + EscapeQuotesForSQL(KoreanValue) + "','" + EscapeQuotesForSQL(JapaneseValue) + "','" + EscapeQuotesForSQL(ThaiValue) + "','" + EscapeQuotesForSQL(VietnameseValue) + "')";
				sqlString += "(" + ordinal + ",'" + stringName + "','" + EscapeQuotesForSQL(MasterEnglishVersion) + "')";
				/*
				if (stringName == 'loadingscreen_tips') {
					tips[1] += MasterEnglishVersion + "\r\n";
					tips[2] += FrenchValue + "\r\n";
					tips[3] += ItalianValue + "\r\n";
					tips[4] += GermanValue + "\r\n";
					tips[5] += SpanishValue + "\r\n";
					tips[6] += RussianValue + "\r\n";
					tips[7] += PortugueseValue + "\r\n";
					tips[8] += ChineseValue + "\r\n";
					tips[9] += BahasaValue + "\r\n";
					tips[10] += KoreanValue + "\r\n";
					tips[11] += JapaneseValue + "\r\n";
					tips[12] += ThaiValue + "\r\n";
					tips[13] += VietnameseValue + "\r\n";
					outString[0] += ((i > 1) ? ",\r\n" : "") + "\t" + "EnumNotUsed" + notUsedOrdinal++;
					dict[1] += "-" + "\r\n";
					dict[2] += "-" + "\r\n";
					dict[3] += "-" + "\r\n";
					dict[4] += "-" + "\r\n";
					dict[5] += "-" + "\r\n";
					dict[6] += "-" + "\r\n";
					dict[7] += "-" + "\r\n";
					dict[8] += "-" + "\r\n";
					dict[9] += "-" + "\r\n";
					dict[10] += "-" + "\r\n";
					dict[11] += "-" + "\r\n";
					dict[12] += "-" + "\r\n";
					dict[13] += "-" + "\r\n";
				}
				else if (stringName == 'question_of_the_day') {
					qotd[1] += MasterEnglishVersion + "\r\n";
					qotd[2] += FrenchValue + "\r\n";
					qotd[3] += ItalianValue + "\r\n";
					qotd[4] += GermanValue + "\r\n";
					qotd[5] += SpanishValue + "\r\n";
					qotd[6] += RussianValue + "\r\n";
					qotd[7] += PortugueseValue + "\r\n";
					qotd[8] += ChineseValue + "\r\n";
					qotd[9] += BahasaValue + "\r\n";
					qotd[10] += KoreanValue + "\r\n";
					qotd[11] += JapaneseValue + "\r\n";
					qotd[12] += ThaiValue + "\r\n";
					qotd[13] += VietnameseValue + "\r\n";
					outString[0] += ((i > 1) ? ",\r\n" : "") + "\t" + "EnumNotUsed" + notUsedOrdinal++;
					dict[1] += "-" + "\r\n";
					dict[2] += "-" + "\r\n";
					dict[3] += "-" + "\r\n";
					dict[4] += "-" + "\r\n";
					dict[5] += "-" + "\r\n";
					dict[6] += "-" + "\r\n";
					dict[7] += "-" + "\r\n";
					dict[8] += "-" + "\r\n";
					dict[9] += "-" + "\r\n";
					dict[10] += "-" + "\r\n";
					dict[11] += "-" + "\r\n";
					dict[12] += "-" + "\r\n";
					dict[13] += "-" + "\r\n";
				}
				else if (stringName == 'question_of_the_day_answers') {
					outString[0] += ((i > 1) ? ",\r\n" : "") + "\t" + "EnumNotUsed" + notUsedOrdinal++;
					dict[1] += "-" + "\r\n";
					dict[2] += "-" + "\r\n";
					dict[3] += "-" + "\r\n";
					dict[4] += "-" + "\r\n";
					dict[5] += "-" + "\r\n";
					dict[6] += "-" + "\r\n";
					dict[7] += "-" + "\r\n";
					dict[8] += "-" + "\r\n";
					dict[9] += "-" + "\r\n";
					dict[10] += "-" + "\r\n";
					dict[11] += "-" + "\r\n";
					dict[12] += "-" + "\r\n";
					dict[13] += "-" + "\r\n";
				} 
				else {
					outString[0] += ((i > 1) ? ",\r\n" : "") + "\t" + stringName;
					dict[1] += MasterEnglishVersion + "\r\n";
					dict[2] += FrenchValue + "\r\n";
					dict[3] += ItalianValue + "\r\n";
					dict[4] += GermanValue + "\r\n";
					dict[5] += SpanishValue + "\r\n";
					dict[6] += RussianValue + "\r\n";
					dict[7] += PortugueseValue + "\r\n";
					dict[8] += ChineseValue + "\r\n";
					dict[9] += BahasaValue + "\r\n";
					dict[10] += KoreanValue + "\r\n";
					dict[11] += JapaneseValue + "\r\n";
					dict[12] += ThaiValue + "\r\n";
					dict[13] += VietnameseValue + "\r\n";
				}
				*/
			}
		}
	}
	
	for (var i = 11; i <= 13; i++) {
		var blob = new Blob([outString[i]], {type: "text/plain;charset=utf-8"}); 
		saveAs(blob, "translationlist"+i+".txt");
	}

	outString[0] += "\r\n};\r\n";

	var blob = new Blob([outString[0]], {type: "text/plain;charset=utf-8"}); 
	saveAs(blob, "LanguageStringEnums.cs");
	
	sqlString += ";";
	var blob = new Blob([sqlString], {type: "text/plain;charset=utf-8"});
	saveAs(blob, "mst.sql");
	
/*
	for (var i = 1; i <= 13; i++) {
		var blob = new Blob([dict[i]], {type: "text/plain;charset=utf-8"}); 
		saveAs(blob, "dict"+i+".txt");
	}
	for (var i = 1; i <= 13; i++) {
		var blob = new Blob([tips[i]], {type: "text/plain;charset=utf-8"}); 
		saveAs(blob, "tips"+i+".txt");
	}
	for (var i = 1; i <= 13; i++) {
		var blob = new Blob([qotd[i]], {type: "text/plain;charset=utf-8"}); 
		saveAs(blob, "qotd"+i+".txt");
	}
*/
}	

