const API_URL =
  "##YOUR API KEY FROM AWS API GATEWAY###"; /* <-- REPLACE WITH YOUR API URL */

const loadingOverlay = document.getElementById("loadingOverlay");
const errorCard = document.getElementById("errorCard");
const errorMessage = document.getElementById("errorMessage");
const errorRetryBtn = document.getElementById("errorRetryBtn");
const dashboardContent = document.getElementById("dashboardContent");

// Summary card values
const totalSnapshotsEl = document.getElementById("totalSnapshots");
const deletedWasteEl = document.getElementById("deletedWaste");
const activeSnapshotsEl = document.getElementById("activeSnapshots");
const monthlySavingsEl = document.getElementById("monthlySavings");
const yearlySavingsEl = document.getElementById("yearlySavings");

// Status banner elements
const statusBanner = document.getElementById("statusBanner");
const statusIcon = document.getElementById("statusIcon");
const statusTitle = document.getElementById("statusTitle");
const statusMsg = document.getElementById("statusMessage");

// Table elements
const tableBody = document.getElementById("tableBody");
const tableEmpty = document.getElementById("tableEmpty");
const resourceCount = document.getElementById("resourceCount");

// Misc
const refreshBtn = document.getElementById("refreshBtn");
const lastUpdatedEl = document.getElementById("lastUpdated");

// Navigation links (for active state tracking & smooth scrolling)
const navLinks = document.querySelectorAll(".nav-link");

// Chart instances (stored globally so we can destroy & recreate on refresh)
let pieChartInstance = null;
let barChartInstance = null;

function initNavigation() {
  // --- Smooth Scroll on Nav Link Click ---
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const targetId = link.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        const navbarHeight = 80;
        const targetPosition =
          targetSection.getBoundingClientRect().top +
          window.pageYOffset -
          navbarHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });

        setActiveNavLink(link);
      }
    });
  });

  // --- IntersectionObserver: Highlight Active Nav Link on Scroll ---
  const sections = document.querySelectorAll(".section");

  const observerOptions = {
    root: null,
    rootMargin: "-80px 0px -50% 0px",
    threshold: 0,
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        const correspondingLink = document.querySelector(
          `.nav-link[href="#${sectionId}"]`,
        );
        if (correspondingLink) {
          setActiveNavLink(correspondingLink);
        }
      }
    });
  }, observerOptions);

  sections.forEach((section) => sectionObserver.observe(section));

  // --- Navbar Background Intensifies on Scroll ---
  window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (window.scrollY > 50) {
      navbar.style.background = "rgba(10, 14, 23, 0.95)";
      navbar.style.boxShadow = "0 4px 30px rgba(0,0,0,0.3)";
    } else {
      navbar.style.background = "rgba(10, 14, 23, 0.8)";
      navbar.style.boxShadow = "none";
    }
  });
}

function setActiveNavLink(activeLink) {
  navLinks.forEach((l) => l.classList.remove("active"));
  activeLink.classList.add("active");
}

async function fetchDashboardData() {
  // Show loading state, hide other states
  showLoading();

  try {
    console.log("🔄 Fetching data from:", API_URL);

    const response = await fetch(API_URL + "?nocache=" + new Date().getTime());

    // Check for HTTP errors (4xx, 5xx)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get raw text first so we can debug if JSON parsing fails
    const rawText = await response.text();
    console.log("📦 Raw API response:", rawText);

    // Parse the raw text as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      throw new Error(
        `Failed to parse API response as JSON: ${parseErr.message}`,
      );
    }

    console.log("📋 Parsed data object:", data);
    console.log("📋 Type of data.body:", typeof data.body);

    // ---- Extract the actual result from various possible response formats ----
    let result = extractResult(data);
    alert(JSON.stringify(result.summary));
    console.log(result.summary);
    console.log("✅ Extracted result:", result);

    // Extract summary and purged items from parsed result
    const summary = result.summary;
    const purgedItemsDetails = result.purgedItemsDetails || [];

    // Validate that summary exists
    if (!summary) {
      console.error("❌ No summary found in result. Full result:", result);
      throw new Error(
        'API response is missing the "summary" field. Check console for raw data.',
      );
    }

    console.log("📊 Summary:", summary);
    console.log("🗑️ Purged items:", purgedItemsDetails);

    // Render all dashboard sections with the data
    renderSummaryCards(summary);
    renderStatusBanner(purgedItemsDetails);
    renderTable(purgedItemsDetails);
    renderCharts(summary);
    updateLastUpdated();

    // Show dashboard content, hide loading
    showDashboard();
  } catch (error) {
    console.error("❌ Dashboard fetch error:", error);
    showError(error.message);
  }
}

