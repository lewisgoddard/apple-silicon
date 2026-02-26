(function () {
  "use strict";

  let allChips = [];
  const picker = document.getElementById("chip-picker");
  const addBtn = document.getElementById("chip-add");
  const tableArea = document.getElementById("compare-output");
  const pillsArea = document.getElementById("compare-pills");

  function getSelectedIds() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("chips");
    return raw ? raw.split(",").filter(Boolean) : [];
  }

  function setSelectedIds(ids) {
    const params = new URLSearchParams(window.location.search);
    if (ids.length) {
      params.set("chips", ids.join(","));
    } else {
      params.delete("chips");
    }
    const qs = params.toString();
    const url = window.location.pathname + (qs ? "?" + qs : "");
    window.history.replaceState(null, "", url);
  }

  function chipById(id) {
    return allChips.find(function (c) {
      return c.id === id;
    });
  }

  function formatValue(v) {
    if (v === true) return "✓";
    if (v === false) return "✗";
    if (Array.isArray(v)) return v.join(", ");
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function renderPills(ids) {
    pillsArea.innerHTML = "";
    ids.forEach(function (id) {
      var chip = chipById(id);
      if (!chip) return;
      var pill = document.createElement("span");
      pill.className = "compare-pill";
      pill.innerHTML =
        '<span class="compare-pill-label">' +
        chip.name +
        " " +
        chip.cpu +
        "c/" +
        chip.gpu +
        'c</span><button class="compare-pill-remove" data-id="' +
        id +
        '" title="Remove">&times;</button>';
      pillsArea.appendChild(pill);
    });
    // Attach remove handlers
    pillsArea.querySelectorAll(".compare-pill-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeChip(btn.dataset.id);
      });
    });
  }

  function renderTable(ids) {
    var chips = ids.map(chipById).filter(Boolean);
    if (chips.length === 0) {
      tableArea.innerHTML =
        '<p class="compare-empty">Select chips above to compare them side by side.</p>';
      return;
    }

    var ref = chips[0].groupedSpecs;
    var html =
      '<div class="compare-table-wrapper"><table class="compare-table">';
    html += "<thead><tr><th>Spec</th>";
    chips.forEach(function (c) {
      html +=
        "<th>" +
        c.name +
        " " +
        c.cpu +
        "c&nbsp;CPU&nbsp;/&nbsp;" +
        c.gpu +
        "c&nbsp;GPU</th>";
    });
    html += "</tr></thead><tbody>";

    ref.forEach(function (group, gi) {
      html +=
        '<tr class="group-header"><td colspan="' +
        (chips.length + 1) +
        '"><strong>' +
        group.name +
        "</strong></td></tr>";
      group.fields.forEach(function (field, fi) {
        html += "<tr><td>" + field.label + "</td>";
        chips.forEach(function (c) {
          var g = c.groupedSpecs[gi];
          var f = g && g.fields[fi];
          html += "<td>" + (f ? formatValue(f.value) : "") + "</td>";
        });
        html += "</tr>";
      });
    });

    html += "</tbody></table></div>";
    tableArea.innerHTML = html;
  }

  function update() {
    var ids = getSelectedIds();
    renderPills(ids);
    renderTable(ids);
    // Update picker to not show already-selected
    updatePickerOptions(ids);
  }

  function updatePickerOptions(selectedIds) {
    picker.innerHTML = '<option value="">Add a chip…</option>';
    allChips.forEach(function (chip) {
      if (selectedIds.indexOf(chip.id) !== -1) return;
      var opt = document.createElement("option");
      opt.value = chip.id;
      opt.textContent =
        chip.name + " (" + chip.cpu + "-core CPU / " + chip.gpu + "-core GPU)";
      picker.appendChild(opt);
    });
  }

  function addChip(id) {
    if (!id) return;
    var ids = getSelectedIds();
    if (ids.indexOf(id) === -1) {
      ids.push(id);
    }
    setSelectedIds(ids);
    update();
  }

  function removeChip(id) {
    var ids = getSelectedIds().filter(function (i) {
      return i !== id;
    });
    setSelectedIds(ids);
    update();
  }

  addBtn.addEventListener("click", function () {
    addChip(picker.value);
    picker.value = "";
  });

  picker.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addChip(picker.value);
      picker.value = "";
    }
  });

  // Load chip data and initialise
  fetch("/api/chips.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      allChips = data;
      update();
    })
    .catch(function (err) {
      console.error("Failed to load chip data:", err);
      tableArea.innerHTML =
        "<p>Error loading chip data. Please try refreshing.</p>";
    });
})();
