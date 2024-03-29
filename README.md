# Various DevTools

#### Online JSON parser, formatter, validator
#### Online Javascript UUID v4 generator
#### Online Javascript Epoch / Timestamp converter

Yet, another online JSON parser, formatter and validator. Pure Javascript. Quite simple and straightforward: type or paste JSON on the left, see user friendly version on the righ, check any errors at the top.
Pure Javascript UUID v4 generator
Pure Javascript Epoch / Timestamp to (and from) human readable date converter

## Features

Common:
- Pure javascript, fast, easy
- No data is send to server. Parsing/formatting/validation is in browser, client-side. Safety first! ;)
- Very simple. No fancy menus, multiple options and so on. Just click/paste and check results.
- Very light, no heavy js libraries (jQuery...) or css frameworks (Bootstrap...). Clean HTML, CSS and pure JavaScript.

JSON Parser / Litner / Formatter:
- **JSON can be pasted in multiple lines** (good for copy/paste, ie. from logs opened in nano).
- Optional one-click result word wrap
- Optional one-click result selecting (for copy/paste)
- Optional one-click to remove all non ASCII characters from input (witch may cause linter to fail at json parse)

JSON Compare
- Simple compare of 2 JSON strings, with use of parser/linter/formatter
- Option to switch output windows to easily spot the differences

Timestamp:
- Local time and GMT supported

UUID v4:
- Just click a button or refresh page to generate a new UUID v4
- Easy way to copy to clipboard
- Secure and realiable, using Crypto.getRandomValues API instead of Math.random (witch cause collisions)

Non minified Skeleton css classes can be found [here][link-jkskeletoncss] 

## Demo

Here you go: [https://johnykvsky.github.io][link-demo]

## Credits

- [johnykvsky][link-author]
- [Olivier Cuenot][link-ocuenot] for excellent online json parser
- [Zachary Carter][link-zcarter] for javascript json linter
- [Andrew Zakordonets][link-azakordonets] for syntax highlighter
- [Dave Gamache][link-dgamache] for Skeleton
- [atomicpages][link-atomicpages] for Skeleton updates
- [javascriptkit][link-javascriptkit] for selectElementText
- [mindplay-dk][link-mindplay-dk ] for UUID implementation

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

[link-author]: https://github.com/johnykvsky
[link-ocuenot]: http://json.parser.online.fr
[link-zcarter]: http://github.com/zaach/jsonlint
[link-azakordonets]: http://biercoff.com/pretty-printing-of-json-in-javascript/
[link-dgamache]: https://github.com/dhg/Skeleton
[link-atomicpages]: http://atomicpages.github.io/skeleton-sass
[link-javascriptkit]: http://www.javascriptkit.com/javatutors/copytoclipboard.shtml
[link-demo]: https://johnykvsky.github.io
[link-jkskeletoncss]: https://github.com/johnykvsky/SkeletonCss
[link-mindplay-dk ]: https://github.com/johnykvsky/SkeletonCss

