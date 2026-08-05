(function () {
  "use strict";

  var timestampInput = ToolKit.$("timestampInput");
  var dateInput = ToolKit.$("dateInput");
  var status = ToolKit.$("status");
  var localResult = ToolKit.$("localResult");
  var utcResult = ToolKit.$("utcResult");
  var isoResult = ToolKit.$("isoResult");
  var secondsResult = ToolKit.$("secondsResult");
  var millisecondsResult = ToolKit.$("millisecondsResult");

  function parseTimestamp(value) {
    var trimmed = value.trim();
    var numberValue;

    if (trimmed === "") {
      return { ok: false, empty: true, error: "Timestamp is empty." };
    }

    if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return { ok: false, empty: false, error: "Timestamp must be numeric." };
    }

    numberValue = Number(trimmed);
    if (!Number.isFinite(numberValue)) {
      return { ok: false, empty: false, error: "Timestamp is outside the supported range." };
    }

    if (Math.abs(numberValue) < 100000000000) {
      numberValue *= 1000;
    }

    return { ok: true, date: new Date(numberValue) };
  }

  function parseDateInput(value) {
    var trimmed = value.trim();
    var normalized;
    var timestamp;

    if (trimmed === "") {
      return { ok: false, empty: true, error: "Date is empty." };
    }

    normalized = normalizeDateInput(trimmed);
    timestamp = Date.parse(normalized);

    if (Number.isNaN(timestamp)) {
      return { ok: false, empty: false, error: "Date could not be parsed." };
    }

    return { ok: true, date: new Date(timestamp) };
  }

  function normalizeDateInput(value) {
    var dateTimeWithZone = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)(?:\s*)(Z|[+-]\d{2}:?\d{2})$/i;
    var localDateTime = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)$/;

    if (dateTimeWithZone.test(value)) {
      return value.replace(dateTimeWithZone, function (match, datePart, timePart, zonePart) {
        return datePart + "T" + timePart + normalizeTimezone(zonePart);
      });
    }

    return value.replace(localDateTime, "$1T$2");
  }

  function normalizeTimezone(value) {
    if (value.toUpperCase() === "Z" || value.indexOf(":") !== -1) {
      return value.toUpperCase();
    }

    return value.slice(0, 3) + ":" + value.slice(3);
  }

  function setResult(element, value) {
    element.textContent = value;
  }

  function renderDate(date, message) {
    if (!ToolKit.isValidDate(date)) {
      clearResults();
      ToolKit.setStatus(status, "error", "Date is outside the supported range.");
      return;
    }

    setResult(localResult, ToolKit.formatLocalDate(date));
    setResult(utcResult, date.toUTCString());
    setResult(isoResult, date.toISOString());
    setResult(secondsResult, String(Math.floor(date.getTime() / 1000)));
    setResult(millisecondsResult, String(date.getTime()));
    ToolKit.setStatus(status, "ok", message);
  }

  function clearResults() {
    [localResult, utcResult, isoResult, secondsResult, millisecondsResult].forEach(function (element) {
      setResult(element, "-");
    });
  }

  function convertTimestamp() {
    var result = parseTimestamp(timestampInput.value);

    if (!result.ok) {
      clearResults();
      ToolKit.setStatus(status, result.empty ? "neutral" : "error", result.error);
      return;
    }

    dateInput.value = ToolKit.formatLocalDate(result.date);
    renderDate(result.date, "Timestamp converted.");
  }

  function convertDate() {
    var result = parseDateInput(dateInput.value);

    if (!result.ok) {
      clearResults();
      ToolKit.setStatus(status, result.empty ? "neutral" : "error", result.error);
      return;
    }

    timestampInput.value = String(Math.floor(result.date.getTime() / 1000));
    renderDate(result.date, "Date converted.");
  }

  function setNow() {
    var now = new Date();

    timestampInput.value = String(Math.floor(now.getTime() / 1000));
    dateInput.value = ToolKit.formatLocalDate(now);
    renderDate(now, "Current time loaded.");
  }

  function copyValue(element, button) {
    if (element.textContent === "-") {
      return;
    }
    ToolKit.copyText(element.textContent, button, element);
  }

  ToolKit.$("timestampBtn").addEventListener("click", convertTimestamp);
  ToolKit.$("dateBtn").addEventListener("click", convertDate);
  ToolKit.$("nowBtn").addEventListener("click", setNow);
  ToolKit.$("copySecondsBtn").addEventListener("click", function (event) {
    copyValue(secondsResult, event.currentTarget);
  });
  ToolKit.$("copyLocalBtn").addEventListener("click", function (event) {
    copyValue(localResult, event.currentTarget);
  });
  ToolKit.$("copyLocalResultBtn").addEventListener("click", function (event) {
    copyValue(localResult, event.currentTarget);
  });
  ToolKit.$("copyUtcResultBtn").addEventListener("click", function (event) {
    copyValue(utcResult, event.currentTarget);
  });
  ToolKit.$("copyIsoResultBtn").addEventListener("click", function (event) {
    copyValue(isoResult, event.currentTarget);
  });
  ToolKit.$("copySecondsResultBtn").addEventListener("click", function (event) {
    copyValue(secondsResult, event.currentTarget);
  });
  ToolKit.$("copyMillisecondsResultBtn").addEventListener("click", function (event) {
    copyValue(millisecondsResult, event.currentTarget);
  });

  timestampInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      convertTimestamp();
    }
  });
  dateInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      convertDate();
    }
  });

  setNow();
}());
