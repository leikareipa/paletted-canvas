/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: Paletted canvas
 * 
 */

// Provides an ImageData-like interface for storing paletted image data.
class IndexedImageData {
    #palette
    #width
    #height
    #data

    constructor(data, width, height, palette) {
        // Validate input.
        {
            if (!(data instanceof Uint8ClampedArray)) {
                throw new Error("The data must be a Uint8ClampedArray array.");
            }

            if (
                (typeof width !== "number") ||
                (typeof height !== "number")
            ){
                throw new Error("The width and height must be numbers.");
            }

            if (
                (palette !== undefined) &&
                !Array.isArray(palette)
            ){
                throw new Error("The palette must be an array.");
            }
        }

        this.#palette = {
            // Each element is a triplet (RGB) of 8-bit values. E.g. [[255, 0, 0], [0, 255, 0]]
            // for a palette of red and green.
            byte: [],

            // Each element is a 32-bit value into which four (ABGR) 8-bit values have been
            // encoded, assuming little-endian order. E.g. [[4278190335], [4278255360]] for
            // a palette of red and green. Alpha is always 255.
            dWord: [],
        };
        this.#width = width;
        this.#height = height;
        this.#data = data;
        this.setPaletteData(palette || [[0, 0, 0]]);
    }

    // Replaces the current palette with a new palette. The new palette should be an array
    // containing 8-bit RGB triplet Uint8ClampedArray arrays; e.g. [[255, 0, 0], [0, 255, 0]]
    // for a palette of red and green.
    setPaletteData(newPalette) {
        if (
            !Array.isArray(newPalette) &&
            !newPalette.every(el=>el.length === 3) &&
            !newPalette.every(el=>el instanceof Uint8ClampedArray)
        ){
            throw new Error("All palette indices must be three-element Uint8ClampedArray arrays.");
        }

        this.#palette.byte = structuredClone(newPalette);
        this.#palette.dWord = new Uint32Array(newPalette.map(color=>((255 << 24) | (color[2] << 16) | (color[1] << 8) | color[0])));
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

class PalettedCanvas extends HTMLCanvasElement {
    #canvasImage
    #canvasContext

    constructor() {
        super();
    }

    getContext(contextType = "2d") {
        if (contextType !== "2d") {
            throw new Error(`Only the "2d" context type is supported.`);
        }

        this.#canvasContext = super.getContext("2d");
        this.#canvasImage = this.#canvasContext.getImageData(0, 0, super.width, super.height);

        // Emulates the interface of CanvasRenderingContext2D.
        return {
            createImageData: this.#createImageData.bind(this),
            putImageData: this.#putImageData.bind(this),
        };
    }

    #createImageData() {
        return new IndexedImageData(
            new Uint8ClampedArray(super.width * super.height),
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

        // Convert the paletted image into a 32-bit image on the canvas.
        {
            const palette = image.palette.dWord;
            const pixelBuffer32bit = new Uint32Array(this.#canvasImage.data.buffer);

            for (let i = 0; i < (image.width * image.height); i++) {
                pixelBuffer32bit[i] = palette[image.data[i]];
            }
        }

        this.#canvasContext.putImageData(this.#canvasImage, 0, 0);
    }
};

customElements.define("paletted-canvas", PalettedCanvas, {extends: "canvas"});
