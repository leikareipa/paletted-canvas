# Integration test: reference vs. paletted

In this simple integration test, two images are rendered side by side, one in a regular canvas using 32-bit color, and the other in a paletted canvas using indexed color. Some performance metrics are also printed into the browser's developer console.

## Usage

1. Host the main repo on a server (e.g. on localhost).
1. From the repo's root, browse to the test's [index.html](./index.html) file (so that relative paths in the file are expanded correctly).
1. Once the page has loaded, compare the rendered images by eye (e.g. to see if there are any obvious abnormalities), and view the performance data in the developer console.

The test relies on you having prior knowledge - from having run it in a known good configuration - about how the images should look, so that you can spot problems.

In most cases, the reference image will probably render correctly, and bugs will show up in the paletted rendering, if anywhere.