/**
 * extractResult(data)
 *
 * Tries multiple strategies to extract the {summary, purgedItemsDetails}
 * object from the API response, regardless of how it's wrapped.
 *
 * @param {Object} data — The parsed JSON from the API
 * @returns {Object} — { summary: {...}, purgedItemsDetails: [...] }
 */
function extractResult(data) {
  // Strategy 1: data.body is a JSON string (most common Lambda proxy response)
  if (data.body && typeof data.body === "string") {
    console.log("📌 Strategy 1: data.body is a string, parsing it...");
    try {
      const parsed = JSON.parse(data.body);
      if (parsed.summary) return parsed;
      // Maybe body contains another level of nesting
      if (parsed.body) {
        const inner =
          typeof parsed.body === "string"
            ? JSON.parse(parsed.body)
            : parsed.body;
        if (inner.summary) return inner;
      }
    } catch (e) {
      console.warn("⚠️ Strategy 1 failed:", e.message);
    }
  }

  // Strategy 2: data.body is already an object
  if (data.body && typeof data.body === "object" && data.body.summary) {
    console.log("📌 Strategy 2: data.body is an object with summary");
    return data.body;
  }

  // Strategy 3: data itself has summary (direct response, no wrapper)
  if (data.summary) {
    console.log("📌 Strategy 3: data itself has summary");
    return data;
  }

  // Strategy 4: Look for summary anywhere in the response tree
  if (data.body && typeof data.body === "object") {
    console.log("📌 Strategy 4: searching data.body for summary...");
    // Maybe it's nested one more level
    for (const key of Object.keys(data.body)) {
      const val = data.body[key];
      if (val && typeof val === "object" && val.summary) {
        return val;
      }
    }
  }

  // Strategy 5: data has statusCode + body (Lambda format), body might need double-parse
  if (data.statusCode && data.body) {
    console.log("📌 Strategy 5: Lambda proxy format with statusCode");
    let bodyParsed = data.body;
    if (typeof bodyParsed === "string") {
      try {
        bodyParsed = JSON.parse(bodyParsed);
      } catch (e) {}
    }
    if (typeof bodyParsed === "string") {
      try {
        bodyParsed = JSON.parse(bodyParsed);
      } catch (e) {}
    }
    if (bodyParsed && bodyParsed.summary) return bodyParsed;
  }

  // If nothing worked, throw with debug info
  console.error(
    "❌ Could not extract result. Keys in data:",
    Object.keys(data),
  );
  if (data.body)
    console.error(
      "Keys in data.body:",
      typeof data.body === "object"
        ? Object.keys(data.body)
        : "N/A (type: " + typeof data.body + ")",
    );
  throw new Error(
    "Could not find summary in API response. Open browser DevTools (F12 → Console) to see the raw response.",
  );
}

function showLoading() {
  loadingOverlay.style.display = "flex";
  errorCard.style.display = "none";
  dashboardContent.style.display = "none";
}

/** Show the main dashboard content */
function showDashboard() {
  loadingOverlay.style.display = "none";
  errorCard.style.display = "none";
  dashboardContent.style.display = "block";
}

/** Show the error card with a descriptive message */
function showError(message) {
  loadingOverlay.style.display = "none";
  dashboardContent.style.display = "none";
  errorCard.style.display = "block";
  errorMessage.textContent = `Error: ${message}`;
}

function renderSummaryCards(summary) {
  animateValue(totalSnapshotsEl, 0, summary.totalSnapshotsAnalyzed || 0, 800);
  animateValue(deletedWasteEl, 0, summary.deletedWasteCount || 0, 800);
  animateValue(activeSnapshotsEl, 0, summary.remainingActiveCount || 0, 800);
  animateValue(
    monthlySavingsEl,
    0,
    summary.estimatedMonthlySavingsUsd || 0,
    1000,
    true,
  );
  animateValue(
    yearlySavingsEl,
    0,
    summary.estimatedYearlySavingsUsd || 0,
    1000,
    true,
  );
}

function animateValue(element, start, end, duration, isCurrency = false) {
  const startTime = performance.now();
  element.classList.add("counting");

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * easeOut;

    if (isCurrency) {
      element.textContent = `$${current.toFixed(2)}`;
    } else {
      element.textContent = Math.round(current).toLocaleString();
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.classList.remove("counting");
    }
  }

  requestAnimationFrame(update);
}

