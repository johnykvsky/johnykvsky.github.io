function syntaxHighlight(json) {
  //replace with html entities
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  //regexp for coloring
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|(\[|\])|(\{|\})|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
          if (/:$/.test(match)) {
              cls = 'key';
          } else {
              cls = 'string';
          }
      } else if (/true|false/.test(match)) {
          cls = 'boolean';
      } else if (/null/.test(match)) {
          cls = 'null';
      } else if (/\{|\}/.test(match)) {
          cls = 'cbrackets';
      } else if (/\[|\]/.test(match)) {
          cls = 'sbrackets';
      }
      return '<span class="' + cls + '">' + match + '</span>';
  });
}

//remove all non ASCII characters except linefeed and carriage return
function removeAllNonAsciiCharacters() {
  var input = document.getElementById("source").value;
  input = input.replace(/[^\x0A\x0D\x20-\x7E]*/g, '');
  document.getElementById("source").value = input;
}

function parseJson() {
  try {
    var input = document.getElementById("source").value;
    input = input.toString();
    if (input == '') {
      document.getElementById("result").innerHTML = '';
      document.getElementById("result").className = "";
      document.getElementById("output").innerHTML = '';
      return;
    }
    
    //remove new lines
    input = input.replace(/(?:\r\n|\r|\n)/g, '');
    var result = jsonlint.parse(input);
    if (result) {
      document.getElementById("result").innerHTML = "JSON is valid!";
      document.getElementById("result").className = "pass";
      document.getElementById("output").innerHTML = syntaxHighlight(JSON.stringify(result, null, "    "));
    }
  } catch(e) {
    document.getElementById("result").innerHTML = e;
    document.getElementById("result").className = "fail";
    document.getElementById("output").innerHTML = '';
  }
};

//select given element content
function selectElementText(e){
    var range = document.createRange() // create new range object
    range.selectNodeContents(e) // set range to encompass desired element text
    var selection = window.getSelection() // get Selection object from currently user selected text
    selection.removeAllRanges() // unselect any user selected text (if any)
    selection.addRange(range) // add range to Selection object to select it
}

function toggleClass(element, classname){
  document.getElementById(element).classList.toggle(classname);
}

function removeSpaces() {
  var input = document.getElementById("source").value;
  input = input.replace(/(?:\r\n|\r|\n)/g, '');
  input = input.replace(/([^"]+)|("[^"]+")/g, function($0, $1, $2) {
            if ($1) {
                return $1.replace(/\s/g, '');
            } else {
                return $2; 
            } 
          });
    document.getElementById("source").value = input;
}

function removeAdditionalSlashes() {
  var input = document.getElementById("source").value;
  input = input.replace(/\\/g, "");
  document.getElementById("source").value = input;
}


//hook for button color and wordwrap
document.getElementById("wordwrap").addEventListener("click",function(e){
  toggleClass("output", "wordwrap");
  toggleClass("wordwrap", "button-primary");
},false);

//hook for parse "on type"
document.getElementById("source").addEventListener('input', function (evt) {
  parseJson();
});

//select results
document.getElementById("select_results").addEventListener("click",function(e){
  element = document.getElementById("output");
  selectElementText(element)
},false);  

//hook for remove non ASCII characters from input with all spaces not in double quotes
document.getElementById("minifyandclean").addEventListener("click",function(e){
  removeAdditionalSlashes();
  removeAllNonAsciiCharacters();
  removeSpaces();
  toggleClass("minifyandclean", "button-primary");
  setTimeout(toggleClass, 100, "minifyandclean", "button-primary");
  parseJson();
},false);

