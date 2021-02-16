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
    const textInput = document.getElementById("textInput");
    const colorPicker = document.getElementById("color-picker");
    const updateBtn = document.getElementById("updateBtn");
    const sizeInput = document.getElementById("fontSizeInput");
    const weightInput = document.getElementById("weightInput");
    const styleInput = document.getElementById("styleInput");
    const familyInput = document.getElementById("familyInput");
    // ui elements
    const graphicsLayer = new GraphicsLayer_1.default();
    let sketchViewModel = null;
    let currentColor = "";
    let currentFont = {
        weight: "",
        style: ""
    };
    const textSymbol = {
        type: "text",
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
        type: "text",
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
    const point = new Point_1.default({
        x: -11842480.337507106,
        y: 4114900.65000741,
        spatialReference: { wkid: 102100 },
    });
    const point2 = new Point_1.default({
        x: -11742480.337507106,
        y: 4434900.65000741,
        spatialReference: { wkid: 102100 },
    });
    const textGraphic = new Graphic_1.default({
        geometry: point,
        symbol: textSymbol,
    });
    const textGraphic2 = new Graphic_1.default({
        geometry: point2,
        symbol: textSymbol2,
    });
    graphicsLayer.addMany([textGraphic, textGraphic2]);
    const map = new Map_1.default({
        basemap: "gray-vector",
        layers: [graphicsLayer],
    });
    const view = new MapView_1.default({
        map: map,
        container: "viewDiv",
        center: [-106.38281089067543, 34.63878113390207],
        zoom: 4,
    });
    sketchViewModel = new SketchViewModel_1.default({
        view: view,
        layer: graphicsLayer,
    });
    const expand = new Expand_1.default({
        view: view,
        content: document.getElementById("stylePicker"),
        expanded: false,
    });
    updateBtn.addEventListener('click', updateSymbol);
    view.when(() => {
        sketchViewModel.on("update", (evt) => {
            let currentGraphic = evt.graphics[0];
            let currentSymbol = evt.graphics[0].symbol;
            colorPicker.value = currentSymbol.color.toHex();
            //weightInput.selectedOption.value = currentSymbol.font.weight;
            //styleInput.selectedOption.value = currentSymbol.font.style;
            if (evt.state === "active" && evt.tool === "move") {
                // don't want the picker to show while moving the graphic on the map
                return;
            }
            if (currentGraphic.geometry.type === "point") {
                // open the expand to view the text input
                expand.expand();
                // once the update completes, update the text with the
                // current text in the input element
                if (evt.state === "complete") {
                    if (textInput.value.length > 0) {
                        currentGraphic.symbol = new TextSymbol_1.default({
                            //text: textSymbol.text,
                            text: textInput.value,
                            font: {
                                // autocasts as new Font()
                                size: sizeInput.value,
                                family: familyInput.value,
                                weight: currentFont.weight.length > 0
                                    ? currentFont.weight
                                    : currentSymbol.font.weight,
                                style: currentFont.style.length > 0
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
                        let textSymb = currentGraphic.symbol;
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
    colorPicker.addEventListener("calciteColorChange", (evt) => {
        if (sketchViewModel.state === "active" &&
            sketchViewModel.updateGraphics.getItemAt(0).geometry.type === "point") {
            // a point graphic is being updated, so allow symbol to be updated
            currentColor = evt.target.value;
            // activate update button
            enableUpdateBtn();
        }
    });
    weightInput.addEventListener('calciteSelectChange', function () {
        currentFont.weight = weightInput.selectedOption.value;
        enableUpdateBtn();
    });
    styleInput.addEventListener('calciteSelectChange', function () {
        currentFont.style = styleInput.selectedOption.value;
        enableUpdateBtn();
    });
    function completeTextEdit(evt) {
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
        if (sketchViewModel.state === "active" &&
            graphic.geometry.type === "point") {
            sketchViewModel.complete();
            disableUpdateBtn();
        }
    }
    function enableUpdateBtn() {
        if (sketchViewModel.state === "active" &&
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
});
//# sourceMappingURL=main.js.map