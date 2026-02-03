// --- CONFIGURATION ---
const REGION = "A"; // Enter your region letter here
const PRODUCT_CODE = "AGILE-24-10-01"; // Enter your product code here
// ---------------------

const TARIFF_CODE = `E-1R-${PRODUCT_CODE}-${REGION}`;
const API_URL = `https://api.octopus.energy/v1/products/${PRODUCT_CODE}/electricity-tariffs/${TARIFF_CODE}/standard-unit-rates/`;

async function getPrices() {
  try {
    // Add cache busting query param
    let req = new Request(API_URL + "?t=" + Date.now());
    let res = await req.loadJSON();
    return res.results;
  } catch (e) { return null; }
}

const formatPrice = (val) => val.toFixed(2) + "p";
const getPriceColor = (val) => {
  if (val <= 0) return Color.blue();
  if (val < 15) return Color.green();
  if (val < 25) return Color.orange();
  return Color.red();
};
const formatTime = (dateStr) => {
  let d = new Date(dateStr);
  return d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
};

// Initialize Widget
let widget = new ListWidget();
widget.backgroundColor = new Color("#180048");

let now = new Date();
let prices = await getPrices();

if (!prices) {
  widget.addText("Error Loading Data");
} else {
  // --- DATA PROCESSING ---
  let currentSlot = prices.find(p => new Date(p.valid_from) <= now && new Date(p.valid_to) > now);
  let nextSlot = prices.find(p => currentSlot && p.valid_from === currentSlot.valid_to);

  let todayStr = now.toISOString().split('T')[0];
  let todayPrices = prices.filter(p => p.valid_from.startsWith(todayStr));
  if (todayPrices.length === 0) todayPrices = prices.slice(0, 48);

  // Ensure we sort by time for the graph
  todayPrices.sort((a, b) => new Date(a.valid_from) - new Date(b.valid_from));

  let maxPrice = Math.max(...todayPrices.map(p => p.value_inc_vat));
  let minPrice = Math.min(...todayPrices.map(p => p.value_inc_vat));
  let avgPrice = todayPrices.reduce((a, b) => a + b.value_inc_vat, 0) / todayPrices.length;

  let peakSlot = todayPrices.find(p => p.value_inc_vat === maxPrice);
  let lowSlot = todayPrices.find(p => p.value_inc_vat === minPrice);

  // Widget Family Handling
  const family = config.widgetFamily || "medium";

  if (family === "small") {
    renderSmallWidget(widget, currentSlot, nextSlot, now);
  } else if (family === "medium") {
    renderMediumWidget(widget, currentSlot, nextSlot, minPrice, maxPrice, avgPrice, lowSlot, peakSlot);
  } else if (family === "large") {
    renderLargeWidget(widget, currentSlot, nextSlot, minPrice, maxPrice, avgPrice, lowSlot, peakSlot, todayPrices, now);
  } else {
    // Default to medium for other sizes or unknown
    renderMediumWidget(widget, currentSlot, nextSlot, minPrice, maxPrice, avgPrice, lowSlot, peakSlot);
  }
}

// --- RENDER FUNCTIONS ---

function renderSmallWidget(widget, currentSlot, nextSlot, now) {
  // Closer to left boundary
  widget.setPadding(12, -32, 6, 6);

  let mainStack = widget.addStack();
  mainStack.layoutVertically();
  mainStack.topAlignContent();

  // Current Price
  let title = mainStack.addText("OCTOPUS AGILE");
  title.font = Font.boldSystemFont(10);
  title.textColor = Color.white();
  title.textOpacity = 0.7;

  mainStack.addSpacer(4);

  let curVal = currentSlot ? currentSlot.value_inc_vat : 0;
  let curText = mainStack.addText(formatPrice(curVal));
  curText.font = Font.boldSystemFont(28);
  curText.textColor = getPriceColor(curVal);

  mainStack.addSpacer(2);

  let curLabel = mainStack.addText("Current");
  curLabel.font = Font.systemFont(10);
  curLabel.textColor = Color.white();
  curLabel.textOpacity = 0.8;

  mainStack.addSpacer(8);

  // Next Price
  if (nextSlot) {
    let nextVal = mainStack.addText(formatPrice(nextSlot.value_inc_vat));
    nextVal.font = Font.boldSystemFont(16);
    nextVal.textColor = getPriceColor(nextSlot.value_inc_vat);

    let nextLabel = mainStack.addText("Next");
    nextLabel.font = Font.systemFont(10);
    nextLabel.textColor = Color.white();
    nextLabel.textOpacity = 0.8;
  }

  mainStack.addSpacer();

  // Updated Time
  let df = new DateFormatter();
  df.dateFormat = "HH:mm";
  let footer = mainStack.addText(`Updated: ${df.string(now)}`);
  footer.font = Font.systemFont(8);
  footer.textColor = Color.lightGray();
  footer.textOpacity = 0.6;
}

