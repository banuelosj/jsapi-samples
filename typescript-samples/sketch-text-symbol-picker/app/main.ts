import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import Expand from "esri/widgets/Expand";
import SketchViewModel from "esri/widgets/Sketch/SketchViewModel";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Graphic from "esri/Graphic";
import Point from "esri/geometry/Point";
import TextSymbol from "esri/symbols/TextSymbol";

// ui elements
const drawPolylineBtn = document.getElementById("polylineBtn");
const drawPolygonBtn = document.getElementById("polygonBtn");
const drawTextBtn = document.getElementById("textBtn");
const textInput: HTMLInputElement = document.getElementById(
  "textInput"
) as HTMLInputElement;
const colorPicker: any = document.getElementById("color-picker");
const updateBtn: HTMLButtonElement = document.getElementById("updateBtn") as HTMLButtonElement;
// ui elements

const graphicsLayer = new GraphicsLayer();
let sketchViewModel: SketchViewModel = null;
let currentColor: string = "";

const textSymbol = {
  type: "text", // autocasts as new TextSymbol()
  color: "green",
  text: "Edit me",
  font: {
    // autocasts as new Font()
    size: 12,
    family: "Playfair Display",
    weight: "bold",
  },
};

const point = new Point({
  x: -11842480.337507106,
  y: 4114900.65000741,
  spatialReference: { wkid: 102100 },
});

const textGraphic = new Graphic({
  geometry: point,
  symbol: textSymbol,
});

graphicsLayer.add(textGraphic);

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

drawPolylineBtn.onclick = function () {
  sketchViewModel.create("polyline");
};

drawPolygonBtn.onclick = function () {
  sketchViewModel.create("polygon");
};

drawTextBtn.onclick = function () {
  sketchViewModel.create("point");
};

colorPicker.addEventListener("calciteColorPickerChange", (evt: any) => {
  if (
    sketchViewModel.state === "active" &&
    sketchViewModel.updateGraphics.getItemAt(0).geometry.type === "point"
  ) {
    // a point graphic is being updated, so allow symbol to be updated
    currentColor = evt.target.value;

    // activate update button
    updateBtn.classList.remove("esri-button--disabled");
    updateBtn.disabled = false;
  }
});

updateBtn.addEventListener('click', updateSymbol);

view.when(() => {
  sketchViewModel.on("update", (evt) => {
    let currentGraphic = evt.graphics[0];
    let currentSymbol = evt.graphics[0].symbol as TextSymbol;
    colorPicker.value = currentSymbol.color.toHex();

    if(evt.state === "active" && evt.tool === "move") {
      // don't want the picker to show while moving the graphic on the map
      return;
    }
    if (currentGraphic.geometry.type === "point") {
      // open the expand to view the text input
      expand.expand();
      
      if (evt.state === "complete") {
        currentGraphic.symbol = new TextSymbol({
          //text: textSymbol.text,
          text: textInput.value,
          font: {
            // autocasts as new Font()
            size: 12,
            family: "Playfair Display",
            weight: "bold",
          },
          //color: "green",
          color: currentColor,
        });

        // disable update button
        updateBtn.classList.add("esri-button--disabled");
        updateBtn.disabled = true;
        
        // close the expand as well
        expand.collapse();
      }

      // autopopulate the textInput with the selected
      // graphics's symbol text
      if (evt.state === "start") {
        if (currentGraphic.symbol.type === "text") {
          // must cast as Text Symbol to access the text value
          let textSymb = currentGraphic.symbol as TextSymbol;
          textInput.value = textSymb.text;
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
  // complete the symbol update
  if(sketchViewModel.state === "active" &&
    sketchViewModel.updateGraphics.getItemAt(0).geometry.type === "point") {
      sketchViewModel.complete();
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