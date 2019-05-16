//make 3 as 03
function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

//fill inputs with current date / timestamp for page load
var currentDate = new Date;
document.getElementById("human_date").value = formatDate(currentDate);
document.getElementById("from_timestamp_result_utc").innerHTML = currentDate.toUTCString();
document.getElementById("from_timestamp_result").innerHTML = formatDate(currentDate);
document.getElementById("to_timestamp_result").innerHTML  = Math.floor(currentDate / 1000);
document.getElementById("from_timestamp_value").value = Math.floor(Date.now() / 1000);

//convert timestamp to human readable date
document.getElementById("from_timestamp").addEventListener("click",function(e){
    toDate = new Date(document.getElementById("from_timestamp_value").value * 1000);
    document.getElementById("from_timestamp_result").innerHTML = formatDate(toDate);
    document.getElementById("from_timestamp_result_utc").innerHTML = toDate.toUTCString();
},false); 

//convert human readable date to timestamp
document.getElementById("to_timestamp").addEventListener("click",function(e){
    toDateStr = document.getElementById("human_date").value;
    toDate = Math.floor(Date.parse(toDateStr.replace(/-/g, ' ')) / 1000);
    document.getElementById("to_timestamp_result").innerHTML  = toDate;
},false); 

//format date to Y-m-d H:i:s
function formatDate(inputDate) {
    return (inputDate.getFullYear() + 
    '-' + 
    (zeroPad(inputDate.getMonth()+1,2)) + 
    '-' + 
    zeroPad(inputDate.getDate(),2) + 
    " " + 
    zeroPad(inputDate.getHours(),2) + 
    ":" + 
    zeroPad(inputDate.getMinutes(),2) + 
    ":" + 
    zeroPad(inputDate.getSeconds(),2));
}