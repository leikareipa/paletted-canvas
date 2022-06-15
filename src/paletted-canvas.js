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
// A wrapper interface around ImageData for storing paletted image data.
class IndexedImageData {
    // The ImageData object that we're wrapping around.
    #underlyingImageData

    // The image's palette. Each element is a 32-bit unsigned integer containing the four
    // 8-bit values (in little-endian order) of an RGBA color.
    #palette

    // Corresponds to the 'data' attribute of an ImageData object. An array in which each
    // element is to be a 32-bit unsigned integer representing the bits of four 8-bit (RGBA)
    // color values (in little-endian order), which have been derived from the palette. So
    // effectively each element stores a palette index but the index value encodes the color
    // data at that palette index.
    #indexedData

    constructor(width, height) {
        if (
            isNaN(width) ||
            isNaN(height)
        ){
            throw new Error("This interface supports only numeric 'width' and 'height' as arguments.");
        }

        this.#underlyingImageData = new ImageData(width, height);
        this.#indexedData = new Uint32Array(this.#underlyingImageData.data.buffer);
        this.setPaletteData([[0, 0, 0, 0]]);
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

    // Returns as a Uint32Array a 32-bit encoding of the 8-bit RGBA color values passed to
    // setPaletteData(), where each element corresponds to each original RGBA quadruplet.
    get palette() {
        return this.#palette;
    }

    // Returns as a Uint32Array array the image's current pixel buffer, where each element
    // represents a value in the palette as returned from the 'palette' getter.
    //
    // To write new pixel data into this buffer, do it something like this:
    //
    //   const image = new IndexedImageData(...);
    //   image.setPaletteData(...);
    //   ...
    //   // Write the 6th color in the palette into the first pixel.
    //   image.data[0] = image.palette[5];
    //
    get data() {
        return this.#indexedData;
    }

    get underlyingImageData() {
        return this.#underlyingImageData;
    }

    get width() {
        return this.#underlyingImageData.width;
    }

    get height() {
        return this.#underlyingImageData.height;
    }

    get colorSpace() {
        return "indexed";
    }
};

// A wrapper interface around CanvasRenderingContext2D for manipulating the drawing surface
// of a <canvas> element using indexed colors.
class CanvasRenderingContextIndexed {
    #underlyingContext2D
    #width
    #height

    constructor(underlyingContext2D) {
        if (!(underlyingContext2D instanceof CanvasRenderingContext2D)) {
            throw new Error("Incompatible canvas element: expected an instance of HTMLCanvasElement.");
        }

        this.#underlyingContext2D = underlyingContext2D;
        this.#width = this.#underlyingContext2D.canvas.width;
        this.#height = this.#underlyingContext2D.canvas.height;

        if (
            isNaN(this.#width) ||
            isNaN(this.#height)
        ){
            throw new Error("Invalid context resolution.");
        }
    }
    
    createImageData(
        width = this.#width,
        height = this.#height
    )
    {
        if (width instanceof ImageData) {
            throw new Error("This interface supports only 'width' and 'height' as arguments.");
        }

        if (
            (width !== this.#width) ||
            (height !== this.#height)
        ){
            throw new Error("This interface can only create images whose resolution matches the size of the canvas.");
        }

        return new IndexedImageData(width, height);
    }

    putImageData(indexedImage) {
        if (!(indexedImage instanceof IndexedImageData)) {
            throw new Error("Only images of type IndexedImageData can be rendered.");
        }

        if (
            (indexedImage.width !== this.#width) ||
            (indexedImage.height !== this.#height)
        ){
            throw new Error("Mismatched image resolution: images must be the size of the canvas.");
        }

        this.#underlyingContext2D.putImageData(indexedImage.underlyingImageData, 0, 0);
    }
}

class HTMLPalettedCanvasElement extends HTMLCanvasElement {
    #underlyingContext
    #indexedRenderingContext

    constructor() {
        super();
    }
    
    static get observedAttributes() {
        return ["width", "height"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if ((oldValue != newValue) && ["width", "height"].includes(name)) {
            this.#underlyingContext = super.getContext("2d");
            this.#indexedRenderingContext = new CanvasRenderingContextIndexed(this.#underlyingContext);
        }
    }

    getContext(contextType = "2d") {
        if (contextType !== "2d") {
            throw new Error("This interface only supports the '2d' context type.");
        }

        return this.#indexedRenderingContext;
    }
};

window.IndexedImageData = IndexedImageData;
window.CanvasRenderingContextIndexed = CanvasRenderingContextIndexed;
window.HTMLPalettedCanvasElement = HTMLPalettedCanvasElement;
customElements.define("paletted-canvas", HTMLPalettedCanvasElement, {extends: "canvas"});
}
