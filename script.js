const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const results = document.getElementById("results");
const qualityInput = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const formatSelect = document.getElementById("format");
const maxSizeSelect = document.getElementById("maxSize");
const clearBtn = document.getElementById("clearBtn");
const hiddenCanvas = document.getElementById("hiddenCanvas");
const ctx = hiddenCanvas.getContext("2d");

qualityInput.addEventListener("input", () => {
  qualityValue.textContent = qualityInput.value;
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
    fileInput.value = "";
  }
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
});

clearBtn.addEventListener("click", () => {
  results.innerHTML =
    '<p class="results-placeholder">Results cleared. Drop new images to compress 👇</p>';
});

/**
 * Main handler for multiple files
 */
function handleFiles(files) {
  const arr = Array.from(files);
  if (!arr.length) return;

  if (results.querySelector(".results-placeholder")) {
    results.innerHTML = "";
  }

  arr.forEach((file) => {
    if (!file.type.startsWith("image/")) {
      showErrorCard(file, "This file is not an image.");
      return;
    }
    processImage(file);
  });
}

/**
 * Create simple error card
 */
function showErrorCard(file, message) {
  const card = document.createElement("div");
  card.className = "result-card";
  card.innerHTML = `
    <div class="result-header">
      <span class="result-name">${file.name}</span>
      <span class="result-format" style="color:#fecaca;border-color:#fecaca;">Error</span>
    </div>
    <p style="margin:4px 0 0;font-size:0.8rem;color:#fca5a5;">${message}</p>
  `;
  results.appendChild(card);
}

/**
 * Process single image file with canvas
 */
function processImage(file) {
  const originalSize = file.size;
  const quality = Number(qualityInput.value) / 100;
  const maxSize = Number(maxSizeSelect.value) || 0;
  const targetMime = getTargetMime(file);
  const reader = new FileReader();

  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = getScaledDimensions(img, maxSize);
      hiddenCanvas.width = width;
      hiddenCanvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      hiddenCanvas.toBlob(
        (blob) => {
          if (!blob) {
            showErrorCard(file, "Failed to compress image.");
            return;
          }
          const compressedSize = blob.size;
          const savings = calcSavings(originalSize, compressedSize);
          const downloadUrl = URL.createObjectURL(blob);
          const originalUrl = URL.createObjectURL(file);
          const card = buildResultCard({
            file,
            originalSize,
            compressedSize,
            savings,
            targetMime,
            originalUrl,
            downloadUrl,
          });
          results.appendChild(card);
        },
        targetMime,
        quality
      );
    };
    img.onerror = () => {
      showErrorCard(file, "Could not read image file.");
    };
    img.src = ev.target.result;
  };

  reader.readAsDataURL(file);
}

/**
 * Decide output MIME type based on user choice
 */
function getTargetMime(file) {
  const selection = formatSelect.value;
  if (selection === "original") {
    return file.type && file.type.startsWith("image/")
      ? file.type
      : "image/jpeg";
  }
  return selection;
}

/**
 * Scale image keeping aspect ratio
 */
function getScaledDimensions(img, maxSize) {
  if (!maxSize || maxSize <= 0) {
    return { width: img.width, height: img.height };
  }
  const longer = Math.max(img.width, img.height);
  if (longer <= maxSize) {
    return { width: img.width, height: img.height };
  }
  const scale = maxSize / longer;
  return {
    width: Math.round(img.width * scale),
    height: Math.round(img.height * scale),
  };
}

/**
 * Calculate percentage savings
 */
function calcSavings(original, compressed) {
  if (!original) return 0;
  const diff = original - compressed;
  return Math.max(0, Math.round((diff / original) * 100));
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value > 100 ? 0 : 2)} ${units[i]}`;
}

/**
 * Build a result card DOM node
 */
function buildResultCard({
  file,
  originalSize,
  compressedSize,
  savings,
  targetMime,
  originalUrl,
  downloadUrl,
}) {
  const ext = mimeToExt(targetMime);
  const outName = buildOutputFileName(file.name, ext);

  const card = document.createElement("div");
  card.className = "result-card";

  const header = document.createElement("div");
  header.className = "result-header";

  const nameEl = document.createElement("span");
  nameEl.className = "result-name";
  nameEl.textContent = file.name;

  const formatEl = document.createElement("span");
  formatEl.className = "result-format";
  formatEl.textContent = ext.toUpperCase();

  header.appendChild(nameEl);
  header.appendChild(formatEl);

  const previewRow = document.createElement("div");
  previewRow.className = "preview-row";

  const beforeBox = document.createElement("div");
  beforeBox.className = "preview-box";
  const beforeImg = document.createElement("img");
  beforeImg.src = originalUrl;
  beforeBox.appendChild(beforeImg);

  const afterBox = document.createElement("div");
  afterBox.className = "preview-box";
  const afterImg = document.createElement("img");
  afterImg.src = downloadUrl;
  afterBox.appendChild(afterImg);

  previewRow.appendChild(beforeBox);
  previewRow.appendChild(afterBox);

  const stats = document.createElement("div");
  stats.className = "result-stats";
  stats.innerHTML = `
    <span>Original: ${formatBytes(originalSize)}</span>
    <span>Compressed: ${formatBytes(compressedSize)}</span>
    <span class="good">Saved: ${savings}%</span>
  `;

  const actions = document.createElement("div");
  actions.className = "result-actions";

  const downloadBtn = document.createElement("a");
  downloadBtn.className = "btn-download";
  downloadBtn.href = downloadUrl;
  downloadBtn.download = outName;
  downloadBtn.textContent = "Download";

  const copyNameBtn = document.createElement("button");
  copyNameBtn.className = "btn-small";
  copyNameBtn.type = "button";
  copyNameBtn.textContent = "Copy name";
  copyNameBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(outName);
      copyNameBtn.textContent = "Copied!";
      setTimeout(() => (copyNameBtn.textContent = "Copy name"), 1200);
    } catch (e) {
      copyNameBtn.textContent = "Clipboard error";
      setTimeout(() => (copyNameBtn.textContent = "Copy name"), 1400);
    }
  });

  actions.appendChild(downloadBtn);
  actions.appendChild(copyNameBtn);

  card.appendChild(header);
  card.appendChild(previewRow);
  card.appendChild(stats);
  card.appendChild(actions);

  return card;
}

/**
 * Map MIME to extension
 */
function mimeToExt(mime) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

/**
 * Build output filename
 */
function buildOutputFileName(originalName, ext) {
  const dotIndex = originalName.lastIndexOf(".");
  const base =
    dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
  return `${base}-compressed.${ext}`;
}
