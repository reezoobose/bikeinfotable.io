
var EnglishPhrase = 'In order to deliver your prize to you, please reply to this message with a valid postal and email address so we can contact you. If you do not send us a valid postal address, we won\'t be able to ship your prize.';
var TranslationResult;
var numLanguages = 12;

function init() 
{
}

var HttpClient = function() {
    this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() { 
            if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
                aCallback(anHttpRequest.responseText);
        }

        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
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

function unicodeSplit(str, splitChar)
{
    var str1 = "A↵  translations: [↵T";
    var n = str1.charCodeAt(1);
	var targetList = [];
	var seperator = String.fromCharCode('\u21b5');
	var seperator2 = "↵ ";
	var seperator3 = String.fromCharCode(8629) + "äbc + ABC";
	var seperator4 = seperator3.charCodeAt(0);
	for(var i = 0; i < str.length; i++){
		var ch = str[i];
		var ch1 = str.charCodeAt(i);
		var ch2 = str.codePointAt(i);
		var ch3 = fixedCharCodeAt(str, i);
		if (ch3 != 10) {
			targetList[targetList.length - 1] += ch;
		}
		else {
			targetList.push("");
		}
	}
	return targetList;
}

function parseTranslateHttpResponse(responseText, stringIndex)
{
	var lines = unicodeSplit(responseText, '\\u21b5');//"↵");
	var result = "";
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search("translatedText") != -1) {
			var startOfText = lines[i].search(":") + 3;
			var string = lines[i].substring(startOfText, lines[i].length-1);
// private surrogates as single characters
			var pos;
			while((pos = string.search("u200b")) != -1) {
				string = string.substring(0,pos - 1) + string.substring(pos +5,string.length);//string.replace('\\u200b','');
			}
			while((pos = string.search("u003c")) != -1) {
				string = string.substring(0,pos - 1) + '<' + string.substring(pos +5,string.length);
			}
			while((pos = string.search("u003e")) != -1) {
				string = string.substring(0,pos - 1) + '>' + string.substring(pos +5,string.length);
			}
			while((pos = string.search("&#39;")) != -1) {
				string = string.substring(0,pos) + '\'' + string.substring(pos +5,string.length);
			}
			if (result.length > 0) result += '\t';
			result += string;
		}
	}
	return result;
}

function repeat(num,whatTo){
    var arr = [];
    for(var i=0;i<num;i++){
        arr.push(whatTo);
    }
    return arr;
}

function updateTranslationResult()
{
	var numTranslated = 0;
	TranslationResultString = EnglishPhrase + "\t\t0";
	for (var i = 0; i < numLanguages; i++) {
		if (TranslationResult[i].length > 0) {
			numTranslated++;
			TranslationResultString += "\t"+TranslationResult[i];
		}
	}
	if (numTranslated == numLanguages) {
		//document.getElementById("translation").innerHTML += "<br>" + TranslationResultString;//response.data.translations[0].translatedText;
		document.getElementById("ta_txtoutput").value = TranslationResultString;
	}
}

function translateTextArea()
{
	var ta_element = document.getElementById('ta_textinput');
	var englishPhrase = ta_element.value;
	TranslatePhrase(englishPhrase, "");
}

function TranslatePhrase(englishPhrase, name)
{
	/*
		clear the translated strings
	*/
	TranslationResult = repeat(numLanguages,"");
	
	/*
		clear the result area
	*/
	TranslationResultString = "";
	document.getElementById("ta_txtoutput").value = TranslationResultString;
	
	EnglishPhrase = englishPhrase;
	// WARNING: be aware that YOUR-API-KEY inside html is viewable by all your users.
	// Restrict your key to designated domains or use a proxy to hide your key
	// to avoid misusage by other party.
	//var source = 'https://www.googleapis.com/language/translate/v2?key=AIzaSyBHe8d66SL-cQSsYfuKzmbpTv4_TCdovuY&source=en&target=zh&callback=translateText&q=what the fuck?'+'&q=' + sourceText;
	var api = 'https://www.googleapis.com/language/translate/v2?key=AIzaSyBHe8d66SL-cQSsYfuKzmbpTv4_TCdovuY&callback=translateText'
	var source = '&source=' + 'en';
	var target = '&target=';
	var phrase = '&q=' + englishPhrase;//+'&q=' + sourceText;
	var query = api + source + phrase + target;

	aClient = new HttpClient();
	aClient.get(query + 'fr', function(response) {
			// do something with response
			TranslationResult[0] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'it', function(response) {
			// do something with response
			TranslationResult[1] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'de', function(response) {
			// do something with response
			TranslationResult[2] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'es', function(response) {
			// do something with response
			TranslationResult[3] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'ru', function(response) {
			// do something with response
			TranslationResult[4] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'pt', function(response) {
			// do something with response
			TranslationResult[5] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'zh', function(response) {
			// do something with response
			TranslationResult[6] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'id', function(response) {
			// do something with response
			TranslationResult[7] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'ko', function(response) {
			// do something with response
			TranslationResult[8] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'ja', function(response) {
			// do something with response
			TranslationResult[9] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'th', function(response) {
			// do something with response
			TranslationResult[10] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
	aClient.get(query + 'vi', function(response) {
			// do something with response
			TranslationResult[11] = parseTranslateHttpResponse(response, 0);
			updateTranslationResult();
		}
	);
 }