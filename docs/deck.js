"use strict";

const slides = [...document.querySelectorAll(".slide")];
const byId = id => document.getElementById(id);
const sections = [...new Set(slides.map(slide => slide.dataset.section))];
const progress = byId("progress");
const previous = byId("previous");
const next = byId("next");
const notes = byId("notes");
const notesToggle = byId("notes-toggle");
const buildCounts = slides.map(slide => Math.max(0, ...[...slide.querySelectorAll("[data-build]")].map(item => Number(item.dataset.build))));
let index = 0;
let build = 0;

const sectionButtons = sections.map(section => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = section;
  button.addEventListener("click", () => show(slides.findIndex(slide => slide.dataset.section === section)));
  progress.append(button);
  return button;
});

function updateNotes() {
  const lines = slides[index].querySelector(".notes").content.textContent.trim().split(/\s*\[click\]\s*/);
  notes.replaceChildren();
  for (const line of lines.slice(0, build + 1)) {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    if (line !== lines[Math.min(build, lines.length - 1)]) paragraph.className = "context";
    notes.append(paragraph);
  }
}

function show(newIndex, newBuild = 0, record = true) {
  const nextIndex = Math.max(0, Math.min(slides.length - 1, newIndex));
  if (nextIndex !== index) {
    stopPlayback();
    window.scrollTo(0, 0);
  }
  index = nextIndex;
  build = Math.max(0, Math.min(buildCounts[index], newBuild));
  const active = slides[index];
  slides.forEach(slide => {
    slide.hidden = slide !== active;
    if (!slide.hidden) {
      for (const fragment of slide.querySelectorAll("[data-build]")) {
        const visible = Number(fragment.dataset.build) <= build;
        fragment.classList.toggle("shown", visible);
        fragment.inert = !visible;
      }
    }
  });

  for (const [position, section] of sections.entries()) {
    const button = sectionButtons[position];
    const start = slides.findIndex(slide => slide.dataset.section === section);
    const count = slides.filter(slide => slide.dataset.section === section).length;
    const fraction = Math.max(0, Math.min(1, (index - start + 1) / count));
    button.style.setProperty("--progress", (100 * fraction) + "%");
    if (active.dataset.section === section) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  }

  byId("counter").textContent = String(index + 1).padStart(2, "0") + " / " + slides.length;
  previous.disabled = index === 0 && build === 0;
  next.disabled = index === slides.length - 1 && build === buildCounts[index];
  updateNotes();
  const hash = "#" + (index + 1) + (build ? "." + build : "");
  if (record && location.hash !== hash) history.replaceState(null, "", hash);
}

function forward() {
  if (build < buildCounts[index]) show(index, build + 1);
  else if (index < slides.length - 1) show(index + 1);
}

function back() {
  if (build > 0) show(index, build - 1);
  else if (index > 0) show(index - 1, buildCounts[index - 1]);
}

function fromHash() {
  const match = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
  show(match ? Number(match[1]) - 1 : 0, match ? Number(match[2] || 0) : 0, false);
}

function toggleNotes() {
  notes.hidden = !notes.hidden;
  notesToggle.setAttribute("aria-pressed", String(!notes.hidden));
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
  } catch (error) {
    byId("fullscreen").title = "Fullscreen is unavailable in this browser";
  }
}

next.addEventListener("click", forward);
previous.addEventListener("click", back);
notesToggle.addEventListener("click", toggleNotes);
byId("fullscreen").addEventListener("click", toggleFullscreen);
window.addEventListener("hashchange", fromHash);
window.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.("input, textarea, select, [contenteditable]")) return;
  const key = event.key.toLowerCase();
  if ([" ", "enter"].includes(key) && event.target.closest?.("button, a")) return;
  const commands = {
    arrowright: forward, pagedown: forward, " ": forward, enter: forward,
    arrowleft: back, pageup: back, home: () => show(0), end: () => show(slides.length - 1),
    n: toggleNotes, f: toggleFullscreen,
  };
  if (commands[key]) {
    event.preventDefault();
    commands[key]();
  }
});

// Deterministic synthetic pixels. No satellite retrieval or model runs in this demo.
const rgbCanvas = byId("rgb");
const rgbContext = rgbCanvas.getContext("2d");
const maskContext = byId("mask").getContext("2d");
const width = rgbCanvas.width;
const height = rgbCanvas.height;
const scene = rgbContext.createImageData(width, height);
const mask = maskContext.createImageData(width, height);
const scores = new Int16Array(width * height);
let seed = 2947;

