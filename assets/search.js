(function () {
  "use strict";

  var searchData = [];
  var input = document.getElementById("site-search");
  var results = document.getElementById("search-results");
  if (!input || !results) return;

  var activeIndex = -1;
  var visible = false;

  // Load search index on first focus
  var loaded = false;
  input.addEventListener("focus", function () {
    if (loaded) return;
    loaded = true;
    fetch("/api/search.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        searchData = data;
      });
  });

  function normalize(str) {
    return (str || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
  }

  function search(query) {
    var q = normalize(query).trim();
    if (!q) return [];
    var words = q.split(/\s+/);
    var scored = [];

    searchData.forEach(function (item) {
      /* keywords carry the chip names inside a device; type lets a query say
         "device" or "chip" to filter by kind. Neither is displayed. */
      var haystack = normalize(
        item.name +
          " " +
          item.detail +
          " " +
          item.id +
          " " +
          (item.keywords || "") +
          " " +
          item.type,
      );
      var allMatch = words.every(function (w) {
        return haystack.indexOf(w) !== -1;
      });
      if (!allMatch) return;

      // Score: exact name start > name contains > detail contains
      var score = 0;
      var nameLower = normalize(item.name);
      if (nameLower.indexOf(q) === 0) score = 3;
      else if (nameLower.indexOf(q) !== -1) score = 2;
      else score = 1;

      // Boost chips over devices for tiebreaking
      if (item.type === "chip") score += 0.1;

      scored.push({ item: item, score: score });
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, 10).map(function (s) {
      return s.item;
    });
  }

  function render(items) {
    if (items.length === 0) {
      hide();
      return;
    }
    activeIndex = -1;
    var html = "";
    items.forEach(function (item, i) {
      var icon =
        item.type === "chip" ? "⚙" : item.type === "page" ? "📄" : "💻";
      html +=
        '<a href="' +
        item.url +
        '" class="search-result" data-index="' +
        i +
        '">' +
        '<span class="search-result-icon">' +
        icon +
        "</span>" +
        '<span class="search-result-text">' +
        '<span class="search-result-name">' +
        escapeHtml(item.name) +
        "</span>" +
        '<span class="search-result-detail">' +
        escapeHtml(item.detail) +
        "</span>" +
        "</span>" +
        "</a>";
    });
    results.innerHTML = html;
    results.style.display = "block";
    visible = true;
  }

  function hide() {
    results.style.display = "none";
    results.innerHTML = "";
    visible = false;
    activeIndex = -1;
  }

  function escapeHtml(str) {
    var el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function setActive(idx) {
    var items = results.querySelectorAll(".search-result");
    items.forEach(function (el) {
      el.classList.remove("search-result--active");
    });
    if (idx >= 0 && idx < items.length) {
      items[idx].classList.add("search-result--active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
    activeIndex = idx;
  }

  input.addEventListener("input", function () {
    var items = search(input.value);
    render(items);
  });

  input.addEventListener("keydown", function (e) {
    if (!visible) return;
    var items = results.querySelectorAll(".search-result");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex].click();
    } else if (e.key === "Escape") {
      hide();
      input.blur();
    }
  });

  // Close on click outside
  document.addEventListener("click", function (e) {
    if (!results.contains(e.target) && e.target !== input) {
      hide();
    }
  });

  // Global keyboard shortcut: / to focus search
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "/" &&
      !e.ctrlKey &&
      !e.metaKey &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "SELECT"
    ) {
      e.preventDefault();
      input.focus();
    }
  });
})();
