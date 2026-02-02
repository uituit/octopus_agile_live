// --- CONFIGURATION ---
const REGION = "A"; // Enter your region letter here
const PRODUCT_CODE = "AGILE-24-10-01"; // Enter your product code here
// ---------------------

const TARIFF_CODE = `E-1R-${PRODUCT_CODE}-${REGION}`;
const API_URL = `https://api.octopus.energy/v1/products/${PRODUCT_CODE}/electricity-tariffs/${TARIFF_CODE}/standard-unit-rates/`;

async function getPrices() {
  try {
    let req = new Request(API_URL);
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
  let padLeft = 40;
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

  let getX = (index) => padLeft + (index / (data.length - 1)) * graphW;
  let getY = (val) => h - padBottom - ((val - min) / yRange) * graphH;

  // Draw Line
  let path = new Path();
  let first = true;

  for (let i = 0; i < data.length; i++) {
    let pt = new Point(getX(i), getY(data[i].value_inc_vat));
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

  ctx.setStrokeColor(new Color("#FF0000", 0.5)); // Reddish for peak, semi-transparent
  ctx.setLineWidth(1);

  // Draw lines at start and end of peak block
  // Start line: Start of the first peak slot (at peakStartIdx)
  // End line: End of the last peak slot (at peakEndIdx + 1)
  if (peakStartIdx !== -1 && peakStartIdx !== peakEndIdx) {
    drawDashedLine(getX(peakStartIdx));
    // Ensure we don't draw outside the graph if peak is at the very end
    if (peakEndIdx + 1 < data.length) {
      drawDashedLine(getX(peakEndIdx + 1));
    } else {
      // If it's the very last slot, draw at the edge
      drawDashedLine(w - padRight);
    }
  }


  ctx.strokePath();

  // Labels
  ctx.setTextColor(Color.white());
  ctx.setFont(Font.systemFont(18));

  // Y-Labels (Min / Max)
  ctx.drawText(Math.round(max).toString(), new Point(0, padTop - 10));
  ctx.drawText(Math.round(min).toString(), new Point(0, h - padBottom - 10));

  // X-Labels
  let yLabelPos = h - padBottom + 5;

  if (data.length > 0) {
    let tStart = formatTime(data[0].valid_from);
    let tEnd = formatTime(data[data.length - 1].valid_from);

    ctx.drawText(tStart, new Point(padLeft, yLabelPos));
    ctx.drawText(tEnd, new Point(w - padRight - 50, yLabelPos));

    // Peak Labels
    if (peakStartIdx !== -1 && peakStartIdx !== peakEndIdx) {
      let startTime = formatTime(data[peakStartIdx].valid_from);
      // Use valid_to for the end time label (e.g. 19:00 instead of 18:30)
      let endTime = formatTime(data[peakEndIdx].valid_to);

      // Simple collision avoidance with start/end labels
      // If peak is too close to start/end, don't draw label or offset it
      // For simplicity, we just draw them at the x position
      ctx.drawText(startTime, new Point(getX(peakStartIdx) - 20, yLabelPos));

      // Draw peak end label
      if (peakEndIdx + 1 < data.length) {
        ctx.drawText(endTime, new Point(getX(peakEndIdx + 1) - 20, yLabelPos));
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