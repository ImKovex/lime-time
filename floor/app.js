// Local Lime Leawood — manager floor chart.
// Change the shared gate here. This is not an account password.
const MANAGER_CODE = "MGR2026";
const QUIZ_CODE = "LIME2026";

const VERSION = "1.0.0";
const AUTH_KEY = "lll.floor.unlocked";
const CHART_KEY = "lll.floor.chart";
const TIER_KEY = "lll.floor.tiers";
const DRAFT_KEY = "lll.floor.draft";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const AREA_NAME = {
  "patio-out": "Patio outside",
  "patio-main": "Patio",
  "front-left": "Front",
  "front-center": "Front center",
  middle: "Middle",
  upper: "Upper room",
  window: "Window",
  kitchen: "Kitchen side",
  "bar-top": "Bar top",
  "bar-rail": "Bar rail",
  "bar-foot": "Bar foot",
};

const PALETTE = [
  "#E24B4B",
  "#F08A24",
  "#C8960A",
  "#2F9E62",
  "#1F8A70",
  "#2F6FED",
  "#7A5AF8",
  "#D946A6",
  "#0E8FBF",
  "#8C5A3C",
  "#6B7C3A",
  "#C43D6E",
  "#3D4F9F",
  "#B85C38",
  "#0F7A6A",
  "#6B4C9A",
  "#B45309",
  "#0369A1",
  "#9F1239",
  "#3F6212",
];

const ZONE_ORDER = ["patio", "dining", "bar"];
const PORTALS = [
  ["121", "50"],
  ["120", "40"],
];
const NEIGHBOR_REACH = 18;

const state = {
  servers: [],
  tables: [],
  aspect: 1.95,
  adj: new Map(),
  tiers: {},
  day: "Thu",
  shift: "PM",
  includeBar: false,
  selected: new Set(),
  assignments: {},
  colors: {},
  manual: false,
  notes: [],
  history: [],
  highlight: null,
  activeTable: null,
  view: [],
};

function lastKey(name) {
  const parts = String(name).trim().split(/\s+/);
  return (parts[parts.length - 1] + " " + name).toLowerCase();
}

function rotate(list, day, shift) {
  if (list.length < 2) return list.slice();
  const turn = Math.max(0, DAYS.indexOf(day)) + (shift === "PM" ? 7 : 0);
  const k = turn % list.length;
  return list.slice(k).concat(list.slice(0, k));
}

function availabilityStatus(server, day, shift) {
  const book = server && server.availability;
  const row = book ? book[day] : null;
  if (row == null) return "unknown";
  if (Array.isArray(row) && row.indexOf(shift) !== -1) return "on";
  return "off";
}

function autoPick(servers, day, shift, limit) {
  const cap = limit == null ? 15 : limit;
  const buckets = { onS: [], onB: [], unkS: [], unkB: [] };
  servers.forEach((server) => {
    const status = availabilityStatus(server, day, shift);
    if (status === "off") return;
    const pure = server.role === "S";
    const key = (status === "on" ? "on" : "unk") + (pure ? "S" : "B");
    buckets[key].push(server);
  });
  Object.keys(buckets).forEach((key) => {
    buckets[key].sort((a, b) => lastKey(a.name).localeCompare(lastKey(b.name)));
  });
  return buckets.onS.concat(buckets.onB, buckets.unkS, buckets.unkB).slice(0, cap);
}

function buildAdj(tables, aspect) {
  const adj = new Map();
  tables.forEach((table) => adj.set(table.id, new Set()));
  const link = (a, b) => {
    if (!adj.has(a) || !adj.has(b) || a === b) return;
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  const byZone = {};
  tables.forEach((table) => {
    if (!byZone[table.zone]) byZone[table.zone] = [];
    byZone[table.zone].push(table);
  });
  Object.keys(byZone).forEach((zone) => {
    const list = byZone[zone].slice().sort((a, b) => a.seq - b.seq);
    for (let i = 1; i < list.length; i += 1) link(list[i - 1].id, list[i].id);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const dx = list[i].x - list[j].x;
        const dy = (list[i].y - list[j].y) * aspect;
        if (Math.hypot(dx, dy) <= NEIGHBOR_REACH) link(list[i].id, list[j].id);
      }
    }
  });
  PORTALS.forEach((pair) => link(pair[0], pair[1]));
  return adj;
}