function renderMediumWidget(widget, currentSlot, nextSlot, minPrice, maxPrice, avgPrice, lowSlot, peakSlot) {
  widget.setPadding(15, 15, 12, 15);

  // --- UI: MAIN HORIZONTAL STACK ---
  let mainStack = widget.addStack();
  mainStack.topAlignContent();

  // LEFT COLUMN: Agile Live (2/3 of the area)
  let leftCol = mainStack.addStack();
  leftCol.layoutVertically();
  // Set width to ~2/3 of a standard medium widget (approx 210pts)
  leftCol.size = new Size(200, 0);

  let title = leftCol.addText("OCTOPUS AGILE LIVE");
  title.font = Font.boldSystemFont(12);
  title.textColor = Color.white();
  title.textOpacity = 0.6;

  leftCol.addSpacer(4);

  let curVal = currentSlot ? currentSlot.value_inc_vat : 0;
  let curText = leftCol.addText(formatPrice(curVal));
  curText.font = Font.boldSystemFont(38); // Bold and large
  curText.textColor = getPriceColor(curVal);

  let curSub = leftCol.addText("Current Rate");
  curSub.font = Font.systemFont(11);
  curSub.textColor = Color.white();
  curSub.textOpacity = 0.8;

  leftCol.addSpacer(10);

  if (nextSlot) {
    let nextStack = leftCol.addStack();
    let nLabel = nextStack.addText("Next: ");
    nLabel.font = Font.systemFont(13);
    nLabel.textColor = Color.white();

    let nVal = nextStack.addText(formatPrice(nextSlot.value_inc_vat));
    nVal.font = Font.boldSystemFont(13);
    nVal.textColor = getPriceColor(nextSlot.value_inc_vat);
  }

  // RIGHT COLUMN: Today's Range (1/3 of the area)
  let rightCol = mainStack.addStack();
  rightCol.layoutVertically();
  // Set width to ~1/3 of a standard medium widget (approx 105pts)
  rightCol.size = new Size(110, 0);

  let statsTitle = rightCol.addText("TODAY'S RANGE");
  statsTitle.font = Font.boldSystemFont(11);
  statsTitle.textColor = Color.white();
  statsTitle.textOpacity = 0.6;
  statsTitle.rightAlignText();

  rightCol.addSpacer(12); // Pushes stats down to align better with left side

  addStatRow(rightCol, "LOW", minPrice, formatTime(lowSlot.valid_from));
  rightCol.addSpacer(8);
  addStatRow(rightCol, "HIGH", maxPrice, formatTime(peakSlot.valid_from));
  rightCol.addSpacer(8);
  addStatRow(rightCol, "AVG", avgPrice, "Today");

  widget.addSpacer();

  // Footer: Fetched time
  let df = new DateFormatter();
  df.dateFormat = "HH:mm:ss";
  let footer = widget.addText(`Last updated: ${df.string(now)}`);
  footer.font = Font.systemFont(8);
  footer.textColor = Color.lightGray();
  footer.centerAlignText();
  footer.textOpacity = 0.4;
}

