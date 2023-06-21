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

function parseJson(suffix = "") {
  var jsonNumber = "JSON-2 ";
  if (!suffix || suffix.length === 0 ) {
    suffix = "";
    jsonNumber = "JSON-1"
  }

  try {
    var input = document.getElementById("source" + suffix).value;
    input = input.toString();
    if (input == '') {
      document.getElementById("result" + suffix).innerHTML = '';
      document.getElementById("result" + suffix).className = "";
      document.getElementById("output" + suffix).innerHTML = '';
      return;
    }
    
    //remove new lines
    input = input.replace(/(?:\r\n|\r|\n)/g, '');
    var result = jsonlint.parse(input);
    if (result) {
      document.getElementById("result" + suffix).innerHTML = jsonNumber + " is valid!";
      document.getElementById("result" + suffix).className = "pass";
      document.getElementById("output" + suffix).innerHTML = syntaxHighlight(JSON.stringify(result, null, "    "));
    }
  } catch(e) {
    document.getElementById("result" + suffix).innerHTML = jsonNumber + e;
    document.getElementById("result" + suffix).className = "fail";
    document.getElementById("output" + suffix).innerHTML = '';
  }
};

function toggleClass(element, classname){
  document.getElementById(element).classList.toggle(classname);
}

//hook for remove non ASCII characters from input with all spaces not in double quotes
document.getElementById("switch").addEventListener("click",function(e){
  var output1 = "output";
  var output2 = "output_second";
  var buttonName = "switched"

  if (document.getElementById("switch").classList.contains('button-primary')) {
    var output1 = "output_second";
    var output2 = "output";
    var buttonName = "switch"
  }

  var output1Data = document.getElementById(output1).innerHTML;
  var output2Data = document.getElementById(output2).innerHTML;
  document.getElementById(output1).innerHTML = output2Data;
  document.getElementById(output2).innerHTML = output1Data;
  document.getElementById("switch").innerHTML = buttonName;
  toggleClass("switch", "button-primary");
},false);

//clear source
document.getElementById("clear_source").addEventListener("click",function(e){
  document.getElementById("source").innerHTML = '';
},false);

//clear source
document.getElementById("clear_source_second").addEventListener("click",function(e){
  document.getElementById("source_second").innerHTML = '';
},false);

//hook for parse "on type"
document.getElementById("source").addEventListener('input', function (evt) {
  parseJson();
});

//hook for parse "on type"
document.getElementById("source_second").addEventListener('input', function (evt) {
  parseJson("_second");
});

// top button
let mybutton = document.getElementById("top_button");

window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}

function goUp() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}