function isContiguous(ids, adj) {
  if (ids.length <= 1) return true;
  const want = new Set(ids);
  const seen = new Set([ids[0]]);
  const queue = [ids[0]];
  while (queue.length) {
    const cur = queue.pop();
    const next = adj.get(cur);
    if (!next) continue;
    next.forEach((id) => {
      if (want.has(id) && !seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
    });
  }
  return seen.size === want.size;
}

function sliceZone(ids, areaOf, sectionCount, maxAreas) {
  const total = ids.length;
  if (sectionCount < 1 || sectionCount > total) return null;
  if (sectionCount === 1) {
    const areas = new Set(ids.map((id) => areaOf.get(id)));
    if (areas.size > maxAreas) return null;
    return [ids.slice()];
  }
  const base = Math.floor(total / sectionCount);
  const extra = total % sectionCount;
  const big = extra ? base + 1 : base;
  const small = base;
  const pred = new Map();
  const seen = new Set(["0,0,0"]);
  const queue = [[0, 0, 0]];
  while (queue.length) {
    const item = queue.shift();
    const index = item[0];
    const sections = item[1];
    const bigsUsed = item[2];
    if (sections === sectionCount) continue;
    for (let useBig = 1; useBig >= 0; useBig -= 1) {
      if (useBig && bigsUsed >= extra) continue;
      const length = useBig ? big : small;
      if (length <= 0) continue;
      const end = index + length;
      if (end > total) continue;
      const nextBigs = bigsUsed + (useBig ? 1 : 0);
      const nextSections = sections + 1;
      const remTables = total - end;
      const remSections = sectionCount - nextSections;
      const remBigs = extra - nextBigs;
      if (remBigs < 0 || remBigs > remSections) continue;
      if (remSections === 0) {
        if (remTables !== 0) continue;
      } else {
        const must = remBigs * big + (remSections - remBigs) * small;
        if (must !== remTables) continue;
      }
      const areas = new Set();
      for (let cursor = index; cursor < end; cursor += 1) areas.add(areaOf.get(ids[cursor]));
      if (areas.size > maxAreas) continue;
      const key = end + "," + nextSections + "," + nextBigs;
      if (!seen.has(key)) {
        seen.add(key);
        pred.set(key, index + "," + sections + "," + bigsUsed);
        queue.push([end, nextSections, nextBigs]);
      }
    }
  }
  const endKey = total + "," + sectionCount + "," + extra;
  if (!seen.has(endKey)) return null;
  const chunks = [];
  let cursor = endKey;
  while (cursor !== "0,0,0") {
    const prev = pred.get(cursor);
    const end = Number(cursor.split(",")[0]);
    const start = Number(prev.split(",")[0]);
    chunks.push(ids.slice(start, end));
    cursor = prev;
  }
  chunks.reverse();
  return chunks;
}

function sliceZoneFlex(ids, areaOf, sectionCount) {
  const limits = [2, 3, 99];
  for (let i = 0; i < limits.length; i += 1) {
    const cut = sliceZone(ids, areaOf, sectionCount, limits[i]);
    if (cut) return { cut: cut, maxA: limits[i] };
  }
  return null;
}

function zonePaths(tables) {
  const zones = [];
  ZONE_ORDER.forEach((zone) => {
    const list = tables
      .filter((table) => table.zone === zone)
      .slice()
      .sort((a, b) => a.seq - b.seq);
    if (!list.length) return;
    zones.push({
      id: zone,
      ids: list.map((table) => table.id),
      areaOf: new Map(list.map((table) => [table.id, table.area])),
    });
  });
  return zones;
}

function allocateSections(zones, serverCount) {
  const zoneCount = zones.length;
  if (!zoneCount || serverCount < zoneCount) return null;
  let best = null;
  const chosen = new Array(zoneCount);

  function consider() {
    const slices = [];
    let worstA = 2;
    for (let i = 0; i < zoneCount; i += 1) {
      const flex = sliceZoneFlex(zones[i].ids, zones[i].areaOf, chosen[i]);
      if (!flex) return;
      slices.push(flex.cut);
      if (flex.maxA > worstA) worstA = flex.maxA;
    }
    const sizes = [];
    slices.forEach((cut) => cut.forEach((chunk) => sizes.push(chunk.length)));
    const spread = Math.max.apply(null, sizes) - Math.min.apply(null, sizes);
    const tiny = sizes.filter((size) => size < 2).length;
    const score = tiny * 1000 + (worstA > 2 ? (worstA === 3 ? 40 : 120) : 0) + spread;
    if (!best || score < best.score) {
      best = { score: score, spread: spread, slices: slices, worstA: worstA, sizes: sizes };
    }
  }

  function walk(zoneIndex, remaining) {
    const last = zoneIndex === zoneCount - 1;
    if (last) {
      if (remaining < 1 || remaining > zones[zoneIndex].ids.length) return;
      chosen[zoneIndex] = remaining;
      consider();
      return;
    }
    const keep = zoneCount - zoneIndex - 1;
    const maxK = Math.min(zones[zoneIndex].ids.length, remaining - keep);
    for (let count = 1; count <= maxK; count += 1) {
      chosen[zoneIndex] = count;
      walk(zoneIndex + 1, remaining - count);
    }
  }

  walk(0, serverCount);
  return best;
}

function assignPeople(groups, servers, day, shift, tableById) {
  const profiles = groups.map((ids, index) => {
    let patio = 0;
    let booth = 0;
    let kitchen = 0;
    ids.forEach((id) => {
      const table = tableById.get(id);
      if (!table) return;
      if (table.zone === "patio") patio += 1;
      if (id === "30" || id === "31" || id === "32") booth += 1;
      if (table.area === "kitchen") kitchen += 1;
    });
    return {
      index: index,
      a: patio * 5 + booth * 3 - kitchen * 2,
      c: kitchen * 5 - patio * 4,
    };
  });
  const buckets = { A: [], B: [], C: [] };
  servers.forEach((server) => {
    const tier = String(server.tier || "B").toUpperCase();
    const key = buckets[tier] ? tier : "B";
    buckets[key].push(server);
  });
  ["A", "B", "C"].forEach((key) => {
    buckets[key].sort((a, b) => lastKey(a.name).localeCompare(lastKey(b.name)));
    buckets[key] = rotate(buckets[key], day, shift);
  });
  const remaining = new Set(profiles.map((profile) => profile.index));
  const owner = new Array(groups.length);

  function take(list, score) {
    list.forEach((server) => {
      let best = null;
      remaining.forEach((index) => {
        const profile = profiles[index];
        const preferLater = score === "c";
        const closer =
          !best ||
          profile[score] > best.score ||
          (profile[score] === best.score &&
            (preferLater ? profile.index > best.index : profile.index < best.index));
        if (closer) best = { index: index, score: profile[score] };
      });
      if (!best) return;
      remaining.delete(best.index);
      owner[best.index] = server;
    });
  }

  take(buckets.A, "a");
  take(buckets.C, "c");
  const rest = Array.from(remaining).sort((a, b) => a - b);
  rest.forEach((index, position) => {
    owner[index] = buckets.B[position];
  });

  const assignments = {};
  groups.forEach((ids, index) => {
    const server = owner[index];
    if (!server) return;
    ids.forEach((id) => {
      assignments[id] = server.name;
    });
  });
  return assignments;
}

function areaLabel(tables) {
  const ordered = tables.slice().sort((a, b) => a.seq - b.seq);
  const names = [];
  ordered.forEach((table) => {
    const name = AREA_NAME[table.area] || table.area;
    if (names.indexOf(name) === -1) names.push(name);
  });
  return names.join(" + ");
}

function displayNum(table) {
  return table.zone === "bar" ? "B" + table.label : table.label;
}

function groupSections(serverNames, assignments, tables, includeBar, adj, people, day, shift) {
  const active = tables.filter((table) => includeBar || table.zone !== "bar");
  const byName = new Map();
  serverNames.forEach((name) => byName.set(name, []));
  const unassigned = [];
  active.forEach((table) => {
    const who = assignments[table.id];
    if (who && byName.has(who)) byName.get(who).push(table);
    else unassigned.push(table);
  });

  function rank(list) {
    if (!list.length) return [9, 9999];
    const first = list.slice().sort((a, b) => {
      const zone = ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone);
      return zone || a.seq - b.seq;
    })[0];
    return [ZONE_ORDER.indexOf(first.zone), first.seq];
  }

  const sections = serverNames.map((name) => {
    const list = byName.get(name).slice().sort((a, b) => Number(a.label) - Number(b.label) || a.seq - b.seq);
    const person = people.get(name) || { name: name, role: "", tier: "B" };
    const status = availabilityStatus(person, day, shift);
    const zones = [];
    list.forEach((table) => {
      if (zones.indexOf(table.zone) === -1) zones.push(table.zone);
    });
    return {
      name: name,
      role: person.role || "",
      tier: String(person.tier || "B").toUpperCase(),
      status: status,
      tables: list,
      count: list.length,
      areaText: list.length ? areaLabel(list) : "No tables",
      zones: zones,
      contiguous: isContiguous(list.map((table) => table.id), adj),
      rank: rank(list),
    };
  });
  sections.sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || lastKey(a.name).localeCompare(lastKey(b.name)));
  unassigned.sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || a.seq - b.seq);
  return { sections: sections, unassigned: unassigned };
}