function renderLargeWidget(widget, currentSlot, nextSlot, minPrice, maxPrice, avgPrice, lowSlot, peakSlot, todayPrices, now) {
  widget.setPadding(15, 15, 15, 15);

  // Top Half: Reuse Medium Logic structure manually
  let topStack = widget.addStack();
  topStack.layoutVertically();
  topStack.size = new Size(0, 150); // Approximately half height

  let topContentStack = topStack.addStack();

  // LEFT COLUMN
  let leftCol = topContentStack.addStack();
  leftCol.layoutVertically();
  leftCol.size = new Size(200, 0);

  let title = leftCol.addText("OCTOPUS AGILE LIVE");
  title.font = Font.boldSystemFont(12);
  title.textColor = Color.white();
  title.textOpacity = 0.6;
  leftCol.addSpacer(4);

  let curVal = currentSlot ? currentSlot.value_inc_vat : 0;
  let curText = leftCol.addText(formatPrice(curVal));
  curText.font = Font.boldSystemFont(38);
  curText.textColor = getPriceColor(curVal);

  let curSub = leftCol.addText("Current Rate");
  curSub.font = Font.systemFont(11);
  curSub.textColor = Color.white();
  curSub.textOpacity = 0.8;
  leftCol.addSpacer(10);

  if (nextSlot) {
    let nextStack = leftCol.addStack();
    let nLabel = nextStack.addText("Next: ");
    nLabel.font = Font.systemFont(13);
    nLabel.textColor = Color.white();
    let nVal = nextStack.addText(formatPrice(nextSlot.value_inc_vat));
    nVal.font = Font.boldSystemFont(13);
    nVal.textColor = getPriceColor(nextSlot.value_inc_vat);
  }

  // RIGHT COLUMN
  let rightCol = topContentStack.addStack();
  rightCol.layoutVertically();
  rightCol.size = new Size(110, 0);

  let statsTitle = rightCol.addText("TODAY'S RANGE");
  statsTitle.font = Font.boldSystemFont(11);
  statsTitle.textColor = Color.white();
  statsTitle.textOpacity = 0.6;
  statsTitle.rightAlignText();
  rightCol.addSpacer(12);

  addStatRow(rightCol, "LOW", minPrice, formatTime(lowSlot.valid_from));
  rightCol.addSpacer(8);
  addStatRow(rightCol, "HIGH", maxPrice, formatTime(peakSlot.valid_from));
  rightCol.addSpacer(8);
  addStatRow(rightCol, "AVG", avgPrice, "Today");

  widget.addSpacer(4);

  // Bottom Half: Graph
  let graphStack = widget.addStack();
  graphStack.layoutVertically();

  let graphTitle = graphStack.addText("PRICE TREND (24H)");
  graphTitle.font = Font.boldSystemFont(10);
  graphTitle.textColor = Color.white();
  graphTitle.textOpacity = 0.6;

  graphStack.addSpacer(5);

  let chartImg = drawChart(todayPrices, minPrice, maxPrice);
  let chart = graphStack.addImage(chartImg);
  chart.applyFillingContentMode();

  widget.addSpacer(2);

  // Footer
  let df = new DateFormatter();
  df.dateFormat = "HH:mm:ss";
  let footer = widget.addText(`Last updated: ${df.string(now)}`);
  footer.font = Font.systemFont(8);
  footer.textColor = Color.lightGray();
  footer.centerAlignText();
  footer.textOpacity = 0.4;
}