function renderStatusBanner(purgedItems) {
  statusBanner.classList.remove("status-warning", "status-success");

  if (purgedItems && purgedItems.length > 0) {
    statusBanner.classList.add("status-warning");
    statusIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`;
    statusTitle.textContent = "⚠ Waste Resources Detected & Deleted";
    statusMsg.textContent = `${purgedItems.length} orphaned snapshot(s) were identified and purged to reduce costs.`;
  } else {
    statusBanner.classList.add("status-success");
    statusIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`;
    statusTitle.textContent =
      "✓ Infrastructure Optimized — No Waste Resources Found";
    statusMsg.textContent =
      "All EBS snapshots are actively associated with volumes. No action required.";
  }
}

function renderTable(purgedItems) {
  tableBody.innerHTML = "";

  if (!purgedItems || purgedItems.length === 0) {
    tableEmpty.style.display = "flex";
    resourceCount.textContent = "0 resources";
    return;
  }

  tableEmpty.style.display = "none";
  resourceCount.textContent = `${purgedItems.length} resource${purgedItems.length > 1 ? "s" : ""}`;

  purgedItems.forEach((item, index) => {
    const row = document.createElement("tr");

    row.style.opacity = "0";
    row.style.transform = "translateX(-10px)";
    row.style.transition = `all 0.4s ease ${index * 0.08}s`;

    row.innerHTML = `
      <td>
        <span class="snapshot-id">${item.snapshotId || "N/A"}</span>
      </td>
      <td>${item.sizeGb || 0} GB</td>
      <td>$${(item.monthlyWasteCost || 0).toFixed(2)}</td>
      <td>
        <span class="status-badge badge-deleted">
          <span>●</span> Deleted
        </span>
      </td>
    `;

    tableBody.appendChild(row);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.style.opacity = "1";
        row.style.transform = "translateX(0)";
      });
    });
  });
}

function renderCharts(summary) {
  if (pieChartInstance) pieChartInstance.destroy();
  if (barChartInstance) barChartInstance.destroy();

  Chart.defaults.color = "#94a3b8";
  Chart.defaults.borderColor = "rgba(255,255,255,0.06)";

  // ---- PIE CHART ----
  const pieCtx = document.getElementById("pieChart").getContext("2d");

  pieChartInstance = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: ["Active Snapshots", "Deleted Snapshots"],
      datasets: [
        {
          data:
            [summary.remainingActiveCount || 0, summary.deletedWasteCount] || 0,
          backgroundColor: [
            "rgba(16, 185, 129, 0.8)",
            "rgba(239, 68, 68, 0.8)",
          ],
          borderColor: ["rgba(16, 185, 129, 1)", "rgba(239, 68, 68, 1)"],
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyleWidth: 10,
            font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
          },
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          titleFont: { family: "'Inter', sans-serif", weight: "600" },
          bodyFont: { family: "'Inter', sans-serif" },
          borderColor: "rgba(255, 153, 0, 0.2)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct =
                total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${context.raw} (${pct}%)`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        duration: 1200,
        easing: "easeOutQuart",
      },
    },
  });

  // ---- BAR CHART ----
  const barCtx = document.getElementById("barChart").getContext("2d");

  barChartInstance = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Monthly Savings", "Yearly Savings"],
      datasets: [
        {
          label: "Estimated Savings (USD)",
          data: [
            summary.estimatedMonthlySavingsUsd || 0,
            summary.estimatedYearlySavingsUsd || 0,
          ],
          backgroundColor: [
            createGradient(barCtx, "#ff9900", "#ffb84d"),
            createGradient(barCtx, "#8b5cf6", "#a78bfa"),
          ],
          borderColor: ["#ff9900", "#8b5cf6"],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          titleFont: { family: "'Inter', sans-serif", weight: "600" },
          bodyFont: { family: "'Inter', sans-serif" },
          borderColor: "rgba(255, 153, 0, 0.2)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              return `$${context.raw.toFixed(2)} USD`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: function (value) {
              return "$" + value;
            },
          },
        },
      },
      animation: { duration: 1200, easing: "easeOutQuart" },
    },
  });
}

/** Creates a vertical gradient for bar chart fills */
function createGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

function updateLastUpdated() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  lastUpdatedEl.textContent = `Last updated: ${timeStr}`;
}

refreshBtn.addEventListener("click", () => {
  refreshBtn.classList.add("loading");
  fetchDashboardData().finally(() => {
    setTimeout(() => refreshBtn.classList.remove("loading"), 600);
  });
});

// Error retry button
errorRetryBtn.addEventListener("click", () => {
  fetchDashboardData();
});

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  fetchDashboardData();
});