function buildFloor(options) {
  const tables = options.tables;
  const servers = options.servers;
  const day = options.day;
  const shift = options.shift;
  const includeBar = !!options.includeBar;
  const active = tables.filter((table) => includeBar || table.zone !== "bar");
  if (!servers.length) return { error: "Pick at least one server." };
  if (servers.length > active.length) {
    return { error: "Pick at most " + active.length + " servers. There are " + active.length + " tables." };
  }

  const zones = zonePaths(active);
  const notes = [];
  let groups = null;
  const plan = allocateSections(zones, servers.length);
  if (plan) {
    groups = [];
    plan.slices.forEach((cut) => cut.forEach((chunk) => groups.push(chunk)));
    if (plan.worstA > 2) {
      notes.push("One section crosses more than two neighboring areas.");
    }
  } else {
    const ids = [];
    zones.forEach((zone) => zone.ids.forEach((id) => ids.push(id)));
    const areaOf = new Map();
    active.forEach((table) => areaOf.set(table.id, table.area));
    groups = sliceZone(ids, areaOf, servers.length, 99);
    notes.push("Not enough servers to keep every section on one side of the room.");
  }
  if (!groups) return { error: "Couldn't split the room for that lineup." };

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const assignments = assignPeople(groups, servers, day, shift, tableById);
  const unknown = servers.filter((server) => availabilityStatus(server, day, shift) === "unknown");
  const off = servers.filter((server) => availabilityStatus(server, day, shift) === "off");
  if (unknown.length) {
    notes.push(
      "Flagged: " + unknown.length + " server" + (unknown.length === 1 ? "" : "s") + " with unknown availability."
    );
  }
  if (off.length) {
    notes.push("Flagged: " + off.length + " server" + (off.length === 1 ? "" : "s") + " off this shift.");
  }
  if (includeBar) notes.push("Bar seats are included. They normally stay with the bar.");

  const people = new Map(servers.map((server) => [server.name, server]));
  const adj = options.adj || buildAdj(tables, options.aspect || 1.95);
  const grouped = groupSections(
    servers.map((server) => server.name),
    assignments,
    tables,
    includeBar,
    adj,
    people,
    day,
    shift
  );
  const colors = {};
  grouped.sections.forEach((section, index) => {
    colors[section.name] = PALETTE[index % PALETTE.length];
    section.color = colors[section.name];
  });
  const counts = grouped.sections.map((section) => section.count);
  const min = counts.length ? Math.min.apply(null, counts) : 0;
  const max = counts.length ? Math.max.apply(null, counts) : 0;
  if (min < 2) notes.push("Some sections have fewer than 2 tables.");
  return {
    assignments: assignments,
    colors: colors,
    notes: notes,
    sections: grouped.sections,
    unassigned: grouped.unassigned,
    stats: { min: min, max: max, tables: active.length, servers: servers.length },
  };
}