function gaussian(x, y, cx, cy, sx, sy) {
  return Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2) / 2);
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 4294967296 - .5) * 15;
    const plumeAxis = 95 + 16 * Math.sin(x / 59);
    const main = gaussian(x, y, 165, plumeAxis, 84, 17 + 5 * Math.sin(x / 55));
    const lobe = gaussian(x, y, 236, 123, 62, 18);
    const distractor = gaussian(x, y, 302, 44, 15, 11);
    const cloud = gaussian(x, y, 63, 56, 31, 14);
    const dust = Math.min(1, .84 * main + .44 * lobe);
    const pixel = y * width + x;
    const offset = 4 * pixel;
    scene.data[offset] = 49 + 176 * dust + 161 * distractor + 102 * cloud + noise;
    scene.data[offset + 1] = 82 + 15 * dust + 10 * distractor + 102 * cloud + .7 * noise;
    scene.data[offset + 2] = 88 + 89 * dust + 99 * distractor + 95 * cloud + noise;
    scene.data[offset + 3] = 255;
    scores[pixel] = Math.min(scene.data[offset], scene.data[offset + 2]) - scene.data[offset + 1];
  }
}
rgbContext.putImageData(scene, 0, 0);

function updateMask() {
  const threshold = Number(byId("threshold").value);
  // Use the deck’s slate-blue accent and paper background for the binary mask.
  const foreground = [54, 86, 108];
  const background = [250, 250, 247];
  let hits = 0;
  for (let pixel = 0; pixel < scores.length; pixel++) {
    const detected = scores[pixel] >= threshold;
    const offset = 4 * pixel;
    hits += Number(detected);
    const [red, green, blue] = detected ? foreground : background;
    mask.data[offset] = red;
    mask.data[offset + 1] = green;
    mask.data[offset + 2] = blue;
    mask.data[offset + 3] = 255;
  }
  maskContext.putImageData(mask, 0, 0);
  byId("threshold-value").value = threshold;
  byId("coverage").textContent = (100 * hits / scores.length).toFixed(1) + "% of image";
}
byId("threshold").addEventListener("input", updateMask);
updateMask();

// Simulated translation and deformation on a schematic map.
const time = byId("time");
const play = byId("play");
const lastFrame = Number(time.max);
let timer;

function footprint(frame) {
  const x = 436 - 21 * frame;
  const y = 143 + 29 * Math.sin(frame / 8);
  const points = Array.from({length: 44}, (_, position) => {
    const angle = position * Math.PI / 22;
    const shape = 1 + .14 * Math.sin(3 * angle + frame / 6) + .09 * Math.cos(5 * angle);
    return [
      x + (43 + 2.6 * frame) * shape * Math.cos(angle),
      y + (18 + .6 * frame) * shape * Math.sin(angle) + 7 * Math.cos(angle),
    ];
  });
  let crossSum = 0;
  let xSum = 0;
  let ySum = 0;
  points.forEach(([ax, ay], position) => {
    const [bx, by] = points[(position + 1) % points.length];
    const cross = ax * by - bx * ay;
    crossSum += cross;
    xSum += (ax + bx) * cross;
    ySum += (ay + by) * cross;
  });
  return {
    center: [xSum / (3 * crossSum), ySum / (3 * crossSum)],
    path: "M" + points.map(point => point.map(value => value.toFixed(1)).join(",")).join("L") + "Z",
  };
}

const footprints = Array.from({length: lastFrame + 1}, (_, frame) => footprint(frame));

function setFrame(frame) {
  time.value = frame;
  const current = footprints[frame];
  byId("plume").setAttribute("d", current.path);
  byId("previous-plume").setAttribute("d", frame ? footprints[frame - 1].path : "");
  byId("trail").setAttribute("points", footprints.slice(0, frame + 1).map(item => item.center.join(",")).join(" "));
  byId("centroid").setAttribute("cx", current.center[0]);
  byId("centroid").setAttribute("cy", current.center[1]);
  byId("frame").value = String(frame + 1).padStart(2, "0") + " / " + (lastFrame + 1);
  byId("movement").textContent = frame ? "The centroid moves west as the footprint changes shape." : "Start of the simulated sequence.";
}

function stopPlayback() {
  clearInterval(timer);
  timer = undefined;
  play.textContent = "Play";
}

time.addEventListener("input", () => {
  stopPlayback();
  setFrame(Number(time.value));
});

play.addEventListener("click", () => {
  if (timer) {
    stopPlayback();
    return;
  }
  if (Number(time.value) === lastFrame) setFrame(0);
  play.textContent = "Pause";
  timer = setInterval(() => {
    const frame = Number(time.value) + 1;
    setFrame(frame);
    if (frame === lastFrame) stopPlayback();
  }, 400);
});

setFrame(0);
fromHash();
