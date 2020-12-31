# Edit Text Symbol Graphics

This Typescript application was created to demonstrate how to edit `Graphics` with a `TextSymbol` using the ArcGIS API for JavaScript. This app utilized the `SketchViewModel` to allows users to add points, and add text for the `TextSymbol` by typing text into an [HTMLInputElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement).

A user can update existing text by selecting a `Graphic`. Once a graphic is selected, the `SketchViewModel` fires the `update` event, which updates the selected graphics text with the text entered in the input element.

<img src="sketch-text.gif" width="600"/>

## How to use the sample
1. Click on the `Graphic` on the `Map` to select the point graphic with a `TextSymbol`.
2. The `Expand` widget will open up with an `HTMLInputElement` to allow a user to type text.
3. Type some text into the input and hit `Enter` or `Return` on the keyboard.
4. This will call the `complete()` method from the `SketchViewModel` to complete the editing operation. The text for the `TextSymbol` of the graphic will update with the text in the inpu.
5. A user can also click on the text button on the top right div to add a new point onto the map.
6. Once a new point is added to the map, it will stay in `update` mode, so a user can type text into the input to add text to the new graphic and its `TextSymbol`.

## Getting Started

On the intitial download or clone of this repository run

### `npm install`

Installs all the package dependencies.

In the root project directory, you can run

### `tsc`

to compile the .ts files into .js files. Or run

### `tsc -w`

to compile and watch for any changes in the code.

## Deployment

The index.html file will be ready for deployment on a webserver, or just by double-clicking the file to launch from the local file directory.

## Built With

* [ArcGIS JavaScript API](https://developers.arcgis.com/javascript/) - Using the 4.18 JavaScript API
* [Semantic UI](https://semantic-ui.com) for the css of the ui components
* [TypeScript](https://www.typescriptlang.org/)

## Relevant API
* MapView
* SketchViewModel
* TextSymbol
* GraphicsLayer
* Graphic

## [Live Sample](https://banuelosj.github.io/jsapi-samples/typescript-samples/custom-sketch-with-text/)