function tint(hex) {
  const value = parseInt(String(hex).slice(1), 16);
  const mix = (channel) => Math.round(channel * 0.22 + 255 * 0.78);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return "rgb(" + mix(red) + ", " + mix(green) + ", " + mix(blue) + ")";
}

function $(id) {
  return document.getElementById(id);
}

function show(screen) {
  ["loading", "unlock", "shift", "roster", "chart"].forEach((name) => {
    const node = $("screen-" + name);
    if (node) node.hidden = name !== screen;
  });
  const lock = $("lock-btn");
  if (lock) lock.hidden = screen === "unlock" || screen === "loading";
  const note = $("toast");
  if (note) note.hidden = true;
}

function toast(message) {
  const node = $("toast");
  node.hidden = false;
  node.textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.hidden = true;
  }, 4200);
}

function loadTiers() {
  try {
    const raw = localStorage.getItem(TIER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveTiers() {
  localStorage.setItem(TIER_KEY, JSON.stringify(state.tiers));
}

function loadChart() {
  try {
    const raw = localStorage.getItem(CHART_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveChart() {
  const payload = {
    v: 1,
    day: state.day,
    shift: state.shift,
    includeBar: state.includeBar,
    manual: state.manual,
    selected: Array.from(state.selected),
    assignments: state.assignments,
    colors: state.colors,
    notes: state.notes,
    savedAt: Date.now(),
  };
  localStorage.setItem(CHART_KEY, JSON.stringify(payload));
  const resume = $("resume-btn");
  if (resume) resume.hidden = false;
}

function saveDraft() {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ day: state.day, shift: state.shift, selected: Array.from(state.selected) })
  );
}

function peopleMap() {
  const map = new Map();
  state.servers.forEach((server) => {
    map.set(server.name, {
      name: server.name,
      role: server.role,
      availability: server.availability,
      tier: state.tiers[server.name] || "B",
    });
  });
  state.selected.forEach((name) => {
    if (!map.has(name)) map.set(name, { name: name, role: "", tier: state.tiers[name] || "B" });
  });
  return map;
}

function selectedServers() {
  return state.servers
    .filter((server) => state.selected.has(server.name))
    .map((server) => ({
      name: server.name,
      role: server.role,
      availability: server.availability,
      tier: state.tiers[server.name] || "B",
    }));
}

function pushUndo() {
  state.history.push({
    assignments: Object.assign({}, state.assignments),
    colors: Object.assign({}, state.colors),
    manual: state.manual,
    includeBar: state.includeBar,
    notes: state.notes.slice(),
  });
  if (state.history.length > 25) state.history.shift();
  $("undo-btn").disabled = false;
}

function renderDays() {
  const row = $("day-row");
  row.textContent = "";
  DAYS.forEach((day) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = day;
    button.setAttribute("aria-pressed", day === state.day ? "true" : "false");
    button.addEventListener("click", () => {
      state.day = day;
      renderDays();
      renderShiftMeta();
    });
    row.appendChild(button);
  });
  $("shift-am").setAttribute("aria-pressed", state.shift === "AM" ? "true" : "false");
  $("shift-pm").setAttribute("aria-pressed", state.shift === "PM" ? "true" : "false");
}

function renderShiftMeta() {
  let on = 0;
  let unknown = 0;
  let off = 0;
  state.servers.forEach((server) => {
    const status = availabilityStatus(server, state.day, state.shift);
    if (status === "on") on += 1;
    else if (status === "unknown") unknown += 1;
    else off += 1;
  });
  $("shift-count").textContent =
    DAY_LONG[state.day] +
    " " +
    state.shift +
    " · " +
    on +
    " on the sheet · " +
    unknown +
    " unknown · " +
    off +
    " off";
  const saved = loadChart();
  $("resume-btn").hidden = !(saved && saved.assignments);
}

function shiftLabel(server) {
  const row = server.availability ? server.availability[state.day] : null;
  if (row == null) return "Not on the sheet";
  if (!row.length) return "Not scheduled";
  return row.join(" · ");
}

function renderRoster() {
  $("roster-heading").textContent = DAY_LONG[state.day] + " " + state.shift;
  const query = ($("roster-filter").value || "").trim().toLowerCase();
  const groups = { on: [], unknown: [], off: [] };
  state.servers.forEach((server) => {
    const status = availabilityStatus(server, state.day, state.shift);
    groups[status].push(server);
  });
  ["on", "unknown", "off"].forEach((key) => {
    groups[key].sort((a, b) => {
      if (a.role !== b.role) return a.role === "S" ? -1 : 1;
      return lastKey(a.name).localeCompare(lastKey(b.name));
    });
  });

  const list = $("roster-list");
  list.textContent = "";
  const titles = {
    on: "On this shift",
    unknown: "Availability unknown",
    off: "Off this shift",
  };

  function addGroup(key, wrap) {
    const people = groups[key].filter((server) => !query || server.name.toLowerCase().indexOf(query) !== -1);
    if (!people.length) return;
    const block = document.createElement("div");
    block.className = "group";
    const title = document.createElement(key === "off" ? "summary" : "h2");
    title.textContent = titles[key] + " · " + people.length;
    block.appendChild(title);
    people.forEach((server) => block.appendChild(personRow(server, key)));
    wrap.appendChild(block);
  }

  addGroup("on", list);
  addGroup("unknown", list);
  const offPeople = groups.off.filter((server) => !query || server.name.toLowerCase().indexOf(query) !== -1);
  if (offPeople.length) {
    const details = document.createElement("details");
    details.className = "group";
    const anyChecked = offPeople.some((server) => state.selected.has(server.name));
    if (anyChecked || query) details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Off this shift · " + offPeople.length;
    details.appendChild(summary);
    offPeople.forEach((server) => details.appendChild(personRow(server, "off")));
    list.appendChild(details);
  }
  if (!list.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-filter";
    empty.textContent = "No names match.";
    list.appendChild(empty);
  }
  const count = state.selected.size;
  $("selected-count").textContent = count + " selected · auto-pick aims for 15";
}

function personRow(server, status) {
  const row = document.createElement("div");
  row.className = "tier-row";
  const label = document.createElement("label");
  label.className = "person";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = state.selected.has(server.name);
  box.addEventListener("change", () => {
    if (box.checked) state.selected.add(server.name);
    else state.selected.delete(server.name);
    saveDraft();
    $("selected-count").textContent = state.selected.size + " selected · auto-pick aims for 15";
  });
  const text = document.createElement("span");
  text.className = "person-text";
  const name = document.createElement("span");
  name.className = "person-name";
  name.textContent = server.name;
  const meta = document.createElement("span");
  meta.className = "person-meta";
  const badge = document.createElement("span");
  badge.className = "badge" + (status === "unknown" ? " unknown" : status === "off" ? " off" : "");
  badge.textContent = server.role;
  const when = document.createElement("span");
  when.textContent = shiftLabel(server);
  meta.appendChild(badge);
  meta.appendChild(when);
  text.appendChild(name);
  text.appendChild(meta);
  label.appendChild(box);
  label.appendChild(text);

  const tier = document.createElement("select");
  tier.setAttribute("aria-label", "Tier for " + server.name);
  ["A", "B", "C"].forEach((level) => {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    tier.appendChild(option);
  });
  tier.value = state.tiers[server.name] || "B";
  tier.addEventListener("change", () => {
    state.tiers[server.name] = tier.value;
    saveTiers();
  });
  row.appendChild(label);
  row.appendChild(tier);
  return row;
}

function summaryText() {
  const counts = state.view.filter((section) => section.name).map((section) => section.count);
  const active = state.tables.filter((table) => state.includeBar || table.zone !== "bar").length;
  let range = "no sections yet";
  if (counts.length) {
    const min = Math.min.apply(null, counts);
    const max = Math.max.apply(null, counts);
    range = min === max ? min + " tables each" : min + "–" + max + " tables each";
  }
  const edited = state.manual ? " · hand-edited" : "";
  return (
    DAY_LONG[state.day] +
    " " +
    state.shift +
    " · " +
    state.selected.size +
    " servers · " +
    active +
    " tables · " +
    range +
    edited
  );
}

function renderChart() {
  $("chart-heading").textContent = DAY_LONG[state.day] + " " + state.shift;
  $("include-bar").checked = state.includeBar;
  const grouped = groupSections(
    Array.from(state.selected),
    state.assignments,
    state.tables,
    state.includeBar,
    state.adj,
    peopleMap(),
    state.day,
    state.shift
  );
  grouped.sections.forEach((section) => {
    section.color = state.colors[section.name] || "#8aa0b8";
  });
  state.view = grouped.sections;
  $("chart-summary").textContent = summaryText();
  const notes = $("chart-notes");
  notes.textContent = "";
  const lines = state.notes.slice();
  if (state.manual) lines.unshift("Hand-edited. Re-run auto to balance the sections again.");
  lines.forEach((line) => {
    const p = document.createElement("p");
    p.className = "note" + (line.indexOf("fewer than 2") !== -1 || line.indexOf("off this shift") !== -1 ? " warn" : "");
    p.textContent = line;
    notes.appendChild(p);
  });
  renderMap(grouped);
  renderSections(grouped);
  $("undo-btn").disabled = state.history.length === 0;
}

function renderMap(grouped) {
  const layer = $("table-layer");
  layer.textContent = "";
  const canDrag = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const owned = new Set();
  state.view.forEach((section) => {
    if (state.highlight && section.name === state.highlight) {
      section.tables.forEach((table) => owned.add(table.id));
    }
  });
  state.tables.forEach((table) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tbl kind-" + table.kind + " zone-" + table.zone;
    if (table.zone === "bar") button.classList.add("bar-seat");
    button.style.left = table.x + "%";
    button.style.top = table.y + "%";
    const off = table.zone === "bar" && !state.includeBar;
    const who = state.assignments[table.id];
    if (off) {
      button.classList.add("is-off");
      button.title = "Bar " + table.label + " · not assigned";
    } else if (who && state.colors[who]) {
      button.style.setProperty("--swatch", state.colors[who]);
      button.style.setProperty("--tint", tint(state.colors[who]));
      button.title = "Table " + displayNum(table) + " · " + who;
    } else {
      button.title = "Table " + displayNum(table) + " · unassigned";
    }
    if (state.activeTable === table.id) button.classList.add("is-active");
    if (state.highlight && !off && who !== state.highlight) button.classList.add("is-dim");
    const span = document.createElement("span");
    span.textContent = table.label;
    button.appendChild(span);
    button.addEventListener("click", () => openTable(table));
    if (canDrag && !off) {
      button.draggable = true;
      button.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", table.id);
        event.dataTransfer.effectAllowed = "move";
      });
    }
    layer.appendChild(button);
  });
}

