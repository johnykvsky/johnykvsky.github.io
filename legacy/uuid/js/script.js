var hex = [];

for (var i = 0; i < 256; i++) {
    hex[i] = (i < 16 ? '0' : '') + (i).toString(16);
}

function makeUUID() {
    var r = crypto.getRandomValues(new Uint8Array(16));

    r[6] = r[6] & 0x0f | 0x40;
    r[8] = r[8] & 0x3f | 0x80;

    return (
        hex[r[0]] +
        hex[r[1]] +
        hex[r[2]] +
        hex[r[3]] +
        "-" +
        hex[r[4]] +
        hex[r[5]] +
        "-" +
        hex[r[6]] +
        hex[r[7]] +
        "-" +
        hex[r[8]] +
        hex[r[9]] +
        "-" +
        hex[r[10]] +
        hex[r[11]] +
        hex[r[12]] +
        hex[r[13]] +
        hex[r[14]] +
        hex[r[15]]
    );
}

//copy uuid to clipboard
document.getElementById("copy_uuid").addEventListener("click",function(e){
    var aux = document.createElement("input");
    aux.setAttribute("value", document.getElementById('uuid_result').innerHTML);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);
    document.getElementById("copy_uuid").innerHTML = "copied!";
});

//generate UUIDv4
document.getElementById("uuid_generator").addEventListener("click",function(e){
    document.getElementById("uuid_result").innerHTML = makeUUID();
    document.getElementById("copy_uuid").innerHTML = "copy to clipboard";
},false); 

//initial uuid for page load
document.getElementById("uuid_result").innerHTML = makeUUID();

function isUuid(str) {
    var regexUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regexUuid.test(str);
}

//validate uuid
document.getElementById("validate_uuid").addEventListener("click",function(e){
    uuid = document.getElementById("uuid").value;
    if (isUuid(uuid) === true) {
        document.getElementById("validate_result").innerHTML = 'Valid';      
        return;
    }
    document.getElementById("validate_result").innerHTML = 'Invalid UUID';
},false); 