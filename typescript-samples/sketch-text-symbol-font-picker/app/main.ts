import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import Expand from "esri/widgets/Expand";
import SketchViewModel from "esri/widgets/Sketch/SketchViewModel";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Graphic from "esri/Graphic";
import Point from "esri/geometry/Point";
import TextSymbol from "esri/symbols/TextSymbol";

// ui elements
const textInput: HTMLInputElement = document.getElementById(
  "textInput"
) as HTMLInputElement;
const colorPicker: any = document.getElementById("color-picker");
const updateBtn: HTMLButtonElement = document.getElementById("updateBtn") as HTMLButtonElement;
const sizeInput: HTMLInputElement = document.getElementById("fontSizeInput") as HTMLInputElement;
const weightInput: any = document.getElementById("weightInput");
const styleInput: any = document.getElementById("styleInput");
const familyInput: HTMLInputElement = document.getElementById("familyInput") as HTMLInputElement;
// ui elements

const graphicsLayer = new GraphicsLayer();
let sketchViewModel: SketchViewModel = null;
let currentColor: string = "";
let currentFont: any = {
  weight: "",
  style: ""
};

const textSymbol = {
  type: "text", // autocasts as new TextSymbol()
  color: "green",
  text: "Edit me",
  font: {
    // autocasts as new Font()
    size: 12,
    family: "Playfair Display",
    weight: "bold",
    style: "italic"
  },
};

const textSymbol2 = {
  type: "text", // autocasts as new TextSymbol()
  color: "#B53C19",
  text: "Click here to edit",
  font: {
    // autocasts as new Font()
    size: 14,
    family: "Arial",
    weight: "normal",
    style: "normal",
  },
};

const point = new Point({
  x: -11842480.337507106,
  y: 4114900.65000741,
  spatialReference: { wkid: 102100 },
});

const point2 = new Point({
  x: -11742480.337507106,
  y: 4434900.65000741,
  spatialReference: { wkid: 102100 },
});

const textGraphic = new Graphic({
  geometry: point,
  symbol: textSymbol,
});

const textGraphic2 = new Graphic({
  geometry: point2,
  symbol: textSymbol2,
});

graphicsLayer.addMany([textGraphic, textGraphic2]);

const map = new EsriMap({
  basemap: "gray-vector",
  layers: [graphicsLayer],
});

const view = new MapView({
  map: map,
  container: "viewDiv",
  center: [-106.38281089067543, 34.63878113390207],
  zoom: 4,
});

sketchViewModel = new SketchViewModel({
  view: view,
  layer: graphicsLayer,
});

const expand = new Expand({
  view: view,
  content: document.getElementById("stylePicker"),
  expanded: false,
});


updateBtn.addEventListener('click', updateSymbol);

view.when(() => {
  sketchViewModel.on("update", (evt) => {
    let currentGraphic = evt.graphics[0];
    let currentSymbol = evt.graphics[0].symbol as TextSymbol;
    colorPicker.value = currentSymbol.color.toHex();
    
    //weightInput.selectedOption.value = currentSymbol.font.weight;
    //styleInput.selectedOption.value = currentSymbol.font.style;
    
    if(evt.state === "active" && evt.tool === "move") {
      // don't want the picker to show while moving the graphic on the map
      return;
    }
    if (currentGraphic.geometry.type === "point") {
      // open the expand to view the text input
      expand.expand();

      // once the update completes, update the text with the
      // current text in the input element
      if (evt.state === "complete") {
        if(textInput.value.length > 0) {
          currentGraphic.symbol = new TextSymbol({
            //text: textSymbol.text,
            text: textInput.value,
            font: {
              // autocasts as new Font()
              size: sizeInput.value,
              family: familyInput.value,
              weight:
                currentFont.weight.length > 0
                  ? currentFont.weight
                  : currentSymbol.font.weight, // if the default current font is empty set the selected graphics
              style:
                currentFont.style.length > 0
                  ? currentFont.style
                  : currentSymbol.font.style,
            },
            color: currentColor,
          });

          // disable update button
          disableUpdateBtn();

          // close the expand as well
          expand.collapse();
        }
        
      }

      // autopopulate the textInput with the selected
      // graphics's symbol text
      if (evt.state === "start") {
        if (currentGraphic.symbol.type === "text") {
          // must cast as Text Symbol to access the text value
          let textSymb = currentGraphic.symbol as TextSymbol;
          textInput.value = textSymb.text;

          // also the size, weight, style
          sizeInput.value = textSymb.font.size.toString();
          //weightInput.selectedOption.value = textSymb.font.weight;
          //styleInput.selectedOption.value = textSymb.font.style;
          familyInput.value = textSymb.font.family;
        }
      }
    }
  });

  sketchViewModel.on("create", (evt) => {
    sketchViewModel.update(evt.graphic, {});
  });

  view.ui.add(expand, "top-left");
});

textInput.addEventListener("input", enableUpdateBtn);
textInput.addEventListener("keyup", completeTextEdit);
sizeInput.addEventListener("input", enableUpdateBtn);
//weightInput.addEventListener('input', enableUpdateBtn);
//styleInput.addEventListener('input', enableUpdateBtn);
familyInput.addEventListener('input', enableUpdateBtn);

colorPicker.addEventListener("calciteColorChange", (evt: any) => {
  if (
    sketchViewModel.state === "active" &&
    sketchViewModel.updateGraphics.getItemAt(0).geometry.type === "point"
  ) {
    // a point graphic is being updated, so allow symbol to be updated
    currentColor = evt.target.value;

    // activate update button
    enableUpdateBtn();
  }
});

weightInput.addEventListener('calciteSelectChange', function() {
  currentFont.weight = weightInput.selectedOption.value;
  enableUpdateBtn();
});

styleInput.addEventListener('calciteSelectChange', function() {
  currentFont.style = styleInput.selectedOption.value;
  enableUpdateBtn();
});

function completeTextEdit(evt: KeyboardEvent): void {
  if (evt.defaultPrevented) {
    return;
  }

  if (evt.key !== undefined) {
    if (evt.key === "Enter") {
      evt.preventDefault();
      sketchViewModel.complete();
    }
  }
}

function updateSymbol() {
  const graphic = sketchViewModel.updateGraphics.getItemAt(0); 
  if (
    sketchViewModel.state === "active" &&
    graphic.geometry.type === "point"
  ) {
    sketchViewModel.complete();
    disableUpdateBtn();
  }

}

function enableUpdateBtn() {
  if (
    sketchViewModel.state === "active" &&
    sketchViewModel.updateGraphics.getItemAt(0).geometry.type === "point") {
      // activate update button
      updateBtn.classList.remove("esri-button--disabled");
      updateBtn.disabled = false;
  }
}

function disableUpdateBtn() {
  if (updateBtn.classList.contains("esri-button--disabled")) {
    return;
  }
  updateBtn.classList.add("esri-button--disabled");
  updateBtn.disabled = true;
}