function renderSections(grouped) {
  const list = $("section-list");
  list.textContent = "";
  if (!grouped.sections.length && !grouped.unassigned.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No sections yet.";
    list.appendChild(empty);
    return;
  }
  grouped.sections.forEach((section) => list.appendChild(sectionCard(section)));
  if (grouped.unassigned.length) {
    const card = document.createElement("article");
    card.className = "section";
    card.dataset.server = "";
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.setProperty("--swatch", "#d7d1c6");
    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "section-name";
    title.textContent = "Unassigned";
    const meta = document.createElement("div");
    meta.className = "section-meta";
    meta.textContent = grouped.unassigned.length + " tables";
    const nums = document.createElement("p");
    nums.className = "section-tables";
    grouped.unassigned.forEach((table) => nums.appendChild(tableChip(table)));
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(nums);
    card.appendChild(swatch);
    card.appendChild(body);
    attachDrop(card, null);
    list.appendChild(card);
  }
}

function sectionCard(section) {
  const card = document.createElement("article");
  card.className = "section" + (state.highlight === section.name ? " is-hot" : "");
  card.dataset.server = section.name;
  const swatch = document.createElement("div");
  swatch.className = "swatch";
  swatch.style.setProperty("--swatch", section.color);
  const body = document.createElement("div");
  const title = document.createElement("div");
  title.className = "section-name";
  title.textContent = section.name;
  const meta = document.createElement("div");
  meta.className = "section-meta";
  const role = document.createElement("span");
  role.className = "badge";
  role.textContent = section.role || "—";
  meta.appendChild(role);
  const tier = document.createElement("select");
  tier.className = "tier-mini";
  tier.setAttribute("aria-label", "Tier for " + section.name);
  ["A", "B", "C"].forEach((level) => {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    tier.appendChild(option);
  });
  tier.value = state.tiers[section.name] || section.tier || "B";
  tier.addEventListener("click", (event) => event.stopPropagation());
  tier.addEventListener("change", () => {
    state.tiers[section.name] = tier.value;
    saveTiers();
    toast("Tier saved. Re-run auto to give them a matching section.");
  });
  meta.appendChild(tier);
  const count = document.createElement("span");
  count.textContent = section.areaText + " · " + section.count + (section.count === 1 ? " table" : " tables");
  meta.appendChild(count);
  if (section.status === "unknown") {
    const flag = document.createElement("span");
    flag.className = "flag";
    flag.textContent = "Availability unknown";
    meta.appendChild(flag);
  }
  if (section.status === "off") {
    const flag = document.createElement("span");
    flag.className = "flag";
    flag.textContent = "Off this shift";
    meta.appendChild(flag);
  }
  if (section.tables.length > 1 && !section.contiguous) {
    const flag = document.createElement("span");
    flag.className = "split";
    flag.textContent = "Split across the room";
    meta.appendChild(flag);
  }
  const nums = document.createElement("p");
  nums.className = "section-tables";
  if (!section.tables.length) nums.textContent = "No tables yet. Drop one here.";
  section.tables.forEach((table) => nums.appendChild(tableChip(table)));
  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(nums);
  card.appendChild(swatch);
  card.appendChild(body);
  card.addEventListener("click", () => {
    state.highlight = state.highlight === section.name ? null : section.name;
    renderChart();
  });
  attachDrop(card, section.name);
  return card;
}

