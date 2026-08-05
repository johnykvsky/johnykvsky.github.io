(function () {
  "use strict";

  var uuidResult = ToolKit.$("uuidResult");
  var uuidInput = ToolKit.$("uuidInput");
  var status = ToolKit.$("status");
  var validationResult = ToolKit.$("validationResult");
  var versionResult = ToolKit.$("versionResult");
  var variantResult = ToolKit.$("variantResult");
  var timestampSourceResult = ToolKit.$("timestampSourceResult");
  var localTimeResult = ToolKit.$("localTimeResult");
  var utcTimeResult = ToolKit.$("utcTimeResult");
  var unixSecondsResult = ToolKit.$("unixSecondsResult");
  var unixMillisecondsResult = ToolKit.$("unixMillisecondsResult");
  var hex = [];
  var gregorianUnixOffset = 122192928000000000n;

  for (var i = 0; i < 256; i += 1) {
    hex[i] = (i < 16 ? "0" : "") + i.toString(16);
  }

  function hasSecureCrypto() {
    return window.crypto && typeof window.crypto.getRandomValues === "function";
  }

  function makeUuidV4() {
    var randomBytes;

    if (!hasSecureCrypto()) {
      return null;
    }

    randomBytes = window.crypto.getRandomValues(new Uint8Array(16));
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

    return [
      hex[randomBytes[0]],
      hex[randomBytes[1]],
      hex[randomBytes[2]],
      hex[randomBytes[3]],
      "-",
      hex[randomBytes[4]],
      hex[randomBytes[5]],
      "-",
      hex[randomBytes[6]],
      hex[randomBytes[7]],
      "-",
      hex[randomBytes[8]],
      hex[randomBytes[9]],
      "-",
      hex[randomBytes[10]],
      hex[randomBytes[11]],
      hex[randomBytes[12]],
      hex[randomBytes[13]],
      hex[randomBytes[14]],
      hex[randomBytes[15]]
    ].join("");
  }

  function makeUuidV7() {
    var randomBytes;
    var timestamp;
    var uuidBytes;

    if (!hasSecureCrypto()) {
      return null;
    }

    randomBytes = window.crypto.getRandomValues(new Uint8Array(10));
    timestamp = BigInt(Date.now());
    uuidBytes = new Uint8Array(16);

    uuidBytes[0] = Number((timestamp >> 40n) & 0xffn);
    uuidBytes[1] = Number((timestamp >> 32n) & 0xffn);
    uuidBytes[2] = Number((timestamp >> 24n) & 0xffn);
    uuidBytes[3] = Number((timestamp >> 16n) & 0xffn);
    uuidBytes[4] = Number((timestamp >> 8n) & 0xffn);
    uuidBytes[5] = Number(timestamp & 0xffn);
    uuidBytes[6] = (randomBytes[0] & 0x0f) | 0x70;
    uuidBytes[7] = randomBytes[1];
    uuidBytes[8] = (randomBytes[2] & 0x3f) | 0x80;

    for (var i = 9; i < 16; i += 1) {
      uuidBytes[i] = randomBytes[i - 6];
    }

    return formatUuidBytes(uuidBytes);
  }

  function formatUuidBytes(bytes) {
    return [
      hex[bytes[0]],
      hex[bytes[1]],
      hex[bytes[2]],
      hex[bytes[3]],
      "-",
      hex[bytes[4]],
      hex[bytes[5]],
      "-",
      hex[bytes[6]],
      hex[bytes[7]],
      "-",
      hex[bytes[8]],
      hex[bytes[9]],
      "-",
      hex[bytes[10]],
      hex[bytes[11]],
      hex[bytes[12]],
      hex[bytes[13]],
      hex[bytes[14]],
      hex[bytes[15]]
    ].join("");
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function isUuidV4(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function setValidation(state, text) {
    validationResult.className = "validation-result " + state;
    validationResult.textContent = text;
  }

  function setDetail(element, value) {
    element.textContent = value;
  }

  function resetDetails() {
    [
      versionResult,
      variantResult,
      timestampSourceResult,
      localTimeResult,
      utcTimeResult,
      unixSecondsResult,
      unixMillisecondsResult
    ].forEach(function (element) {
      setDetail(element, "-");
    });
  }

  function getVariant(value) {
    var variantNibble = parseInt(value.split("-")[3].charAt(0), 16);

    if (variantNibble < 8) {
      return "NCS compatibility";
    }
    if (variantNibble < 12) {
      return "RFC 4122 / RFC 9562";
    }
    if (variantNibble < 14) {
      return "Microsoft compatibility";
    }
    return "Reserved for future use";
  }

  function getUnixMillisecondsFromUuid(value, version) {
    var groups = value.split("-");
    var timestamp100ns;

    if (version === "1") {
      timestamp100ns = BigInt("0x" + groups[2].slice(1) + groups[1] + groups[0]);
      return (timestamp100ns - gregorianUnixOffset) / 10000n;
    }

    if (version === "6") {
      timestamp100ns = BigInt("0x" + groups[0] + groups[1] + groups[2].slice(1));
      return (timestamp100ns - gregorianUnixOffset) / 10000n;
    }

    if (version === "7") {
      return BigInt("0x" + groups[0] + groups[1]);
    }

    return null;
  }

  function renderDateDetails(milliseconds, source) {
    var date = new Date(Number(milliseconds));

    setDetail(timestampSourceResult, source);

    if (!ToolKit.isValidDate(date)) {
      setDetail(localTimeResult, "Outside JavaScript Date range");
      setDetail(utcTimeResult, "Outside JavaScript Date range");
      setDetail(unixSecondsResult, "-");
      setDetail(unixMillisecondsResult, milliseconds.toString());
      return;
    }

    setDetail(localTimeResult, ToolKit.formatLocalDate(date));
    setDetail(utcTimeResult, date.toUTCString());
    setDetail(unixSecondsResult, (milliseconds / 1000n).toString());
    setDetail(unixMillisecondsResult, milliseconds.toString());
  }

  function renderUuidDetails(value) {
    var version = value.charAt(14);
    var milliseconds;

    resetDetails();
    setDetail(versionResult, "Version " + version);
    setDetail(variantResult, getVariant(value));

    milliseconds = getUnixMillisecondsFromUuid(value, version);

    if (milliseconds === null) {
      setDetail(timestampSourceResult, "No timestamp encoded in UUID version " + version + ".");
      return;
    }

    if (version === "1") {
      renderDateDetails(milliseconds, "UUID v1 Gregorian timestamp.");
    } else if (version === "6") {
      renderDateDetails(milliseconds, "UUID v6 reordered Gregorian timestamp.");
    } else {
      renderDateDetails(milliseconds, "UUID v7 Unix millisecond timestamp.");
    }
  }

  function generateUuid() {
    renderGeneratedUuid(makeUuidV4(), "UUID v4 generated.");
  }

  function generateUuidV7() {
    renderGeneratedUuid(makeUuidV7(), "UUID v7 generated.");
  }

  function renderGeneratedUuid(uuid, message) {
    if (!uuid) {
      uuidResult.textContent = "";
      resetDetails();
      ToolKit.setStatus(status, "error", "Secure crypto is not available in this browser context.");
      return;
    }

    uuidResult.textContent = uuid;
    uuidInput.value = uuid;
    setValidation("ok", isUuidV4(uuid) ? "Valid UUID v4." : "Valid UUID v7.");
    renderUuidDetails(uuid);
    ToolKit.setStatus(status, "ok", message);
  }

  function validateUuid() {
    var value = uuidInput.value.trim();

    if (value === "") {
      setValidation("neutral", "Paste a UUID to validate.");
      resetDetails();
      ToolKit.setStatus(status, "neutral", "Generate or validate a UUID.");
      return;
    }

    if (!isUuid(value)) {
      setValidation("error", "Invalid UUID.");
      resetDetails();
      ToolKit.setStatus(status, "error", "UUID validation failed.");
      return;
    }

    uuidInput.value = value.toLowerCase();
    renderUuidDetails(value.toLowerCase());

    if (isUuidV4(value)) {
      setValidation("ok", "Valid UUID v4.");
      ToolKit.setStatus(status, "ok", "UUID validation passed.");
      return;
    }

    setValidation("ok", "Valid UUID, but not version 4.");
    ToolKit.setStatus(status, "warning", "UUID is valid, but it is not version 4.");
  }

  function copyGenerated(button) {
    ToolKit.copyText(uuidResult.textContent, button, uuidResult);
  }

  ToolKit.$("generateBtn").addEventListener("click", generateUuid);
  ToolKit.$("generateV7Btn").addEventListener("click", generateUuidV7);
  ToolKit.$("copyGeneratedBtn").addEventListener("click", function (event) {
    copyGenerated(event.currentTarget);
  });
  ToolKit.$("validateBtn").addEventListener("click", validateUuid);
  uuidInput.addEventListener("input", validateUuid);
  uuidInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      validateUuid();
    }
  });

  generateUuid();
}());
