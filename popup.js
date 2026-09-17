const DEFAULTS = {
  baseUrl: "https://grafana.inditex.com",
  orgId: 1,
  datasource: "Loki",
  projectkey: "SGASOR",
  environment: "pro",
  platform: "Openshift-IOP Tordera Logistics5",
  target: "prendacolgadadutti-c1",
  since: "1h"
};

const platformInput = document.querySelector("#platform");
const projectInput = document.querySelector("#projectkey");
const targetInput = document.querySelector("#target");
const modeInput = document.querySelector("#time-mode");
const sinceInput = document.querySelector("#since");
const absoluteRange = document.querySelector("#absolute-range");
const form = document.querySelector("#query-form");
const result = document.querySelector("#result");
const queryOutput = document.querySelector("#query");
const statusOutput = document.querySelector("#status");

function optionsFor(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function projectkeysFor(platform) {
  return Object.keys(SLOT_CHOICES[platform] || {});
}

function slotsFor(platform, projectkey) {
  return SLOT_CHOICES[platform]?.[projectkey] || [];
}

function refreshProjectkeys(preferred) {
  const projectkeys = projectkeysFor(platformInput.value);
  const projectkey = projectkeys.includes(preferred) ? preferred : projectkeys[0] || "";
  projectInput.innerHTML = optionsFor(projectkeys, projectkey);
  refreshTargets(DEFAULTS.target);
}

function refreshTargets(preferred) {
  const slots = slotsFor(platformInput.value, projectInput.value);
  const target = slots.includes(preferred) ? preferred : slots[0] || "";
  targetInput.innerHTML = optionsFor(slots, target);
}

function escapeLabelValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function buildLogql() {
  const projectkey = escapeLabelValue(projectInput.value.trim() || DEFAULTS.projectkey);
  const platform = escapeLabelValue(platformInput.value.trim() || DEFAULTS.platform);
  const environment = escapeLabelValue(document.querySelector("#environment").value.trim() || DEFAULTS.environment);
  const target = escapeLabelValue(targetInput.value.trim() || DEFAULTS.target);
  const conditions = [`instance=~"${target}"`, `moduleInstance=~"${target}"`, `slot=~"${target}"`];
  let query = `{projectkey="${projectkey}",platform="${platform}",environment="${environment}"} | json | (${conditions.join(" or ")}) `;
  const fragment = document.querySelector("#free-text").value;
  if (fragment) query += /^\s/.test(fragment) ? fragment : ` ${fragment}`;
  return `${query}| line_format "{{.level}}\\t{{.message}}"`;
}

function toUnixMs(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error("Fecha/hora no vÃ¡lida");
  return timestamp;
}

function buildExploreUrl(query) {
  let range;
  if (modeInput.value === "Absoluto") {
    const start = toUnixMs(document.querySelector("#start").value);
    const end = toUnixMs(document.querySelector("#end").value);
    if (start >= end) throw new Error("La fecha/hora de inicio debe ser anterior al fin");
    range = { from: String(start), to: String(end) };
  } else {
    range = { from: `now-${sinceInput.value.trim() || DEFAULTS.since}`, to: "now" };
  }
  const left = { datasource: DEFAULTS.datasource, queries: [{ refId: "A", expr: query }], range };
  const encoded = encodeURIComponent(JSON.stringify(left));
  return `${DEFAULTS.baseUrl}/explore?orgId=${DEFAULTS.orgId}&left=${encoded}`;
}

function localDateTime(hoursAgo = 1) {
  const date = new Date(Date.now() - hoursAgo * 3600000);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

platformInput.innerHTML = optionsFor(Object.keys(SLOT_CHOICES), DEFAULTS.platform);
refreshProjectkeys(DEFAULTS.projectkey);
modeInput.addEventListener("change", () => {
  absoluteRange.classList.toggle("hidden", modeInput.value !== "Absoluto");
  document.querySelector("#since-wrap").classList.toggle("hidden", modeInput.value === "Absoluto");
});
platformInput.addEventListener("change", () => refreshProjectkeys());
projectInput.addEventListener("change", () => refreshTargets());
document.querySelector("#start").value = localDateTime(1);
document.querySelector("#end").value = localDateTime(0);
document.querySelector("#copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(queryOutput.textContent);
  statusOutput.textContent = "Consulta copiada.";
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const query = buildLogql();
    const url = buildExploreUrl(query);
    queryOutput.textContent = query;
    statusOutput.textContent = "Consulta generada. Abriendo Grafana...";
    result.classList.remove("hidden");
    await browser.tabs.create({ url });
  } catch (error) {
    result.classList.remove("hidden");
    queryOutput.textContent = "";
    statusOutput.textContent = `Error: ${error.message}`;
  }
});