function tableChip(table) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip-btn";
  button.textContent = displayNum(table);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openTable(table);
  });
  return button;
}

function attachDrop(card, serverName) {
  card.addEventListener("dragover", (event) => {
    event.preventDefault();
    card.classList.add("is-drop");
  });
  card.addEventListener("dragleave", () => card.classList.remove("is-drop"));
  card.addEventListener("drop", (event) => {
    event.preventDefault();
    card.classList.remove("is-drop");
    const id = event.dataTransfer.getData("text/plain");
    moveTable(id, serverName);
  });
}

function openTable(table) {
  if (table.zone === "bar" && !state.includeBar) {
    toast("Bar seats stay with the bar. Turn on Include bar seats to assign them.");
    return;
  }
  state.activeTable = table.id;
  state.highlight = state.assignments[table.id] || state.highlight;
  $("sheet-title").textContent = (table.zone === "bar" ? "Bar seat " : "Table ") + table.label;
  const list = $("sheet-list");
  list.textContent = "";
  const counts = {};
  Object.keys(state.assignments).forEach((id) => {
    const name = state.assignments[id];
    counts[name] = (counts[name] || 0) + 1;
  });
  const names = Array.from(state.selected).sort((a, b) => lastKey(a).localeCompare(lastKey(b)));
  names.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "move-btn" + (state.assignments[table.id] === name ? " is-current" : "");
    const left = document.createElement("span");
    left.textContent = name;
    const right = document.createElement("span");
    right.textContent = (counts[name] || 0) + " tables";
    button.appendChild(left);
    button.appendChild(right);
    button.addEventListener("click", () => moveTable(table.id, name));
    list.appendChild(button);
  });
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "move-btn";
  clear.textContent = "Leave unassigned";
  clear.addEventListener("click", () => moveTable(table.id, null));
  list.appendChild(clear);
  $("sheet").hidden = false;
  renderMap(
    groupSections(
      Array.from(state.selected),
      state.assignments,
      state.tables,
      state.includeBar,
      state.adj,
      peopleMap(),
      state.day,
      state.shift
    )
  );
}

function closeSheet() {
  $("sheet").hidden = true;
  state.activeTable = null;
}

