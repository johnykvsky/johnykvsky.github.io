(function (global) {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setStatus(element, state, text) {
    element.className = element.className.replace(/\b(neutral|ok|error|changed|warning)\b/g, "").trim();
    element.className = (element.className + " " + state).trim();
    element.textContent = text;
  }

  function selectContents(element) {
    var selection = window.getSelection();
    var range = document.createRange();

    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function flashButton(button, text) {
    var original = button.textContent;

    button.textContent = text;
    window.setTimeout(function () {
      button.textContent = original;
    }, 900);
  }

  function copyText(text, button, fallbackElement) {
    if (!text) {
      return;
    }

    if (!navigator.clipboard) {
      if (fallbackElement) {
        selectContents(fallbackElement);
      }
      if (button) {
        flashButton(button, "Selected");
      }
      return;
    }

    navigator.clipboard.writeText(text).then(function () {
      if (button) {
        flashButton(button, "Copied");
      }
    }).catch(function () {
      if (fallbackElement) {
        selectContents(fallbackElement);
      }
      if (button) {
        flashButton(button, "Selected");
      }
    });
  }

  function zeroPad(value, places) {
    return String(value).padStart(places, "0");
  }

  function formatLocalDate(date) {
    return [
      date.getFullYear(),
      "-",
      zeroPad(date.getMonth() + 1, 2),
      "-",
      zeroPad(date.getDate(), 2),
      " ",
      zeroPad(date.getHours(), 2),
      ":",
      zeroPad(date.getMinutes(), 2),
      ":",
      zeroPad(date.getSeconds(), 2)
    ].join("");
  }

  function isValidDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  function getStoredTheme() {
    try {
      return global.localStorage.getItem("tool-theme");
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      global.localStorage.setItem("tool-theme", theme);
    } catch (error) {
      return;
    }
  }

  function prefersDarkTheme() {
    return global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function getInitialTheme() {
    var storedTheme = getStoredTheme();

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return prefersDarkTheme() ? "dark" : "light";
  }

  function applyTheme(theme, button) {
    document.documentElement.setAttribute("data-theme", theme);

    if (button) {
      button.textContent = theme === "dark" ? "Light" : "Dark";
      button.setAttribute("aria-pressed", String(theme === "dark"));
    }
  }

  function initThemeToggle() {
    var button = $("themeToggle");
    var initialTheme = getInitialTheme();

    applyTheme(initialTheme, button);

    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      var nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";

      applyTheme(nextTheme, button);
      storeTheme(nextTheme);
    });
  }

  global.ToolKit = {
    $: $,
    copyText: copyText,
    escapeHtml: escapeHtml,
    flashButton: flashButton,
    formatLocalDate: formatLocalDate,
    isValidDate: isValidDate,
    initThemeToggle: initThemeToggle,
    selectContents: selectContents,
    setStatus: setStatus,
    zeroPad: zeroPad
  };

  initThemeToggle();
}(window));
