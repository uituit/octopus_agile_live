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
widget.setPadding(15, 15, 12, 15);

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

  let maxPrice = Math.max(...todayPrices.map(p => p.value_inc_vat));
  let minPrice = Math.min(...todayPrices.map(p => p.value_inc_vat));
  let avgPrice = todayPrices.reduce((a, b) => a + b.value_inc_vat, 0) / todayPrices.length;

  let peakSlot = todayPrices.find(p => p.value_inc_vat === maxPrice);
  let lowSlot = todayPrices.find(p => p.value_inc_vat === minPrice);

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
}

widget.addSpacer();

// Footer: Fetched time
let df = new DateFormatter();
df.dateFormat = "HH:mm:ss";
let footer = widget.addText(`Last updated: ${df.string(now)}`);
footer.font = Font.systemFont(8);
footer.textColor = Color.lightGray();
footer.centerAlignText();
footer.textOpacity = 0.4;

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
  widget.presentMedium();
}
Script.complete();