function moveTable(id, serverName) {
  const table = state.tables.find((item) => item.id === id);
  if (!table) return;
  if (table.zone === "bar" && !state.includeBar) {
    toast("Bar seats stay with the bar. Turn on Include bar seats to assign them.");
    return;
  }
  if (state.assignments[id] === serverName || (!serverName && !state.assignments[id])) {
    closeSheet();
    renderChart();
    return;
  }
  pushUndo();
  if (serverName) state.assignments[id] = serverName;
  else delete state.assignments[id];
  state.manual = true;
  closeSheet();
  renderChart();
  saveChart();
}

function runAuto() {
  const result = buildFloor({
    tables: state.tables,
    servers: selectedServers(),
    day: state.day,
    shift: state.shift,
    includeBar: state.includeBar,
    adj: state.adj,
    aspect: state.aspect,
  });
  if (result.error) {
    toast(result.error);
    return false;
  }
  state.assignments = result.assignments;
  state.colors = result.colors;
  state.notes = result.notes;
  state.manual = false;
  state.highlight = null;
  closeSheet();
  renderChart();
  saveChart();
  return true;
}

function applySaved(saved) {
  state.day = saved.day || state.day;
  state.shift = saved.shift || state.shift;
  state.includeBar = !!saved.includeBar;
  state.manual = !!saved.manual;
  state.selected = new Set(saved.selected || []);
  state.assignments = saved.assignments || {};
  state.colors = saved.colors || {};
  state.notes = saved.notes || [];
  state.history = [];
  renderDays();
  renderShiftMeta();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clipText(value, max) {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}

function saveImage() {
  const mapW = 1000;
  const mapH = Math.round(mapW * state.aspect);
  const headerH = 86;
  const rowH = 78;
  const cols = 2;
  const blocks = state.view.slice();
  const rows = Math.max(1, Math.ceil(blocks.length / cols));
  const canvas = document.createElement("canvas");
  canvas.width = mapW;
  canvas.height = headerH + mapH + 36 + rows * rowH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6f3ec";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0A1A33";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("Local Lime Leawood", 28, 38);
  ctx.font = "600 20px sans-serif";
  ctx.fillText($("chart-heading").textContent + " · floor chart", 28, 68);

  const innerX = 16;
  const innerY = headerH;
  const innerW = mapW - 32;
  const innerH = mapH - 16;
  ctx.strokeStyle = "#d5d0c6";
  ctx.strokeRect(innerX, innerY, innerW, innerH);
  const X = (x) => innerX + (x / 100) * innerW;
  const Y = (y) => innerY + (y / 100) * innerH;

  state.tables.forEach((table) => {
    const off = table.zone === "bar" && !state.includeBar;
    const who = state.assignments[table.id];
    const color = !off && who && state.colors[who] ? state.colors[who] : "#b7b1a6";
    ctx.fillStyle = off ? "#e6e1d6" : who ? tint(color) : "#f4f0e6";
    ctx.strokeStyle = off ? "#b7b1a6" : color;
    ctx.lineWidth = table.zone === "bar" ? 1.5 : 3;
    const x = X(table.x);
    const y = Y(table.y);
    const w = table.zone === "bar" ? 18 : 34;
    const h = table.zone === "bar" ? 18 : 28;
    if (table.kind === "diamond") {
      ctx.beginPath();
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + h / 2);
      ctx.lineTo(x - w / 2, y);
      ctx.closePath();
    } else if (table.zone === "bar") {
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
    } else {
      roundRect(ctx, x - w / 2, y - h / 2, w, h, table.kind === "booth" ? 8 : 4);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#102033";
    ctx.font = table.zone === "bar" ? "700 8px sans-serif" : "700 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(table.label, x, y);
  });

  let top = innerY + innerH + 28;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0A1A33";
  ctx.font = "700 20px sans-serif";
  ctx.fillText("Sections", 28, top);
  top += 12;
  blocks.forEach((section, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 28 + col * (mapW / 2 - 10);
    const y = top + row * rowH;
    ctx.fillStyle = section.color || "#999";
    ctx.fillRect(x, y + 10, 8, 52);
    ctx.fillStyle = "#0A1A33";
    ctx.font = "700 16px sans-serif";
    ctx.fillText(section.name, x + 16, y + 28);
    ctx.font = "600 13px sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText(section.areaText + " · " + section.count + " tables", x + 16, y + 48);
    const nums = section.tables.map(displayNum).join(", ");
    ctx.font = "700 13px sans-serif";
    ctx.fillText(clipText(nums || "—", 46), x + 16, y + 68);
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "LLL-" + state.day + "-" + state.shift + ".png";
  link.click();
}

function bind() {
  $("code-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = $("code-input").value.trim();
    const error = $("code-error");
    if (value === QUIZ_CODE) {
      error.hidden = false;
      error.textContent = "That’s the team quiz code. The floor chart has its own manager code.";
      return;
    }
    if (value !== MANAGER_CODE) {
      error.hidden = false;
      error.textContent = "That code doesn’t unlock the floor chart.";
      return;
    }
    error.hidden = true;
    sessionStorage.setItem(AUTH_KEY, "1");
    $("code-input").value = "";
    show("shift");
    renderShiftMeta();
  });

  $("lock-btn").addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    closeSheet();
    show("unlock");
  });

  $("shift-am").addEventListener("click", () => {
    state.shift = "AM";
    renderDays();
    renderShiftMeta();
  });
  $("shift-pm").addEventListener("click", () => {
    state.shift = "PM";
    renderDays();
    renderShiftMeta();
  });

  $("continue-btn").addEventListener("click", () => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (draft && draft.day === state.day && draft.shift === state.shift && state.selected.size === 0) {
        state.selected = new Set(draft.selected || []);
      }
    } catch (error) {
      /* ignore a bad draft */
    }
    show("roster");
    renderRoster();
  });

  $("resume-btn").addEventListener("click", () => {
    const saved = loadChart();
    if (!saved) return;
    applySaved(saved);
    show("chart");
    renderChart();
  });

  $("back-to-shift").addEventListener("click", () => {
    show("shift");
    renderShiftMeta();
  });
  $("back-to-roster").addEventListener("click", () => {
    closeSheet();
    show("roster");
    renderRoster();
  });

  $("roster-filter").addEventListener("input", renderRoster);
  $("auto-pick").addEventListener("click", () => {
    const picked = autoPick(state.servers, state.day, state.shift, 15);
    state.selected = new Set(picked.map((server) => server.name));
    saveDraft();
    renderRoster();
    const unknown = picked.filter((server) => availabilityStatus(server, state.day, state.shift) === "unknown").length;
    if (picked.length < 15) {
      toast("Only " + picked.length + " people can work this shift, so all of them are selected.");
    } else if (unknown) {
      toast("Picked 15, including " + unknown + " with unknown availability.");
    } else {
      toast("Picked 15. Servers first, then bar-servers.");
    }
  });
  $("clear-picks").addEventListener("click", () => {
    state.selected = new Set();
    saveDraft();
    renderRoster();
  });
  $("build-btn").addEventListener("click", () => {
    if (!state.selected.size) {
      toast("Pick the servers who are working, or use Auto-pick 15.");
      return;
    }
    if (runAuto()) show("chart");
  });

  $("include-bar").addEventListener("change", () => {
    if (!state.selected.size) {
      state.includeBar = $("include-bar").checked;
      return;
    }
    pushUndo();
    state.includeBar = $("include-bar").checked;
    if (!runAuto()) {
      const prior = state.history.pop();
      if (prior) {
        state.includeBar = prior.includeBar;
        $("include-bar").checked = prior.includeBar;
      }
    }
  });
  $("rerun-btn").addEventListener("click", () => {
    pushUndo();
    if (!runAuto()) state.history.pop();
  });
  $("undo-btn").addEventListener("click", () => {
    const prior = state.history.pop();
    if (!prior) return;
    state.assignments = prior.assignments;
    state.colors = prior.colors;
    state.manual = prior.manual;
    state.includeBar = prior.includeBar;
    state.notes = prior.notes;
    $("include-bar").checked = state.includeBar;
    renderChart();
    saveChart();
  });
  $("zoom-btn").addEventListener("click", () => {
    const scroll = $("map-scroll");
    const on = !scroll.classList.contains("zoomed");
    scroll.classList.toggle("zoomed", on);
    $("zoom-btn").setAttribute("aria-pressed", on ? "true" : "false");
    $("zoom-btn").textContent = on ? "Fit map" : "Larger map";
  });
  $("print-btn").addEventListener("click", () => window.print());
  $("image-btn").addEventListener("click", saveImage);
  $("sheet-close").addEventListener("click", () => {
    closeSheet();
    renderChart();
  });
  $("sheet-scrim").addEventListener("click", () => {
    closeSheet();
    renderChart();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("sheet").hidden) {
      closeSheet();
      renderChart();
    }
  });
}

