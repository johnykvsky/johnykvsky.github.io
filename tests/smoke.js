const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const toolPages = ["base64", "json", "json_compare", "jwt", "timestamp", "uuid"];
const encoder = new TextEncoder();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlToBytes(value) {
  return Buffer.from(value, "base64url");
}

function makeElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    hidden: false,
    attributes: {},
    parentElement: {
      nextElementSibling: null
    },
    listeners: {},
    addEventListener(eventName, handler) {
      this.listeners[eventName] = this.listeners[eventName] || [];
      this.listeners[eventName].push(handler);
    },
    dispatch(eventName, event) {
      (this.listeners[eventName] || []).forEach((handler) => {
        handler(Object.assign({ currentTarget: this }, event));
      });
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function makeToolHarness(ids) {
  const elements = {};

  ids.forEach((id) => {
    elements[id] = makeElement();
  });

  const context = {
    TextDecoder,
    TextEncoder,
    atob(value) {
      return Buffer.from(value, "base64").toString("binary");
    },
    btoa(value) {
      return Buffer.from(value, "binary").toString("base64");
    },
    crypto: crypto.webcrypto,
    Date,
    JSON,
    Math,
    Number,
    Object,
    RegExp,
    String,
    Uint8Array,
    console,
    ToolKit: {
      $(id) {
        assert(elements[id], `Missing fake DOM element: ${id}`);
        return elements[id];
      },
      copyText() {},
      escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      },
      formatLocalDate(date) {
        const pad = (part) => String(part).padStart(2, "0");
        return [
          date.getFullYear(),
          "-",
          pad(date.getMonth() + 1),
          "-",
          pad(date.getDate()),
          " ",
          pad(date.getHours()),
          ":",
          pad(date.getMinutes()),
          ":",
          pad(date.getSeconds())
        ].join("");
      },
      isValidDate(date) {
        return date instanceof Date && !Number.isNaN(date.getTime());
      },
      setStatus(element, state, message) {
        element.className = `status ${state}`;
        element.textContent = message;
      }
    }
  };

  context.window = context;
  vm.createContext(context);

  return { context, elements };
}

function loadToolScript(tool, ids) {
  const harness = makeToolHarness(ids);

  new vm.Script(read(`${tool}/js/app.js`), { filename: `${tool}/js/app.js` }).runInContext(harness.context);

  return harness.elements;
}

function checkModernPages() {
  toolPages.forEach((tool) => {
    const html = read(`${tool}/index.html`);

    assert(html.includes("../assets/toolkit/tool.css"), `${tool} must load shared toolkit CSS`);
    assert(html.includes("../assets/toolkit/tool.js"), `${tool} must load shared toolkit JS`);
    assert(html.includes('id="themeToggle"'), `${tool} must include theme toggle`);
    assert(html.includes(">All tools</a>"), `${tool} must link back to all tools`);
    assert(exists(`${tool}/css/style.css`), `${tool} must have local CSS`);
    assert(exists(`${tool}/js/app.js`), `${tool} must use standardized js/app.js`);
  });

  const index = read("index.html");
  toolPages.forEach((tool) => {
    assert(index.includes(`./${tool}/`), `main index must link to ${tool}`);
  });
}

function checkLegacyAssetsRemoved() {
  ["assets/normalize.min.css", "assets/skeleton.min.css", "assets/style.css"].forEach((asset) => {
    assert(!exists(asset), `${asset} should be removed`);
  });

  const modernFiles = [
    "index.html",
    ...toolPages.map((tool) => `${tool}/index.html`)
  ];

  modernFiles.forEach((file) => {
    const html = read(file);

    assert(!html.includes("normalize.min.css"), `${file} must not reference normalize`);
    assert(!html.includes("skeleton.min.css"), `${file} must not reference skeleton`);
  });
}

function checkJavaScriptSyntax() {
  [
    "assets/toolkit/tool.js",
    ...toolPages.map((tool) => `${tool}/js/app.js`)
  ].forEach((file) => {
    new vm.Script(read(file), { filename: file });
  });
}

function checkJwtSamples() {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    null: null,
    boolean: [true, false],
    number: [0, 1.5, 20000, -1234567890],
    strings: {
      firstname: "Jane",
      lastname: "Gray",
      hobbies: ["X-Ray", "Flying", { teams: ["X-Men", "Mutants"] }],
      address: "unknown"
    }
  };
  const token = `${base64UrlJson(header)}.${base64UrlJson(payload)}.`;
  const jwtHtml = read("jwt/index.html");

  assert(jwtHtml.includes(token), "JWT decode page should include sample token");
  assert.deepStrictEqual(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")), payload);
}

