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
    #imageData32bit

    constructor(width, height) {
        if (
            isNaN(width) ||
            isNaN(height)
        ){
            throw new Error("This interface supports only numeric 'width' and 'height' as arguments.");
        }

        this.setPaletteData([[0, 0, 0, 0]]);
        this.#underlyingImageData = new ImageData(width, height);
        this.#imageData32bit = new Uint32Array(this.#underlyingImageData.data.buffer).fill(this.#palette[0]);
    }

    // Replaces the current palette with a new palette. The new palette should be an array
    // containing 8-bit (0-255) RGBA quadruplet arrays; e.g. [[255, 0, 0, 255], [0, 255, 0, 255]]
    // for a palette of red and green (the alpha component is optional and will default to
    // 255 if not given).
    setPaletteData(newPalette) {
        if (!Array.isArray(newPalette)) {
            throw new Error("The palette must be an array.");
        }

        if (newPalette.length < 1) {
            throw new Error("A palette must consist of at least one color.");
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

    // Returns as an array the palette index of each pixel in this image (as per the
    // currently-active palette), where each element in the returned array corresponds
    // to a pixel at that element position in the image.
    //
    // Unlike the data() getter, which returns 32-bit encoded color data, the array
    // returned by this function represents the image's underlying palette indices,
    // which are in the range [0, palette.length).
    //
    // For pixels whose color data is not found in the currently-active palette, the
    // index 0 will be used.
    getIndexData() {
        if (!(this.#underlyingImageData instanceof ImageData)) {
            throw new Error("Internal error: expected an instance of ImageData.");
        }

        const indexData = new Array(this.#underlyingImageData.width * this.#underlyingImageData.height);

        for (let i = 0; i < indexData.length; i++) {
            indexData[i] = Math.max(0, this.#palette.indexOf(this.#imageData32bit[i]));
        }

        return indexData;
    }

    // Returns as a Uint32Array a 32-bit encoding of the 8-bit RGBA color values passed to
    // setPaletteData(), where each element corresponds to each original RGBA/8888 quadruplet.
    get palette() {
        return this.#palette;
    }

    // Returns as a Uint32Array the image's current pixel buffer, in which each element
    // represents an RGBA/8888 color value encoded (shifted) into a 32-bit unsigned integer
    // in little-endian order.
    //
    // NOTE: This array doesn't hold raw palette indices (in the range [0, palette.length))
    // but instead the actual color values from an index in the palette. To get the underlying
    // palette indices, call getIndexData().
    //
    // To write pixel data into the buffer, do it something like this:
    //
    //   const image = new IndexedImageData(...);
    //   image.setPaletteData(...);
    //   ...
    //   // Write the 6th color in the palette into the first pixel.
    //   image.data[0] = image.palette[5];
    //
    get data() {
        return this.#imageData32bit;
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
            isNaN(this.#height) ||
            (this.#height < 1) ||
            (this.#width < 1)
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
