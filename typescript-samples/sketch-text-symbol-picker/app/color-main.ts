import "@esri/calcite-components";

const calciteDiv = document.getElementById('calciteDiv')

const childDivString = `
  <calcite-button href="/">Home</calcite-button>
  <h1>Calcite Color Picker</h1>

  <h3 class="leader-1">Default</h3>
  <calcite-color></calcite-color>

  <h3 class="leader-1">Default (no color)</h3>
  <calcite-color allow-empty></calcite-color>

  <h3 class="leader-1">With initial color</h3>
  <calcite-color value="#beefee"></calcite-color>

  <h3 class="leader-1">Stores saved colors</h3>
  <calcite-color storage-id="demo"></calcite-color>

  <h3 class="leader-1">Scale s</h3>
  <calcite-color scale="s"></calcite-color>

  <h3 class="leader-1">Scale m</h3>
  <calcite-color scale="m"></calcite-color>

  <h3 class="leader-1">Scale l</h3>
  <calcite-color scale="l"></calcite-color>

  <h3 class="leader-1">Hidden sections (all)</h3>
  <calcite-color hide-hex hide-channels hide-saved></calcite-color>

  <h3 class="leader-1">Hidden sections (hex)</h3>
  <calcite-color hide-hex></calcite-color>

  <h3 class="leader-1">Hidden sections (channels)</h3>
  <calcite-color hide-channels></calcite-color>

  <h3 class="leader-1">Hidden sections (saved)</h3>
  <calcite-color hide-saved></calcite-color>

  <h3 class="leader-1">RTL</h3>
  <calcite-color dir="rtl"></calcite-color>

  <div class="demo-background-dark">
    <h3 class="leader-1">Dark theme</h3>

    <calcite-color theme="dark"></calcite-color>
  </div>
`;

function createElementFromHTML(htmlString: string): ChildNode {
  const template = document.createElement('template');
  htmlString = htmlString.trim(); // removing whitespace
  template.innerHTML = htmlString;
  return template.content.firstChild;
}

const node: Node = createElementFromHTML(childDivString);
calciteDiv.appendChild(node);