/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: Paletted canvas (https://github.com/leikareipa/paletted-canvas)
 * 
 * This is an early in-development version of a paletted <canvas>. Future versions will add
 * more documentation, fix bugs, etc.
 * 
 */

const isRunningInWebWorker = (typeof importScripts === "function");

if (!isRunningInWebWorker)
{
// Provides an ImageData-like interface for storing paletted image data.
class IndexedImageData {
    #palette
    #width
    #height
    #data

    constructor(data, width, height, palette) {
        if (!(data instanceof Uint32Array)) {
            throw new Error("The data must be a Uint8ClampedArray array.");
        }

        if (
            (typeof width !== "number") ||
            (typeof height !== "number")
        ){
            throw new Error("The width and height must be numbers.");
        }

        this.#width = width;
        this.#height = height;
        this.#data = data;
        this.setPaletteData(palette || [[0, 0, 0, 0]]);
    }
    
    // Replaces the current palette with a new palette. The new palette should be an array
    // containing 8-bit (0-255) RGBA quadruplet arrays; e.g. [[255, 0, 0, 255], [0, 255, 0, 255]]
    // for a palette of red and green (the alpha component is optional and will default to
    // 255 if not given).
    setPaletteData(newPalette) {
        if (!Array.isArray(newPalette)) {
            throw new Error("The palette must be an array.");
        }

        newPalette.forEach(color=>{
            color.length = 4;
            if (typeof color[3] === "undefined") {
                color[3] = 255;
            }
        });

        newPalette = newPalette.map(color=>Uint8ClampedArray.from(color));

        this.#palette = new Uint32Array(newPalette.map(color=>((color[3] << 24) | (color[2] << 16) | (color[1] << 8) | color[0])));
    }

    get palette() {
        return this.#palette;
    }

    get data() {
        return this.#data;
    }

    get width() {
        return this.#width;
    }

    get height() {
        return this.#height;
    }

    get colorSpace() {
        return "indexed";
    }
};

class HTMLPalettedCanvasElement extends HTMLCanvasElement {
    #canvasImage
    #canvasContext

    constructor() {
        super();
    }
    
    static get observedAttributes() {
        return ["width", "height"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if ((oldValue != newValue) && ["width", "height"].includes(name)) {
            this.#canvasContext = super.getContext("2d");
            this.#canvasImage = this.#canvasContext.createImageData(super.width, super.height);
        }
    }

    getContext(contextType = "2d") {
        if (contextType !== "2d") {
            throw new Error(`Only the "2d" context type is supported.`);
        }

        // Emulates the interface of CanvasRenderingContext2D.
        return {
            createImageData: this.#createImageData.bind(this),
            putImageData: this.#putImageData.bind(this),
        };
    }

    #createImageData() {
        if (!(this.#canvasImage instanceof ImageData)) {
            throw new Error("Expected the image data to have been initialized before calling createImageData().");
        }

        return new IndexedImageData(
            new Uint32Array(this.#canvasImage.data.buffer),
            super.width,
            super.height,
        );
    }

    #putImageData(image) {
        if (!(image instanceof IndexedImageData)) {
            throw new Error("Only images of type IndexedImageData can be rendered.");
        }

        if (
            !(this.#canvasImage instanceof ImageData) ||
            !(this.#canvasContext instanceof CanvasRenderingContext2D)
        ){
            throw new Error("Internal error: incomplete state initialization.");
        }

        this.#canvasContext.putImageData(this.#canvasImage, 0, 0);
    }
};

window.IndexedImageData = IndexedImageData;
window.HTMLPalettedCanvasElement = HTMLPalettedCanvasElement;
customElements.define("paletted-canvas", HTMLPalettedCanvasElement, {extends: "canvas"});
}
