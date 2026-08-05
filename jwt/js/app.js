(function () {
  "use strict";

  var tokenInput = ToolKit.$("tokenInput");
  var decodeView = ToolKit.$("decodeView");
  var encodeView = ToolKit.$("encodeView");
  var decodeModeBtn = ToolKit.$("decodeModeBtn");
  var encodeModeBtn = ToolKit.$("encodeModeBtn");
  var keyInput = ToolKit.$("keyInput");
  var status = ToolKit.$("status");
  var decodeResult = ToolKit.$("decodeResult");
  var verifyResult = ToolKit.$("verifyResult");
  var headerOutput = ToolKit.$("headerOutput");
  var payloadOutput = ToolKit.$("payloadOutput");
  var algorithmResult = ToolKit.$("algorithmResult");
  var typeResult = ToolKit.$("typeResult");
  var subjectResult = ToolKit.$("subjectResult");
  var issuerResult = ToolKit.$("issuerResult");
  var audienceResult = ToolKit.$("audienceResult");
  var issuedAtResult = ToolKit.$("issuedAtResult");
  var notBeforeResult = ToolKit.$("notBeforeResult");
  var expiresResult = ToolKit.$("expiresResult");
  var timeStatusResult = ToolKit.$("timeStatusResult");
  var encodeAlgorithm = ToolKit.$("encodeAlgorithm");
  var encodeSecret = ToolKit.$("encodeSecret");
  var encodeHeaderInput = ToolKit.$("encodeHeaderInput");
  var encodePayloadInput = ToolKit.$("encodePayloadInput");
  var generatedTokenOutput = ToolKit.$("generatedTokenOutput");
  var encodeResult = ToolKit.$("encodeResult");
  var lastHeader = "";
  var lastPayload = "";
  var lastGeneratedToken = "";
  var decodedToken = null;

  var hmacAlgorithms = {
    HS256: "SHA-256",
    HS384: "SHA-384",
    HS512: "SHA-512"
  };

  var hmacMinimumKeyBits = {
    HS256: 256,
    HS384: 384,
    HS512: 512
  };

  var rsaAlgorithms = {
    RS256: "SHA-256",
    RS384: "SHA-384",
    RS512: "SHA-512"
  };

  var rsaPssAlgorithms = {
    PS256: { hash: "SHA-256", saltLength: 32 },
    PS384: { hash: "SHA-384", saltLength: 48 },
    PS512: { hash: "SHA-512", saltLength: 64 }
  };

  var ecdsaAlgorithms = {
    ES256: { hash: "SHA-256", curve: "P-256" },
    ES384: { hash: "SHA-384", curve: "P-384" },
    ES512: { hash: "SHA-512", curve: "P-521" }
  };

  function base64UrlToBase64(value) {
    var base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    var padding = base64.length % 4;

    if (padding === 2) {
      base64 += "==";
    } else if (padding === 3) {
      base64 += "=";
    } else if (padding !== 0) {
      throw new Error("Invalid base64url length.");
    }

    return base64;
  }

  function bytesToBase64Url(bytes) {
    var binary = "";

    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function textToBase64Url(value) {
    return bytesToBase64Url(new TextEncoder().encode(value));
  }

  function base64UrlToBytes(value) {
    var binary = atob(base64UrlToBase64(value));
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function decodeBase64UrlJson(value) {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(value)));
  }

  function parseToken() {
    var token = tokenInput.value.trim();
    var parts = token.split(".");
    var header;
    var payload;

    if (token === "") {
      return { ok: false, empty: true, error: "Paste a JWT to decode." };
    }

    if (parts.length !== 3) {
      return { ok: false, empty: false, error: "JWT must contain header, payload, and signature parts." };
    }

    try {
      header = decodeBase64UrlJson(parts[0]);
      payload = decodeBase64UrlJson(parts[1]);
    } catch (error) {
      return { ok: false, empty: false, error: "Decode error: " + error.message };
    }

    return {
      ok: true,
      token: token,
      parts: parts,
      header: header,
      payload: payload
    };
  }

  function escapeJson(json) {
    return ToolKit.escapeHtml(json).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, function (match, stringPart, colonPart) {
      if (stringPart) {
        if (colonPart) {
          return '<span class="key">' + stringPart + "</span>" + colonPart;
        }
        return '<span class="string">' + stringPart + "</span>";
      }
      if (match === "true" || match === "false") {
        return '<span class="boolean">' + match + "</span>";
      }
      if (match === "null") {
        return '<span class="null">' + match + "</span>";
      }
      return '<span class="number">' + match + "</span>";
    });
  }

  function setVerifyResult(state, text) {
    verifyResult.className = "verify-result " + state;
    verifyResult.textContent = text;
  }

  function setDecodeResult(state, text) {
    decodeResult.className = "verify-result decode-result " + state;
    decodeResult.textContent = text;
  }

  function setEncodeResult(state, text) {
    encodeResult.className = "verify-result " + state;
    encodeResult.textContent = text;
  }

  function renderGeneratedToken(token) {
    var parts = token.split(".");

    lastGeneratedToken = token;

    if (token === "") {
      generatedTokenOutput.textContent = "";
      return;
    }

    generatedTokenOutput.innerHTML = [
      '<span class="token-header">',
      ToolKit.escapeHtml(parts[0] || ""),
      "</span>",
      '<span class="token-dot">.</span>',
      '<span class="token-payload">',
      ToolKit.escapeHtml(parts[1] || ""),
      "</span>",
      '<span class="token-dot">.</span>',
      '<span class="token-signature">',
      ToolKit.escapeHtml(parts[2] || ""),
      "</span>"
    ].join("");
  }

  function setDetail(element, value) {
    if (value === undefined || value === null || value === "") {
      element.textContent = "-";
      return;
    }
    element.textContent = Array.isArray(value) ? value.join(", ") : String(value);
  }

  function resetOutput() {
    decodedToken = null;
    lastHeader = "";
    lastPayload = "";
    headerOutput.textContent = "";
    payloadOutput.textContent = "";
    [
      algorithmResult,
      typeResult,
      subjectResult,
      issuerResult,
      audienceResult,
      issuedAtResult,
      notBeforeResult,
      expiresResult,
      timeStatusResult
    ].forEach(function (element) {
      element.textContent = "-";
    });
    setDecodeResult("neutral", "Decode result will appear here.");
    setVerifyResult("neutral", "Verification is optional.");
  }

  function renderDateClaim(value) {
    var date;

    if (typeof value !== "number") {
      return "-";
    }

    date = new Date(value * 1000);
    if (!ToolKit.isValidDate(date)) {
      return value + " (outside JavaScript Date range)";
    }

    return value + " / " + ToolKit.formatLocalDate(date) + " / " + date.toUTCString();
  }

  function getTimeStatus(payload) {
    var now = Math.floor(Date.now() / 1000);

    if (typeof payload.nbf === "number" && now < payload.nbf) {
      return "Not active yet.";
    }

    if (typeof payload.exp === "number" && now >= payload.exp) {
      return "Expired.";
    }

    if (typeof payload.exp === "number" || typeof payload.nbf === "number") {
      return "Currently active.";
    }

    return "No exp or nbf claim.";
  }

  function renderDecoded(result) {
    lastHeader = JSON.stringify(result.header, null, 2);
    lastPayload = JSON.stringify(result.payload, null, 2);
    headerOutput.innerHTML = escapeJson(lastHeader);
    payloadOutput.innerHTML = escapeJson(lastPayload);
    setDetail(algorithmResult, result.header.alg);
    setDetail(typeResult, result.header.typ);
    setDetail(subjectResult, result.payload.sub);
    setDetail(issuerResult, result.payload.iss);
    setDetail(audienceResult, result.payload.aud);
    setDetail(issuedAtResult, renderDateClaim(result.payload.iat));
    setDetail(notBeforeResult, renderDateClaim(result.payload.nbf));
    setDetail(expiresResult, renderDateClaim(result.payload.exp));
    setDetail(timeStatusResult, getTimeStatus(result.payload));
  }

  function renderTokenFromInput() {
    var result = parseToken();

    if (!result.ok) {
      resetOutput();
      return result;
    }

    decodedToken = result;
    renderDecoded(result);
    setVerifyResult("neutral", "Verification is optional.");
    return result;
  }

  function decodeToken() {
    var result = renderTokenFromInput();

    if (!result.ok) {
      setDecodeResult(result.empty ? "neutral" : "error", result.error);
      return null;
    }

    setDecodeResult("ok", "JWT decoded.");
    return result;
  }

  function pemToArrayBuffer(pem) {
    var base64 = pem
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, "");

    return base64UrlToBytes(base64).buffer;
  }

  function getSigningInput(result) {
    return new TextEncoder().encode(result.parts[0] + "." + result.parts[1]);
  }

  function getSignature(result) {
    return base64UrlToBytes(result.parts[2]);
  }

  function importHmacKey(secret, alg) {
    return crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: hmacAlgorithms[alg] },
      false,
      ["verify"]
    );
  }

  function importHmacSigningKey(secret, alg) {
    return crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: hmacAlgorithms[alg] },
      false,
      ["sign"]
    );
  }

  function importRsaSigningKey(pem, alg) {
    return crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(pem),
      { name: "RSASSA-PKCS1-v1_5", hash: rsaAlgorithms[alg] },
      false,
      ["sign"]
    );
  }

  function importRsaPssSigningKey(pem, alg) {
    return crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(pem),
      { name: "RSA-PSS", hash: rsaPssAlgorithms[alg].hash },
      false,
      ["sign"]
    );
  }

  function importEcdsaSigningKey(pem, alg) {
    return crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(pem),
      { name: "ECDSA", namedCurve: ecdsaAlgorithms[alg].curve },
      false,
      ["sign"]
    );
  }

  function importRsaKey(pem, alg) {
    return crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(pem),
      { name: "RSASSA-PKCS1-v1_5", hash: rsaAlgorithms[alg] },
      false,
      ["verify"]
    );
  }

  function importRsaPssKey(pem, alg) {
    return crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(pem),
      { name: "RSA-PSS", hash: rsaPssAlgorithms[alg].hash },
      false,
      ["verify"]
    );
  }

  function importEcdsaKey(pem, alg) {
    return crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(pem),
      { name: "ECDSA", namedCurve: ecdsaAlgorithms[alg].curve },
      false,
      ["verify"]
    );
  }

  function verifyWithKey(result, key) {
    var alg = result.header.alg;
    var data = getSigningInput(result);
    var signature = getSignature(result);

    if (hmacAlgorithms[alg]) {
      return importHmacKey(key, alg).then(function (cryptoKey) {
        return crypto.subtle.verify("HMAC", cryptoKey, signature, data);
      });
    }

    if (rsaAlgorithms[alg]) {
      return importRsaKey(key, alg).then(function (cryptoKey) {
        return crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, data);
      });
    }

    if (rsaPssAlgorithms[alg]) {
      return importRsaPssKey(key, alg).then(function (cryptoKey) {
        return crypto.subtle.verify(
          { name: "RSA-PSS", saltLength: rsaPssAlgorithms[alg].saltLength },
          cryptoKey,
          signature,
          data
        );
      });
    }

    if (ecdsaAlgorithms[alg]) {
      return importEcdsaKey(key, alg).then(function (cryptoKey) {
        return crypto.subtle.verify({ name: "ECDSA", hash: ecdsaAlgorithms[alg].hash }, cryptoKey, signature, data);
      });
    }

    return Promise.reject(new Error("Unsupported verification algorithm: " + (alg || "missing")));
  }

  function verifySignature() {
    var result = decodedToken || decodeToken();
    var key = keyInput.value;

    if (!result) {
      return;
    }

    if (result.header.alg === "none") {
      setVerifyResult("warning", "Token uses alg none; there is no signature to verify.");
      return;
    }

    if (key.trim() === "") {
      setVerifyResult("warning", "Enter an HMAC secret or PEM public key.");
      return;
    }

    if (!crypto.subtle) {
      setVerifyResult("error", "Web Crypto is not available in this browser context.");
      return;
    }

    setVerifyResult("neutral", "Verifying signature...");

    verifyWithKey(result, key).then(function (valid) {
      setVerifyResult(valid ? "ok" : "error", valid ? "Signature is valid." : "Signature is invalid.");
    }).catch(function (error) {
      setVerifyResult("error", "Verification error: " + error.message);
    });
  }

  function clearAll() {
    tokenInput.value = "";
    keyInput.value = "";
    renderGeneratedToken("");
    resetOutput();
    ToolKit.setStatus(status, "neutral", "Paste a JWT to decode.");
    setDecodeResult("neutral", "Decode result will appear here.");
    setEncodeResult("neutral", "Encode supports unsigned tokens, HMAC secrets, and PEM PKCS#8 private keys.");
  }

  function parseJsonInput(input, label) {
    try {
      return { ok: true, value: JSON.parse(input.value) };
    } catch (error) {
      return { ok: false, error: label + " JSON is invalid: " + error.message };
    }
  }

  function signHmac(signingInput, secret, alg) {
    return importHmacSigningKey(secret, alg).then(function (cryptoKey) {
      return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signingInput));
    }).then(function (signature) {
      return bytesToBase64Url(new Uint8Array(signature));
    });
  }

  function signRsa(signingInput, pem, alg) {
    return importRsaSigningKey(pem, alg).then(function (cryptoKey) {
      return crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
    }).then(function (signature) {
      return bytesToBase64Url(new Uint8Array(signature));
    });
  }

  function signRsaPss(signingInput, pem, alg) {
    return importRsaPssSigningKey(pem, alg).then(function (cryptoKey) {
      return crypto.subtle.sign(
        { name: "RSA-PSS", saltLength: rsaPssAlgorithms[alg].saltLength },
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );
    }).then(function (signature) {
      return bytesToBase64Url(new Uint8Array(signature));
    });
  }

  function signEcdsa(signingInput, pem, alg) {
    return importEcdsaSigningKey(pem, alg).then(function (cryptoKey) {
      return crypto.subtle.sign(
        { name: "ECDSA", hash: ecdsaAlgorithms[alg].hash },
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );
    }).then(function (signature) {
      return bytesToBase64Url(new Uint8Array(signature));
    });
  }

  function signToken(signingInput, key, alg) {
    if (hmacAlgorithms[alg]) {
      return signHmac(signingInput, key, alg);
    }
    if (rsaAlgorithms[alg]) {
      return signRsa(signingInput, key, alg);
    }
    if (rsaPssAlgorithms[alg]) {
      return signRsaPss(signingInput, key, alg);
    }
    if (ecdsaAlgorithms[alg]) {
      return signEcdsa(signingInput, key, alg);
    }
    return Promise.reject(new Error("Unsupported signing algorithm: " + alg));
  }

  function getUtf8BitLength(value) {
    return new TextEncoder().encode(value).length * 8;
  }

  function validateHmacSecret(secret, alg) {
    var actualBits = getUtf8BitLength(secret);
    var requiredBits = hmacMinimumKeyBits[alg];

    if (actualBits < requiredBits) {
      return {
        ok: false,
        error: alg + " requires an HMAC secret of at least " + requiredBits + " bits. Current secret is " + actualBits + " bits."
      };
    }

    return { ok: true };
  }

  function setGeneratedToken(token) {
    renderGeneratedToken(token);
    tokenInput.value = token;
    renderTokenFromInput();
  }

  function encodeToken() {
    var selectedAlg = encodeAlgorithm.value;
    var headerResult = parseJsonInput(encodeHeaderInput, "Header");
    var payloadResult = parseJsonInput(encodePayloadInput, "Payload");
    var header;
    var payload;
    var signingInput;

    if (!headerResult.ok) {
      setEncodeResult("error", headerResult.error);
      return;
    }

    if (!payloadResult.ok) {
      setEncodeResult("error", payloadResult.error);
      return;
    }

    header = headerResult.value;
    payload = payloadResult.value;
    header.alg = selectedAlg;
    if (!header.typ) {
      header.typ = "JWT";
    }

    encodeHeaderInput.value = JSON.stringify(header, null, 2);
    signingInput = textToBase64Url(JSON.stringify(header)) + "." + textToBase64Url(JSON.stringify(payload));

    if (selectedAlg === "none") {
      setGeneratedToken(signingInput + ".");
      setEncodeResult("warning", "Unsigned token encoded with alg none.");
      return;
    }

    if (encodeSecret.value.trim() === "") {
      setEncodeResult("warning", "Enter a secret or PEM PKCS#8 private key before signing.");
      return;
    }

    if (hmacAlgorithms[selectedAlg]) {
      var secretValidation = validateHmacSecret(encodeSecret.value, selectedAlg);
      if (!secretValidation.ok) {
        setEncodeResult("error", secretValidation.error);
        return;
      }
    }

    if (!crypto.subtle) {
      setEncodeResult("error", "Web Crypto is not available in this browser context.");
      return;
    }

    setEncodeResult("neutral", "Signing token...");

    signToken(signingInput, encodeSecret.value, selectedAlg).then(function (signature) {
      setGeneratedToken(signingInput + "." + signature);
      keyInput.value = encodeSecret.value;
      setEncodeResult("ok", "Token encoded and signed.");
    }).catch(function (error) {
      setEncodeResult("error", "Encode error: " + error.message);
    });
  }

  function updateEncodeHeaderAlgorithm() {
    var headerResult = parseJsonInput(encodeHeaderInput, "Header");
    var header;

    if (!headerResult.ok) {
      return;
    }

    header = headerResult.value;
    header.alg = encodeAlgorithm.value;
    if (!header.typ) {
      header.typ = "JWT";
    }
    encodeHeaderInput.value = JSON.stringify(header, null, 2);
  }

  function initializeEncodedSample() {
    var result = parseJsonInput(encodeHeaderInput, "Header");
    var payloadResult = parseJsonInput(encodePayloadInput, "Payload");
    var signingInput;

    if (!result.ok || !payloadResult.ok) {
      return;
    }

    signingInput = textToBase64Url(JSON.stringify(result.value)) + "." + textToBase64Url(JSON.stringify(payloadResult.value));
    renderGeneratedToken(signingInput + ".");
    setEncodeResult("warning", "Unsigned token encoded with alg none.");
  }

  function showMode(mode) {
    var isEncode = mode === "encode";

    decodeView.hidden = isEncode;
    encodeView.hidden = !isEncode;
    decodeModeBtn.setAttribute("aria-pressed", String(!isEncode));
    encodeModeBtn.setAttribute("aria-pressed", String(isEncode));

    if (isEncode) {
      ToolKit.setStatus(status, "neutral", "Edit header and payload JSON to encode a JWT.");
    } else {
      ToolKit.setStatus(status, "neutral", "Paste a JWT to decode.");
    }
  }

  decodeModeBtn.addEventListener("click", function () {
    showMode("decode");
  });
  encodeModeBtn.addEventListener("click", function () {
    showMode("encode");
  });
  ToolKit.$("decodeBtn").addEventListener("click", decodeToken);
  ToolKit.$("verifyBtn").addEventListener("click", verifySignature);
  ToolKit.$("encodeBtn").addEventListener("click", encodeToken);
  ToolKit.$("clearBtn").addEventListener("click", clearAll);
  ToolKit.$("copyTokenBtn").addEventListener("click", function (event) {
    ToolKit.copyText(tokenInput.value, event.currentTarget, tokenInput);
  });
  ToolKit.$("copyHeaderBtn").addEventListener("click", function (event) {
    ToolKit.copyText(lastHeader, event.currentTarget, headerOutput);
  });
  ToolKit.$("copyPayloadBtn").addEventListener("click", function (event) {
    ToolKit.copyText(lastPayload, event.currentTarget, payloadOutput);
  });
  ToolKit.$("copyGeneratedTokenBtn").addEventListener("click", function (event) {
    ToolKit.copyText(lastGeneratedToken, event.currentTarget, generatedTokenOutput);
  });
  encodeAlgorithm.addEventListener("change", updateEncodeHeaderAlgorithm);
  tokenInput.addEventListener("input", decodeToken);

  initializeEncodedSample();
  decodeToken();
}());
