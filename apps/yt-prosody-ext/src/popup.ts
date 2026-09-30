import { LAYERS, PRESET_NAMES, loadSettings, presetLayers, saveSettings, type LayerKey, type Settings } from "./settings";

const enabled = document.getElementById("enabled") as HTMLInputElement;
const presets = document.getElementById("presets")!;
const layersBox = document.getElementById("layers")!;
let state: Settings;

const boxes = new Map<LayerKey, HTMLInputElement>();
const buttons = new Map<string, HTMLButtonElement>();

for (const name of PRESET_NAMES) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = name;
  b.addEventListener("click", () => {
    state.layers = presetLayers(name);
    sync();
  });
  buttons.set(name, b);
  presets.append(b);
}
for (const [key, label] of LAYERS) {
  const l = document.createElement("label");
  const c = document.createElement("input");
  c.type = "checkbox";
  c.addEventListener("change", () => {
    state.layers[key] = c.checked;
    sync();
  });
  boxes.set(key, c);
  l.append(c, label);
  layersBox.append(l);
}
enabled.addEventListener("change", () => {
  state.enabled = enabled.checked;
  sync();
});

function paint(): void {
  enabled.checked = state.enabled;
  for (const [k, c] of boxes) c.checked = state.layers[k];
  for (const [name, b] of buttons) {
    const p = presetLayers(name);
    b.setAttribute("aria-pressed", String(LAYERS.every(([k]) => p[k] === state.layers[k])));
  }
}
function sync(): void {
  paint();
  void saveSettings(state);
}

void loadSettings().then((s) => {
  state = s;
  paint();
});
