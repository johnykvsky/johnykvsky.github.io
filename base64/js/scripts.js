function toggleClass(element, classname){
  document.getElementById(element).classList.toggle(classname);
}

function decode()
{
  try {
    var source = document.getElementById("source").value;
    input = atob(source);
    document.getElementById("output").value = input;
    document.getElementById("result").innerHTML = "Decoded string is valid!";
    document.getElementById("result").className = "pass";
  } catch(e) {
    document.getElementById("result").innerHTML = 'Decode error: ' + e;
    document.getElementById("result").className = "fail";
    document.getElementById("output").value = '';
  }
}

function encode()
{
  try {
    var source = document.getElementById("output").value;
    input = btoa(source);
    document.getElementById("source").value = input;
    document.getElementById("result").innerHTML = "Encoded strring is valid!";
    document.getElementById("result").className = "pass";        
  } catch(e) {
    document.getElementById("result").innerHTML = 'Encode error: ' + e;
    document.getElementById("result").className = "fail";
    document.getElementById("source").value = '';
  }
}

//dark mode
document.getElementById("switchtheme").addEventListener("click",function(e){
  toggleClass("body", "dark-background");
  toggleClass("source", "dark-textarea");
  toggleClass("output", "dark-output");
  toggleClass("switchtheme", "button-primary");
},false);

//hook for parse "on type"
document.getElementById("source").addEventListener('input', function (evt) {
  decode();
});

//hook for parse "on type"
document.getElementById("output").addEventListener('input', function (evt) {
  encode();
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
