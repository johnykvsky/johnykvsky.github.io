(function () {
  "use strict";

  var sourceInput = ToolKit.$("sourceInput");
  var formattedOutput = ToolKit.$("formattedOutput");
  var status = ToolKit.$("status");
  var lastOutput = "";

  function parseInput() {
    var value = sourceInput.value;

    if (value.trim() === "") {
      return { ok: false, empty: true, error: "Empty input" };
    }

    try {
      return { ok: true, value: JSON.parse(value) };
    } catch (error) {
      return { ok: false, empty: false, error: error.message };
    }
  }

  function highlightJson(json) {
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

  function renderFormatted(value) {
    lastOutput = JSON.stringify(value, null, 2);
    formattedOutput.innerHTML = highlightJson(lastOutput);
    ToolKit.setStatus(status, "ok", "JSON is valid.");
  }

  function render() {
    var result = parseInput();

    if (result.ok) {
      renderFormatted(result.value);
      return;
    }

    lastOutput = "";
    formattedOutput.textContent = "";

    if (result.empty) {
      ToolKit.setStatus(status, "neutral", "Paste JSON to validate and format.");
    } else {
      ToolKit.setStatus(status, "error", "Invalid JSON: " + result.error);
    }
  }

  function replaceInput(value) {
    sourceInput.value = value;
    render();
  }

  function formatInput() {
    var result = parseInput();

    if (!result.ok) {
      render();
      return;
    }

    replaceInput(JSON.stringify(result.value, null, 2));
  }

  function minifyInput() {
    var result = parseInput();

    if (!result.ok) {
      render();
      return;
    }

    replaceInput(JSON.stringify(result.value));
  }

  function cleanInput() {
    replaceInput(sourceInput.value.replace(/[^\x0A\x0D\x20-\x7E]*/g, ""));
  }

  function copyOutput(button) {
    if (!lastOutput) {
      return;
    }

    ToolKit.copyText(lastOutput, button, formattedOutput);
  }

  function toggleWordWrap(button) {
    var isWrapped = formattedOutput.classList.toggle("wordwrap");

    button.setAttribute("aria-pressed", String(isWrapped));
    button.classList.toggle("primary-button", isWrapped);
  }

  ToolKit.$("formatBtn").addEventListener("click", function () {
    formatInput();
  });

  ToolKit.$("minifyBtn").addEventListener("click", minifyInput);

  ToolKit.$("cleanBtn").addEventListener("click", cleanInput);

  ToolKit.$("wrapBtn").addEventListener("click", function (event) {
    toggleWordWrap(event.currentTarget);
  });

  ToolKit.$("copyOutputBtn").addEventListener("click", function (event) {
    copyOutput(event.currentTarget);
  });

  ToolKit.$("clearInputBtn").addEventListener("click", function () {
    replaceInput("");
  });

  sourceInput.addEventListener("input", render);

  render();
}());