function drawChart(data, min, max) {
  // 1. Force Y-axis to start at 0 if min > 0
  if (min > 0) min = 0;

  // Calculate Average for Peak Detection
  let avg = data.reduce((a, b) => a + b.value_inc_vat, 0) / data.length;
  // Define Peak Threshold: Midpoint between Avg and Max
  // Any contiguous block around the max price above this threshold is "Peak"
  let peakThreshold = (max + avg) / 2;

  let maxVal = -Infinity;
  let maxIdx = -1;
  // Find index of absolute max price
  for (let i = 0; i < data.length; i++) {
    if (data[i].value_inc_vat > maxVal) {
      maxVal = data[i].value_inc_vat;
      maxIdx = i;
    }
  }

  // Expand outwards from maxIdx to find start/end of peak block
  let peakStartIdx = maxIdx;
  let peakEndIdx = maxIdx;

  if (peakThreshold < max) { // Only calculate if there is variance
    // Move left
    while (peakStartIdx > 0 && data[peakStartIdx - 1].value_inc_vat >= peakThreshold) {
      peakStartIdx--;
    }
    // Move right
    while (peakEndIdx < data.length - 1 && data[peakEndIdx + 1].value_inc_vat >= peakThreshold) {
      peakEndIdx++;
    }
  }

  let w = 600;
  let h = 300;
  let ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;

  // Padding
  let padLeft = 60; // Increased for larger 16pt font
  let padRight = 20;
  let padTop = 20;
  let padBottom = 30;

  let graphW = w - padLeft - padRight;
  let graphH = h - padTop - padBottom;

  // Draw Axes
  ctx.setStrokeColor(new Color("#ffffff", 0.3));
  ctx.setLineWidth(2);

  // Y Axis
  let p1 = new Point(padLeft, padTop);
  let p2 = new Point(padLeft, h - padBottom);

  // X Axis
  let p3 = new Point(padLeft, h - padBottom);
  let p4 = new Point(w - padRight, h - padBottom);

  let axesPath = new Path();
  axesPath.move(p1);
  axesPath.addLine(p2);
  axesPath.move(p3);
  axesPath.addLine(p4);
  ctx.addPath(axesPath);
  ctx.strokePath();

  // Calculate Scales
  let yRange = max - min;
  if (yRange === 0) yRange = 1;

  // Use fixed 48 slots (00:00 to 23:30) for X-axis to ensure valid_from to 23:30 coverage
  let totalSlots = 48; // 30-min slots in 24h
  let getX = (slotIndex) => padLeft + (slotIndex / (totalSlots - 1)) * graphW;
  let getY = (val) => h - padBottom - ((val - min) / yRange) * graphH;

  // Draw Line
  let path = new Path();
  let first = true;

  for (let i = 0; i < data.length; i++) {
    // Calculate slot index based on time 00:00 - 23:30
    let d = new Date(data[i].valid_from);
    let slotIndex = d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0);

    // Ensure we don't go out of bounds if data has weird times, though Agile is standard
    if (slotIndex >= totalSlots) slotIndex = totalSlots - 1;

    let pt = new Point(getX(slotIndex), getY(data[i].value_inc_vat));
    if (first) {
      path.move(pt);
      first = false;
    } else {
      path.addLine(pt);
    }
  }

  ctx.addPath(path);
  ctx.setStrokeColor(Color.cyan());
  ctx.setLineWidth(4);
  ctx.strokePath();

  // Zero Line (if visible and distinct from axis)
  if (min < 0 && max > 0) {
    let y0 = getY(0);
    // only draw if significantly different from bottom axis
    if (Math.abs(y0 - (h - padBottom)) > 2) {
      let zeroPath = new Path();
      zeroPath.move(new Point(padLeft, y0));
      zeroPath.addLine(new Point(w - padRight, y0));
      ctx.addPath(zeroPath);
      ctx.setStrokeColor(new Color("#ffffff", 0.3));
      ctx.setLineWidth(1);
      ctx.strokePath();
    }
  }

  // Draw Peak Time Lines (Adaptive)
  // Helper to draw dashed line
  const drawDashedLine = (x) => {
    let dashHeight = 5;
    let gapHeight = 3;
    let yStart = padTop;
    let yEnd = h - padBottom;
    let currentY = yStart;

    let dashPath = new Path();
    while (currentY < yEnd) {
      dashPath.move(new Point(x, currentY));
      dashPath.addLine(new Point(x, Math.min(currentY + dashHeight, yEnd)));
      currentY += dashHeight + gapHeight;
    }
    ctx.addPath(dashPath);
  };

  // Peak Line Style
  ctx.setStrokeColor(new Color("#FF5555", 0.9)); // Brighter red, more opaque for better visibility
  ctx.setLineWidth(1);

  // Draw lines at start and end of peak block
  // Start line: Start of the first peak slot (at peakStartIdx)
  // End line: End of the last peak slot (at peakEndIdx + 1)
  if (peakStartIdx !== -1 && peakStartIdx !== peakEndIdx) {
    let startD = new Date(data[peakStartIdx].valid_from);
    let startSlot = startD.getHours() * 2 + (startD.getMinutes() >= 30 ? 1 : 0);

    let endD = new Date(data[peakEndIdx].valid_to); // Use valid_to for end line
    // If valid_to is 00:00 next day, it's slot 48 (which is right edge)
    // d.getHours() of 00:00 is 0.
    // We need to handle 00:00 specifically? 
    // Usually valid_to 19:00 means 38 slots.
    let endSlot = endD.getHours() * 2 + (endD.getMinutes() >= 30 ? 1 : 0);
    if (endSlot === 0 && endD.getDate() !== startD.getDate()) endSlot = 48; // Next day midnight

    drawDashedLine(getX(startSlot));
    // Check bounds
    if (endSlot >= totalSlots) {
      drawDashedLine(w - padRight);
    } else {
      drawDashedLine(getX(endSlot));
    }
  }


  ctx.strokePath();

  // Draw Average Line
  let avgY = getY(avg);
  let avgPath = new Path();
  avgPath.move(new Point(padLeft, avgY));
  avgPath.addLine(new Point(w - padRight, avgY));
  ctx.addPath(avgPath);
  ctx.setStrokeColor(new Color("#FFA500", 0.7)); // Orange for average
  ctx.setLineWidth(1);
  // Manual Dash for Avg Line (dotted style) to differ from peak
  // Actually DrawContext doesn't support dash style easily on path without manual loop, 
  // but let's just use a solid thin line with opacity for simplicity as we already have manual dash loops above
  // or we can reuse the manual loop if we want dashes. Let's do a simple solid line for now for clarity.
  ctx.strokePath();

  // Labels
  ctx.setTextColor(Color.white());
  ctx.setFont(Font.systemFont(18));

  // Y-Labels (Min / Max / Avg)
  ctx.drawText(Math.round(max).toString(), new Point(0, padTop - 10));
  ctx.drawText(Math.round(min).toString(), new Point(0, h - padBottom - 10));

  // Avg Label on Y-axis (Left)
  ctx.setTextColor(new Color("#FFA500"));
  ctx.setFont(Font.boldSystemFont(16)); // Larger font
  // Position it near the avg line on the left axis area
  // We need space for 2 lines. 16pt font needs more vertical space.
  // Block height approx 36pt. Center it on avgY.
  let avgLabelY = Math.max(padTop, Math.min(avgY - 18, h - padBottom - 40));

  ctx.drawText("Avg:", new Point(0, avgLabelY));
  ctx.drawText(avg.toFixed(2), new Point(0, avgLabelY + 18));

  ctx.setTextColor(Color.white());
  ctx.setFont(Font.systemFont(18));

  // X-Labels (Fixed 00:00 - 23:30)
  let yLabelPos = h - padBottom + 5;

  if (data.length > 0) {
    ctx.drawText("00:00", new Point(padLeft, yLabelPos));
    ctx.drawText("23:30", new Point(w - padRight - 50, yLabelPos));

    // Peak Labels
    if (peakStartIdx !== -1 && peakStartIdx !== peakEndIdx) {
      let startTime = formatTime(data[peakStartIdx].valid_from);
      let endTime = formatTime(data[peakEndIdx].valid_to);

      let startD = new Date(data[peakStartIdx].valid_from);
      let startSlot = startD.getHours() * 2 + (startD.getMinutes() >= 30 ? 1 : 0);
      let startX = getX(startSlot);

      let endD = new Date(data[peakEndIdx].valid_to);
      let endSlot = endD.getHours() * 2 + (endD.getMinutes() >= 30 ? 1 : 0);
      if (endSlot === 0 && endD.getDate() !== startD.getDate()) endSlot = 48;

      let endX = (endSlot >= totalSlots) ? (w - padRight) : getX(endSlot);

      // Simple collision avoidance
      ctx.drawText(startTime, new Point(startX - 20, yLabelPos));

      // Draw peak end label
      if (endX < w - padRight) {
        ctx.drawText(endTime, new Point(endX - 20, yLabelPos));
      } else {
        ctx.drawText(endTime, new Point(w - padRight - 30, yLabelPos));
      }
    }
  }

  return ctx.getImage();
}


// --- Helper for Stats (Right Aligned) ---
function addStatRow(container, label, value, time) {
  let row = container.addStack();
  row.addSpacer();

  let lbl = row.addText(label + ": ");
  lbl.font = Font.boldSystemFont(10);
  lbl.textColor = Color.white();

  let valText = row.addText(formatPrice(value).replace('.00', '')); // compact
  valText.font = Font.systemFont(10);
  valText.textColor = getPriceColor(value);

  let timeText = row.addText(` (${time})`);
  timeText.font = Font.systemFont(8);
  timeText.textColor = Color.lightGray();
}

// --- REFRESH LOGIC ---
let refreshDate = new Date();
if (now.getMinutes() < 30) {
  refreshDate.setMinutes(30, 5, 0);
} else {
  refreshDate.setHours(now.getHours() + 1);
  refreshDate.setMinutes(0, 5, 0);
}
widget.refreshAfterDate = refreshDate;
console.log("Next refresh scheduled for: " + refreshDate.toLocaleTimeString());

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Use this for testing different sizes inside the app
  // change to presentSmall() or presentLarge() to test
  // widget.presentSmall();
  widget.presentMedium();
  // widget.presentLarge();
}
Script.complete();