function validateHmacSecret(secret, alg) {
  const requiredBits = {
    HS256: 256,
    HS384: 384,
    HS512: 512
  }[alg];
  const actualBits = Buffer.byteLength(secret, "utf8") * 8;

  if (actualBits < requiredBits) {
    return {
      ok: false,
      error: `${alg} requires an HMAC secret of at least ${requiredBits} bits. Current secret is ${actualBits} bits.`
    };
  }

  return { ok: true };
}

function makeSigningInput(alg) {
  const header = { alg, typ: "JWT" };
  const payload = { sub: "smoke-test", scope: ["encode", "verify"] };

  return `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
}

function signHs256(signingInput, secret) {
  return crypto.createHmac("sha256", secret).update(signingInput).digest("base64url");
}

function verifyHs256(token, secret) {
  const parts = token.split(".");
  const expected = signHs256(`${parts[0]}.${parts[1]}`, secret);

  return crypto.timingSafeEqual(base64UrlToBytes(parts[2]), base64UrlToBytes(expected));
}

function pemToArrayBuffer(pem) {
  return Buffer.from(
    pem
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, ""),
    "base64"
  );
}

function arrayBufferToPem(label, buffer) {
  const base64 = Buffer.from(buffer).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];

  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join("\n");
}

async function signAndVerifyWithGeneratedKey(alg, generateParams, privateImportParams, publicImportParams, signParams) {
  const keyPair = await crypto.webcrypto.subtle.generateKey(generateParams, true, ["sign", "verify"]);
  const privatePem = arrayBufferToPem("PRIVATE KEY", await crypto.webcrypto.subtle.exportKey("pkcs8", keyPair.privateKey));
  const publicPem = arrayBufferToPem("PUBLIC KEY", await crypto.webcrypto.subtle.exportKey("spki", keyPair.publicKey));
  const privateKey = await crypto.webcrypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privatePem),
    privateImportParams,
    false,
    ["sign"]
  );
  const publicKey = await crypto.webcrypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicPem),
    publicImportParams,
    false,
    ["verify"]
  );
  const signingInput = makeSigningInput(alg);
  const signature = new Uint8Array(await crypto.webcrypto.subtle.sign(signParams, privateKey, encoder.encode(signingInput)));
  const token = `${signingInput}.${bytesToBase64Url(signature)}`;
  const parts = token.split(".");

  assert.strictEqual(parts.length, 3, `${alg} signed token should have three parts`);
  assert(parts[2].length > 0, `${alg} signed token should include a signature`);
  assert.strictEqual(
    await crypto.webcrypto.subtle.verify(signParams, publicKey, base64UrlToBytes(parts[2]), encoder.encode(signingInput)),
    true,
    `${alg} signature should verify with generated public key`
  );
}

async function checkJwtSigning() {
  const validSecret = "0123456789abcdef0123456789abcdef";
  const invalidSecret = "too-short";
  const signingInput = makeSigningInput("HS256");
  const signature = signHs256(signingInput, validSecret);

  assert.deepStrictEqual(validateHmacSecret(validSecret, "HS256"), { ok: true });
  assert.strictEqual(validateHmacSecret(invalidSecret, "HS256").ok, false, "HS256 should reject secrets under 256 bits");
  assert.strictEqual(
    validateHmacSecret(invalidSecret, "HS256").error,
    "HS256 requires an HMAC secret of at least 256 bits. Current secret is 72 bits."
  );
  assert.strictEqual(verifyHs256(`${signingInput}.${signature}`, validSecret), true, "HS256 signature should verify");

  await signAndVerifyWithGeneratedKey(
    "RS256",
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    "RSASSA-PKCS1-v1_5"
  );

  await signAndVerifyWithGeneratedKey(
    "PS256",
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    { name: "RSA-PSS", hash: "SHA-256" },
    { name: "RSA-PSS", hash: "SHA-256" },
    { name: "RSA-PSS", saltLength: 32 }
  );

  await signAndVerifyWithGeneratedKey(
    "ES256",
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    { name: "ECDSA", namedCurve: "P-256" },
    { name: "ECDSA", namedCurve: "P-256" },
    { name: "ECDSA", hash: "SHA-256" }
  );
}

function checkUuidV7Shape() {
  const now = BigInt(Date.now());
  const bytes = crypto.randomBytes(16);

  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

  assert(/^.{14}7/.test(uuid), "UUID v7 version nibble should be set");
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid), "UUID v7 should validate");
}

function checkBase64Utf8() {
  const text = "hello zażółć";
  const encoded = Buffer.from(text, "utf8").toString("base64");

  assert.strictEqual(Buffer.from(encoded, "base64").toString("utf8"), text);
}

function checkTimestampTimezoneInputs() {
  const elements = loadToolScript("timestamp", [
    "timestampInput",
    "dateInput",
    "status",
    "localResult",
    "utcResult",
    "isoResult",
    "secondsResult",
    "millisecondsResult",
    "timestampBtn",
    "dateBtn",
    "nowBtn",
    "copySecondsBtn",
    "copyLocalBtn",
    "copyLocalResultBtn",
    "copyUtcResultBtn",
    "copyIsoResultBtn",
    "copySecondsResultBtn",
    "copyMillisecondsResultBtn"
  ]);

  [
    ["2024-01-02 03:04:05 +02:30", "2024-01-02T03:04:05+02:30"],
    ["2024-01-02 03:04:05 +0230", "2024-01-02T03:04:05+02:30"],
    ["2024-01-02 03:04:05 Z", "2024-01-02T03:04:05Z"],
    ["2024-01-02T03:04:05Z", "2024-01-02T03:04:05Z"]
  ].forEach(([input, expected]) => {
    const expectedDate = new Date(Date.parse(expected));

    elements.dateInput.value = input;
    elements.dateBtn.dispatch("click");

    assert.strictEqual(elements.status.textContent, "Date converted.", `timezone date should parse: ${input}`);
    assert.strictEqual(elements.isoResult.textContent, expectedDate.toISOString(), `ISO output should match parsed timezone: ${input}`);
    assert.strictEqual(elements.secondsResult.textContent, String(Math.floor(expectedDate.getTime() / 1000)));
  });

  elements.dateInput.value = "2024-01-02 03:04:05 +99:99";
  elements.dateBtn.dispatch("click");

  assert.strictEqual(elements.status.textContent, "Date could not be parsed.");
}

function checkJsonComparePaths() {
  const elements = loadToolScript("json_compare", [
    "leftInput",
    "rightInput",
    "leftStatus",
    "rightStatus",
    "leftOutput",
    "rightOutput",
    "summary",
    "changesList",
    "compareBtn",
    "swapBtn",
    "clearLeftBtn",
    "clearRightBtn",
    "copyLeftBtn",
    "copyRightBtn",
    "copyChangesBtn"
  ]);

  elements.leftInput.value = JSON.stringify({
    id: 1,
    name: "old",
    removeMe: true,
    list: ["same", "gone"],
    nested: { count: 2 }
  });
  elements.rightInput.value = JSON.stringify({
    id: 1,
    name: "new",
    addedRoot: "yes",
    list: ["same", "added"],
    nested: { count: 3, addedNested: false }
  });
  elements.compareBtn.dispatch("click");

  assert.strictEqual(elements.summary.textContent, "Different: 6 changes. 2 added, 1 removed, 3 changed.");
  assert(elements.changesList.innerHTML.includes("$.addedRoot added: &quot;yes&quot;"), "root added path should be reported");
  assert(elements.changesList.innerHTML.includes("$.removeMe removed: true"), "removed path should be reported");
  assert(elements.changesList.innerHTML.includes("$.name changed: &quot;old&quot; -&gt; &quot;new&quot;"), "changed scalar path should be reported");
  assert(elements.changesList.innerHTML.includes("$.list[1] changed: &quot;gone&quot; -&gt; &quot;added&quot;"), "changed array path should be reported");
  assert(elements.changesList.innerHTML.includes("$.nested.addedNested added: false"), "nested added path should be reported");
  assert(elements.changesList.innerHTML.includes("$.nested.count changed: 2 -&gt; 3"), "nested changed path should be reported");
}

function checkBase64InvalidInput() {
  const elements = loadToolScript("base64", [
    "encodedInput",
    "decodedInput",
    "status",
    "copyEncodedBtn",
    "copyDecodedBtn",
    "clearBtn"
  ]);

  elements.encodedInput.value = "not valid base64 !!!";
  elements.encodedInput.dispatch("input");

  assert.strictEqual(elements.decodedInput.value, "", "invalid base64 should clear decoded output");
  assert(elements.status.textContent.startsWith("Decode error:"), "invalid base64 should show a decode error");

  elements.encodedInput.value = "//79";
  elements.encodedInput.dispatch("input");

  assert.strictEqual(elements.decodedInput.value, "", "invalid UTF-8 bytes should clear decoded output");
  assert(elements.status.textContent.startsWith("Decode error:"), "invalid UTF-8 bytes should show a decode error");
}

async function main() {
  checkModernPages();
  checkLegacyAssetsRemoved();
  checkJavaScriptSyntax();
  checkJwtSamples();
  await checkJwtSigning();
  checkUuidV7Shape();
  checkBase64Utf8();
  checkTimestampTimezoneInputs();
  checkJsonComparePaths();
  checkBase64InvalidInput();

  console.log("Smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
