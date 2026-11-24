"use strict";

const STORAGE_KEY = "sienna_mfs_results_v1";
const indicators = [
  {
    key: "halalFood",
    name: "Akses makanan halal",
    weight: 30
  },
  {
    key: "prayer",
    name: "Fasilitas ibadah",
    weight: 25
  },
  {
    key: "comfort",
    name: "Kenyamanan & privasi",
    weight: 15
  },
  {
    key: "cleanliness",
    name: "Kebersihan",
    weight: 10
  },
  {
    key: "safety",
    name: "Keamanan",
    weight: 10
  },
  {
    key: "accessibility",
    name: "Aksesibilitas",
    weight: 10
  }
];
const levels = [
  "0 — Tidak tersedia",
  "1 — Sangat terbatas",
  "2 — Tersedia dengan keterbatasan",
  "3 — Memadai",
  "4 — Sangat memadai"
];
function byId(id) {
  return document.getElementById(id);
}
let records = [];
function makeForm() {
  const container = byId("criteria");
  container.replaceChildren();
  indicators.forEach((item) => {
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.htmlFor = "score_" + item.key;
    label.textContent =
      `${item.name} (Bobot ${item.weight}%)`;
    const select = document.createElement("select");
    select.id = "score_" + item.key;
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "— Belum dinilai —";
    select.appendChild(emptyOption);
    levels.forEach((level, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = level;
      select.appendChild(option);
    });
    select.addEventListener("change", calculate);
    field.appendChild(label);
    field.appendChild(select);
    container.appendChild(field);
  });
}
function calculate() {
  let total = 0;
  let complete = true;
  const values = {};
  const parts = [];
  indicators.forEach((item) => {
    const raw = byId("score_" + item.key).value;
    if (raw === "") {
      complete = false;
      values[item.key] = null;
      parts.push({
        item: item,
        value: null,
        contribution: null
      });
      return;
    }
    const value = Number(raw);
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 4
    ) {
      complete = false;
      values[item.key] = null;
      parts.push({
        item: item,
        value: null,
        contribution: null
      });
      return;
    }
    const contribution =
      item.weight * (value / 4);
    total += contribution;
    values[item.key] = value;
    parts.push({
      item: item,
      value: value,
      contribution: contribution
    });
  });
  if (complete) {
    byId("score").innerHTML =
      `${total.toFixed(2).replace(".", ",")}
       <sub>/ 100</sub>`;
    byId("bar").style.width = total + "%";
    byId("hint").textContent =
      "Skor berhasil dihitung. " +
      "Isi nama destinasi untuk menyimpan hasil.";
  } else {
    byId("score").innerHTML =
      "— <sub>/ 100</sub>";
    byId("bar").style.width = "0%";
    const missing = parts.filter(
      (part) => part.value === null
    ).length;
    byId("hint").textContent =
      `Masih ada ${missing} indikator yang belum dinilai.`;
  }
  const breakdown = byId("breakdown");
  breakdown.replaceChildren();
  parts.forEach((part) => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    const tdScore = document.createElement("td");
    tdName.textContent = part.item.name;
    if (part.contribution === null) {
      tdScore.textContent = "Belum dinilai";
    } else {
      tdScore.textContent =
        part.contribution
          .toFixed(2)
          .replace(".", ",") + " poin";
    }
    tr.appendChild(tdName);
    tr.appendChild(tdScore);
    breakdown.appendChild(tr);
  });
  if (!complete) {
    return null;
  }
  return {
    score: Math.round(total * 100) / 100,
    values: values
  };
}
function showStatus(
    message,
    isError = false,
) {
  const status = byId("status");
  status.textContent = message;
  status.style.color = isError
    ? "#B54848"
    : "#204E40";
}
function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
        "Gagal membaca data:",
         error,
        );
    return [];
  }
}
function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    );
    return true;
  } catch (error) {
    console.error(
        "Gagal menyimpan data:",
         error,
        );
    return false;
  }
}
function save() {
  const id = byId("id").value.trim();
  const name = byId("nama").value.trim();
  const source = byId("source").value.trim();
  if (!name) {
    showStatus(
      "Nama destinasi wajib diisi.",
      true
    );
    byId("nama").focus();
    return;
  }
  if (
    id &&
    records.some(
        (record) => record.id === id)
  ) {
    showStatus(
      "ID destinasi sudah digunakan.",
      true
    );
    return;
  }
  const result = calculate();
  if (!result) {
    showStatus(
      "Lengkapi keenam indikator terlebih dahulu.",
      true
    );
    return;
  }
  const entry = {
    id: id,
    name: name,
    values: result.values,
    score: result.score,
    source: source,
    recordedAt: new Date().toISOString()
  };
  records.push(entry);
  const saved = persist();
  render();
  resetForm(false);
  if (saved) {
    showStatus(
      `Penilaian "${name}" berhasil disimpan.`
    );
  } else {
    showStatus(
      "Penilaian masuk ke tabel, tetapi gagal " +
      "disimpan permanen di browser. " +
      "Segera ekspor CSV.",
      true
    );
  }
}
function render() {
  const tbody = byId("rows");
  tbody.replaceChildren();
  if (records.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent =
      "Belum ada destinasi yang dinilai.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  const items = records.map(
    (record, index) => ({
        record: record,
        index: index,
  })).reverse();
  items.forEach(({ record, index }) => {
    const tr = document.createElement("tr");
    const tdId = document.createElement("td");
    const tdName = document.createElement("td");
    const tdScore = document.createElement("td");
    const tdDate = document.createElement("td");
    const tdAction = document.createElement("td");
    tdId.textContent = record.id || "-";
    tdName.textContent = record.name;
    tdScore.textContent =
      Number(record.score)
        .toFixed(2)
        .replace(".", ",");
    tdDate.textContent =
      new Date(record.recordedAt)
        .toLocaleString("id-ID");
    const deleteButton =
      document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener(
        "click",
        () => {deleteRecord(index);
    });
    tdAction.appendChild(deleteButton);
    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdScore);
    tr.appendChild(tdDate);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}
function deleteRecord(index) {
  const record = records[index];
  if (!record) {
    return;
  }
  const confirmed = confirm(
    `Hapus penilaian "${record.name}"?`
  );
  if (!confirmed) {
    return;
  }
  records.splice(index, 1);
  persist();
  render();
  showStatus("Data destinasi berhasil dihapus.");
}
function clearAll() {
  if (records.length === 0) {
    showStatus("Belum ada data untuk dihapus.");
    return;
  }
  const confirmed = confirm(
    "Yakin ingin menghapus seluruh hasil penilaian?"
  );
  if (!confirmed) {
    return;
  }
  records = [];
  persist();
  render();
  showStatus("Seluruh hasil penilaian dihapus.");
}
function resetForm(showMessage = true) {
  byId("id").value = "";
  byId("nama").value = "";
  byId("source").value = "";
  indicators.forEach((item) => {
    byId("score_" + item.key).value = "";
  });
  calculate();
  if (showMessage) {
    showStatus(
      "Form dikosongkan. Siap menilai destinasi baru."
    );
  }
}
function csvCell(value) {
  let text = value === null || value === undefined
    ? ""
    : String(value);
  if (/^\s*[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  text = text.replace(/"/g, '""');
  return `"${text}"`;
}
function exportCsv() {
  if (records.length === 0) {
    showStatus(
      "Belum ada data yang dapat diekspor.",
      true
    );
    return;
  }
  const headers = [
    "destination_id",
    "name",
    "halal_food",
    "prayer_facilities",
    "comfort_privacy",
    "cleanliness",
    "safety",
    "accessibility",
    "mfs_score",
    "source_notes",
    "recorded_at"
  ];
  const rows = records.map(
    (record) => {
    const v = record.values;
    return [
      record.id,
      record.name,
      v.halalFood,
      v.prayer,
      v.comfort,
      v.cleanliness,
      v.safety,
      v.accessibility,
      record.score,
      record.source,
      record.recordedAt
    ];
  });
  const csvContent = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      row.map(csvCell).join(",")
    )
  ].join("\r\n");
  const blob = new Blob(
    ["\uFEFF" + csvContent],
    {
      type: "text/csv;charset=utf-8;"
    }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "SIENNA_MFS_Results.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  showStatus(
    "File CSV berhasil dibuat."
  );
}
document.addEventListener(
  "DOMContentLoaded",
  () => {
    makeForm();
    records = loadRecords();
    render();
    calculate();
    byId("save").addEventListener(
      "click",
      save
    );
    byId("reset").addEventListener(
      "click",
      () => resetForm()
    );
    byId("export").addEventListener(
      "click",
      exportCsv
    );
    byId("clear").addEventListener(
      "click",
      clearAll
    );
  }
);