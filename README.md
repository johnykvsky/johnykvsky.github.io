# Johny Kvsky DevTools

Small browser-based developer tools for common data formats and identifiers.

Demo: [https://johnykvsky.github.io][link-demo]

## Tools

- **JSON Formatter**: validate, format, minify, clean non-ASCII characters, toggle output word wrap, and copy formatted output.
- **JSON Compare**: validate and compare two JSON documents with formatted output, highlighted differences, and a change list.
- **Base64 Encoder / Decoder**: encode and decode Base64 strings locally, including UTF-8 text.
- **JWT Encoder / Decoder**: decode JWT header and payload, inspect registered claims and time status, verify signatures, and encode/sign tokens.
- **UUID Generator**: generate secure UUID v4 and UUID v7 values, validate UUID v1-8 strings, and inspect timestamp details for time-based UUIDs.
- **Timestamp Converter**: convert Unix timestamps to dates and dates to Unix timestamps, including timezone-aware date inputs.
- **Texas Hold'em Poker Chances & Equity Calculator**: Cryptographically secure Texas Hold'em poker odds and equity calculator

## Design Goals

- Pure vanilla JavaScript.
- Browser-only processing; input data is not sent to a server.
- Lightweight CSS with responsive layouts for desktop and mobile.
- No jQuery, Bootstrap, or heavy frontend framework.
- Shared UI toolkit for common layout, status, copy, and dark/light theme behavior.

## JWT Support

JWT decoding works for standard three-part JWT tokens.

Signature verification supports:

- HMAC secrets: `HS256`, `HS384`, `HS512`
- PEM public keys: `RS256`, `RS384`, `RS512`, `PS256`, `PS384`, `PS512`, `ES256`, `ES384`, `ES512`

Token encoding/signing supports:

- Unsigned tokens: `none`
- HMAC secrets: `HS256`, `HS384`, `HS512`
- PEM PKCS#8 private keys: `RS256`, `RS384`, `RS512`, `PS256`, `PS384`, `PS512`, `ES256`, `ES384`, `ES512`

HMAC signing key length is validated before encode according to RFC 7518 minimums.

## Local Checks

Run the smoke checks:

```sh
node tests/smoke.js
```

The smoke test checks current tool pages, shared assets, script syntax, sample JWT decoding, UUID v7 shape, and UTF-8 Base64 behavior.

## License

The MIT License (MIT). See [LICENSE.md](LICENSE.md).

[link-demo]: https://johnykvsky.github.io