function boot() {
  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  state.day = today;
  state.shift = new Date().getHours() < 16 ? "AM" : "PM";
  Promise.all([fetch("servers.json").then((res) => res.json()), fetch("tables.json").then((res) => res.json())])
    .then((docs) => {
      state.servers = docs[0].servers || [];
      state.tables = docs[1].tables || [];
      state.aspect = docs[1].mapAspect || 1.95;
      state.adj = buildAdj(state.tables, state.aspect);
      state.tiers = loadTiers();
      $("floor-map").style.aspectRatio = "100 / " + Math.round(state.aspect * 100);
      const counts = { patio: 0, dining: 0, bar: 0 };
      state.tables.forEach((table) => {
        counts[table.zone] = (counts[table.zone] || 0) + 1;
      });
      bind();
      renderDays();
      renderShiftMeta();
      if (counts.patio !== 13 || counts.dining !== 38 || counts.bar !== 21 || state.servers.length !== 40) {
        toast("Roster or table file doesn’t match the room. Expected 40 servers, 13 patio, 38 dining, 21 bar.");
      }
      if (sessionStorage.getItem(AUTH_KEY) === "1") {
        const saved = loadChart();
        if (saved && saved.assignments && Object.keys(saved.assignments).length) {
          applySaved(saved);
          show("chart");
          renderChart();
        } else {
          show("shift");
        }
      } else {
        show("unlock");
      }
    })
    .catch(() => {
      show("loading");
      $("screen-loading").hidden = true;
      const error = $("load-error");
      error.hidden = false;
      error.textContent =
        "Couldn’t load servers.json or tables.json. Open this folder through a static server or GitHub Pages, not as a loose file.";
    });
}

if (typeof document !== "undefined") boot();

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MANAGER_CODE: MANAGER_CODE,
    autoPick: autoPick,
    availabilityStatus: availabilityStatus,
    buildAdj: buildAdj,
    buildFloor: buildFloor,
    groupSections: groupSections,
    isContiguous: isContiguous,
  };
}
