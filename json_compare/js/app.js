(function () {
  "use strict";

  var leftInput = ToolKit.$("leftInput");
  var rightInput = ToolKit.$("rightInput");
  var leftStatus = ToolKit.$("leftStatus");
  var rightStatus = ToolKit.$("rightStatus");
  var leftOutput = ToolKit.$("leftOutput");
  var rightOutput = ToolKit.$("rightOutput");
  var summary = ToolKit.$("summary");
  var changesList = ToolKit.$("changesList");

  var lastRendered = {
    left: "",
    right: "",
    changes: ""
  };

  function parseInput(value) {
    if (value.trim() === "") {
      return { ok: false, empty: true, error: "Empty input" };
    }

    try {
      return { ok: true, value: JSON.parse(value) };
    } catch (error) {
      return { ok: false, empty: false, error: error.message };
    }
  }

  function typeOf(value) {
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return "array";
    }
    return typeof value;
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function sortKeys(value) {
    if (Array.isArray(value)) {
      return value.map(sortKeys);
    }

    if (!isPlainObject(value)) {
      return value;
    }

    return Object.keys(value).sort().reduce(function (sorted, key) {
      sorted[key] = sortKeys(value[key]);
      return sorted;
    }, {});
  }

  function stableStringify(value) {
    return JSON.stringify(sortKeys(value));
  }

  function valuesEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
  }

  function joinPath(base, part) {
    if (typeof part === "number") {
      return base + "[" + part + "]";
    }
    if (base === "$") {
      return "$." + part;
    }
    return base + "." + part;
  }

  function compareValues(left, right, path, changes) {
    var leftType = typeOf(left);
    var rightType = typeOf(right);

    if (leftType !== rightType) {
      changes.push({
        type: "changed",
        path: path,
        before: left,
        after: right
      });
      return;
    }

    if (leftType === "array") {
      compareArrays(left, right, path, changes);
      return;
    }

    if (leftType === "object") {
      compareObjects(left, right, path, changes);
      return;
    }

    if (left !== right) {
      changes.push({
        type: "changed",
        path: path,
        before: left,
        after: right
      });
    }
  }

  function compareArrays(left, right, path, changes) {
    var maxLength = Math.max(left.length, right.length);

    for (var i = 0; i < maxLength; i += 1) {
      var itemPath = joinPath(path, i);

      if (i >= left.length) {
        changes.push({ type: "added", path: itemPath, after: right[i] });
      } else if (i >= right.length) {
        changes.push({ type: "removed", path: itemPath, before: left[i] });
      } else {
        compareValues(left[i], right[i], itemPath, changes);
      }
    }
  }

  function compareObjects(left, right, path, changes) {
    var keys = {};

    Object.keys(left).forEach(function (key) {
      keys[key] = true;
    });
    Object.keys(right).forEach(function (key) {
      keys[key] = true;
    });

    Object.keys(keys).sort().forEach(function (key) {
      var itemPath = joinPath(path, key);
      var leftHasKey = Object.prototype.hasOwnProperty.call(left, key);
      var rightHasKey = Object.prototype.hasOwnProperty.call(right, key);

      if (!leftHasKey) {
        changes.push({ type: "added", path: itemPath, after: right[key] });
      } else if (!rightHasKey) {
        changes.push({ type: "removed", path: itemPath, before: left[key] });
      } else {
        compareValues(left[key], right[key], itemPath, changes);
      }
    });
  }

  function buildPathStatus(changes, side) {
    return changes.reduce(function (status, change) {
      if (side === "left" && change.type === "added") {
        return status;
      }
      if (side === "right" && change.type === "removed") {
        return status;
      }
      status[change.path] = change.type;
      return status;
    }, {});
  }

  function markContainerPaths(status) {
    var expanded = {};

    Object.keys(status).forEach(function (path) {
      expanded[path] = status[path];

      while (path.lastIndexOf(".") > 0 || path.lastIndexOf("[") > 0) {
        var dotIndex = path.lastIndexOf(".");
        var bracketIndex = path.lastIndexOf("[");
        var cutIndex = Math.max(dotIndex, bracketIndex);

        if (cutIndex <= 0) {
          break;
        }

        path = path.slice(0, cutIndex);
        if (!expanded[path]) {
          expanded[path] = "changed";
        }
      }
    });

    return expanded;
  }

  function renderJson(value, status) {
    var formatted = JSON.stringify(value, null, 2);
    var lines = formatted.split("\n");
    var paths = collectLinePaths(value);
    var expandedStatus = markContainerPaths(status);

    return lines.map(function (line, index) {
      var path = paths[index] || "$";
      var state = expandedStatus[path] || "";
      return '<span class="json-line ' + state + '">' + highlightLine(line) + "</span>";
    }).join("");
  }

  function collectLinePaths(value) {
    var paths = [];

    function walk(node, path) {
      var nodeType = typeOf(node);
      paths.push(path);

      if (nodeType === "array") {
        node.forEach(function (item, index) {
          walk(item, joinPath(path, index));
        });
        if (node.length > 0) {
          paths.push(path);
        }
        return;
      }

      if (nodeType === "object") {
        Object.keys(node).forEach(function (key) {
          walk(node[key], joinPath(path, key));
        });
        if (Object.keys(node).length > 0) {
          paths.push(path);
        }
      }
    }

    walk(value, "$");
    return paths;
  }

  function highlightLine(line) {
    var escaped = ToolKit.escapeHtml(line);
    return escaped.replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, function (match, stringPart, colonPart) {
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

  function setSummary(state, text) {
    ToolKit.setStatus(summary, state, text);
  }

  function renderChanges(changes) {
    if (changes.length === 0) {
      changesList.innerHTML = "";
      lastRendered.changes = "";
      return;
    }

    changesList.innerHTML = changes.map(function (change) {
      return [
        "<li>",
        '<span class="badge ' + change.type + '">' + change.type + "</span>",
        '<span class="change-path">' + ToolKit.escapeHtml(formatChange(change)) + "</span>",
        "</li>"
      ].join("");
    }).join("");

    lastRendered.changes = changes.map(formatChange).join("\n");
  }

  function formatChange(change) {
    if (change.type === "added") {
      return change.path + " added: " + JSON.stringify(change.after);
    }
    if (change.type === "removed") {
      return change.path + " removed: " + JSON.stringify(change.before);
    }
    return change.path + " changed: " + JSON.stringify(change.before) + " -> " + JSON.stringify(change.after);
  }

  function countByType(changes, type) {
    return changes.filter(function (change) {
      return change.type === type;
    }).length;
  }

  function render() {
    var left = parseInput(leftInput.value);
    var right = parseInput(rightInput.value);

    leftOutput.innerHTML = "";
    rightOutput.innerHTML = "";
    changesList.innerHTML = "";
    lastRendered.left = "";
    lastRendered.right = "";
    lastRendered.changes = "";

    updateParseStatus(leftStatus, left, "JSON 1");
    updateParseStatus(rightStatus, right, "JSON 2");

    if (!left.ok || !right.ok) {
      if (left.empty && right.empty) {
        setSummary("neutral", "Paste JSON into both panels to compare.");
      } else {
        setSummary("error", "Fix invalid or missing JSON before comparing.");
      }
      return;
    }

    var changes = [];
    compareValues(left.value, right.value, "$", changes);

    var leftStatusByPath = buildPathStatus(changes, "left");
    var rightStatusByPath = buildPathStatus(changes, "right");

    lastRendered.left = JSON.stringify(left.value, null, 2);
    lastRendered.right = JSON.stringify(right.value, null, 2);
    leftOutput.innerHTML = renderJson(left.value, leftStatusByPath);
    rightOutput.innerHTML = renderJson(right.value, rightStatusByPath);
    renderChanges(changes);

    if (changes.length === 0) {
      setSummary("ok", "Equal: both JSON documents have the same structure and values.");
      return;
    }

    setSummary(
      "changed",
      [
        "Different: " + changes.length + " change" + (changes.length === 1 ? "" : "s") + ".",
        countByType(changes, "added") + " added,",
        countByType(changes, "removed") + " removed,",
        countByType(changes, "changed") + " changed."
      ].join(" ")
    );
  }

  function updateParseStatus(element, result, label) {
    if (result.ok) {
      ToolKit.setStatus(element, "ok", label + " is valid.");
    } else if (result.empty) {
      ToolKit.setStatus(element, "neutral", label + " is empty.");
    } else {
      ToolKit.setStatus(element, "error", label + " is invalid: " + result.error);
    }
  }

  function copyText(text, button) {
    if (!text) {
      return;
    }

    ToolKit.copyText(text, button, button.parentElement.nextElementSibling);
  }

  ToolKit.$("compareBtn").addEventListener("click", render);
  ToolKit.$("swapBtn").addEventListener("click", function () {
    var leftValue = leftInput.value;
    leftInput.value = rightInput.value;
    rightInput.value = leftValue;
    render();
  });
  ToolKit.$("clearLeftBtn").addEventListener("click", function () {
    leftInput.value = "";
    render();
  });
  ToolKit.$("clearRightBtn").addEventListener("click", function () {
    rightInput.value = "";
    render();
  });
  ToolKit.$("copyLeftBtn").addEventListener("click", function (event) {
    copyText(lastRendered.left, event.currentTarget);
  });
  ToolKit.$("copyRightBtn").addEventListener("click", function (event) {
    copyText(lastRendered.right, event.currentTarget);
  });
  ToolKit.$("copyChangesBtn").addEventListener("click", function (event) {
    copyText(lastRendered.changes, event.currentTarget);
  });

  leftInput.addEventListener("input", render);
  rightInput.addEventListener("input", render);

  render();
}());
