define(["require", "exports", "tslib", "esri/Map", "esri/views/MapView", "esri/widgets/Expand", "esri/widgets/Sketch/SketchViewModel", "esri/layers/GraphicsLayer", "esri/Graphic", "esri/geometry/Point", "esri/symbols/TextSymbol"], function (require, exports, tslib_1, Map_1, MapView_1, Expand_1, SketchViewModel_1, GraphicsLayer_1, Graphic_1, Point_1, TextSymbol_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Map_1 = tslib_1.__importDefault(Map_1);
    MapView_1 = tslib_1.__importDefault(MapView_1);
    Expand_1 = tslib_1.__importDefault(Expand_1);
    SketchViewModel_1 = tslib_1.__importDefault(SketchViewModel_1);
    GraphicsLayer_1 = tslib_1.__importDefault(GraphicsLayer_1);
    Graphic_1 = tslib_1.__importDefault(Graphic_1);
    Point_1 = tslib_1.__importDefault(Point_1);
    TextSymbol_1 = tslib_1.__importDefault(TextSymbol_1);
    // ui elements
    const drawPolylineBtn = document.getElementById("polylineBtn");
    const drawPolygonBtn = document.getElementById("polygonBtn");
    const drawTextBtn = document.getElementById("textBtn");
    const textInput = document.getElementById("textInput");
    // ui elements
    const graphicsLayer = new GraphicsLayer_1.default();
    let sketchViewModel = null;
    const textSymbol = {
        type: "text",
        color: "green",
        text: "Edit me",
        font: {
            // autocasts as new Font()
            size: 12,
            family: "Playfair Display",
            weight: "bold",
        }
    };
    const point = new Point_1.default({
        x: -11842480.337507106,
        y: 4114900.65000741,
        spatialReference: { wkid: 102100 },
    });
    const textGraphic = new Graphic_1.default({
        geometry: point,
        symbol: textSymbol
    });
    graphicsLayer.add(textGraphic);
    const map = new Map_1.default({
        basemap: "gray-vector",
        layers: [graphicsLayer]
    });
    const view = new MapView_1.default({
        map: map,
        container: "viewDiv",
        center: [-106.38281089067543, 34.63878113390207],
        zoom: 4,
    });
    sketchViewModel = new SketchViewModel_1.default({
        view: view,
        layer: graphicsLayer
    });
    var expand = new Expand_1.default({
        view: view,
        content: document.getElementById("textInputDiv"),
        expanded: false
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
    view.when(() => {
        sketchViewModel.on('update', (evt) => {
            let currentGraphic = evt.graphics[0];
            if (currentGraphic.geometry.type === "point") {
                // open the expand to view the text input
                expand.expand();
                // once the update completes, update the text with the
                // current text in the input element
                let currentText = textInput.nodeValue;
                if (evt.state === "complete") {
                    currentGraphic.symbol = new TextSymbol_1.default({
                        //text: textSymbol.text,
                        text: textInput.value,
                        font: {
                            // autocasts as new Font()
                            size: 12,
                            family: "Playfair Display",
                            weight: "bold",
                        },
                        color: "green"
                    });
                }
                // autopopulate the textInput with the selected
                // graphics's symbol text
                if (evt.state === "start") {
                    if (currentGraphic.symbol.type === "text") {
                        // must cast as Text Symbol to access the text value
                        let textSymb = currentGraphic.symbol;
                        textInput.value = textSymb.text;
                    }
                }
            }
        });
        sketchViewModel.on('create', (evt) => {
            sketchViewModel.update(evt.graphic, {});
        });
        view.ui.add(expand, "top-left");
    });
    //textInput.addEventListener("input", updateValue);
    textInput.addEventListener("keyup", completeTextEdit);
    // function updateValue (e: any): void {
    //   //textSymbol.text = e.target.value;
    // }
    function completeTextEdit(evt) {
        if (evt.defaultPrevented) {
            return;
        }
        ;
        if (evt.key !== undefined) {
            if (evt.key === "Enter") {
                evt.preventDefault();
                sketchViewModel.complete();
            }
        }
    }
});
//# sourceMappingURL=main.js.map