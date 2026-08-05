(function () {
  "use strict";

  var encodedInput = ToolKit.$("encodedInput");
  var decodedInput = ToolKit.$("decodedInput");
  var status = ToolKit.$("status");
  var activeSide = "";

  function bytesToBinary(bytes) {
    var binary = "";

    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });

    return binary;
  }

  function binaryToBytes(binary) {
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function encodeText(value) {
    return btoa(bytesToBinary(new TextEncoder().encode(value)));
  }

  function decodeText(value) {
    return new TextDecoder("utf-8", { fatal: true }).decode(binaryToBytes(atob(cleanBase64(value))));
  }

  function cleanBase64(value) {
    return value.replace(/\s+/g, "");
  }

  function decodeFromEncoded() {
    var value = encodedInput.value;

    activeSide = "encoded";

    if (value.trim() === "") {
      decodedInput.value = "";
      ToolKit.setStatus(status, "neutral", "Edit either panel to encode or decode.");
      return;
    }

    try {
      decodedInput.value = decodeText(value);
      ToolKit.setStatus(status, "ok", "Base64 decoded.");
    } catch (error) {
      decodedInput.value = "";
      ToolKit.setStatus(status, "error", "Decode error: " + error.message);
    }
  }

  function encodeFromDecoded() {
    activeSide = "decoded";
    encodedInput.value = encodeText(decodedInput.value);

    if (decodedInput.value === "") {
      ToolKit.setStatus(status, "neutral", "Edit either panel to encode or decode.");
    } else {
      ToolKit.setStatus(status, "ok", "Text encoded.");
    }
  }

  function clearAll() {
    encodedInput.value = "";
    decodedInput.value = "";
    activeSide = "";
    ToolKit.setStatus(status, "neutral", "Edit either panel to encode or decode.");
  }

  ToolKit.$("copyEncodedBtn").addEventListener("click", function (event) {
    ToolKit.copyText(encodedInput.value, event.currentTarget, encodedInput);
  });

  ToolKit.$("copyDecodedBtn").addEventListener("click", function (event) {
    ToolKit.copyText(decodedInput.value, event.currentTarget, decodedInput);
  });

  ToolKit.$("clearBtn").addEventListener("click", clearAll);
  encodedInput.addEventListener("input", decodeFromEncoded);
  decodedInput.addEventListener("input", encodeFromDecoded);

  decodeFromEncoded();
}());
