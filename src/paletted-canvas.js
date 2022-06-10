/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: Paletted canvas
 * 
 */

// Provides an ImageData-like interface for storing paletted image data.
class IndexedImageData {
    palette
    #width
    #height
    #data

    constructor(data, width, height, palette) {
        this.#width = width;
        this.#height = height;
        this.#data = data;
        this.palette = palette || [
            [0, 0, 0],
            [255, 255, 255]
        ];
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
            throw new Error(`Only the "2d" context type is supported on a paletted canvas.`);
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
            const palette = image.palette;
            const pixelBuffer32bit = new Uint32Array(this.#canvasImage.data.buffer);

            for (let i = 0; i < (image.width * image.height); i++) {
                const color = palette[image.data[i] % palette.length];

                // ABGR (for little-endian systems).
                pixelBuffer32bit[i] = ((255 << 24) | (color[2] << 16) | (color[1] << 8) | color[0]);
            }
        }

        this.#canvasContext.putImageData(this.#canvasImage, 0, 0);
    }
};

customElements.define("paletted-canvas", PalettedCanvas, {extends: "canvas"});
