var cities = {
  galezow: {row: 346, col: 192},
  ustka: {row: 340, col: 181},
  poddabie: {row: 339, col: 185},
  czestochowa: {row: 445, col: 217},
  ustron: {row: 475, col: 212},
  kule: {row: 437, col: 213}
};

function loadMeteo(cityValue = "czestochowa") {
  try {
    var today = new Date().toISOString().slice(0,10);
    var datestring = today.replace(/-/g, "");
    var hourSelect = document.getElementById("hours");
    var hourValue = hourSelect.value;
    var cityRow = cities[cityValue].row;
    var cityCol = cities[cityValue].col;
    document.getElementById("meteogram").src = "https://www.meteo.pl/um/metco/mgram_pict.php?ntype=0u&row="+cityRow+"&col="+cityCol+"&lang=pl&fdate="+datestring+""+hourValue;
  } catch(e) {

  }
};

document.getElementById("czestochowa").addEventListener("click",function(e){
  loadMeteo("czestochowa");
},false);

document.getElementById("galezow").addEventListener("click",function(e){
  loadMeteo("galezow");
},false);

document.getElementById("kule").addEventListener("click",function(e){
  loadMeteo("kule");
},false);

document.getElementById("ustron").addEventListener("click",function(e){
  loadMeteo("ustron");
},false);

document.getElementById("ustka").addEventListener("click",function(e){
  loadMeteo("ustka");
},false);

document.getElementById("poddabie").addEventListener("click",function(e){
  loadMeteo("poddabie");
},false);