// checkbox for cleanup
// highlight color

importScripts("/imagetracer_v1.2.5.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.1.0/chroma.min.js");

// https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray
// https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels

onmessage = function(e) {
    var imageData = new ImageData(Uint8ClampedArray.from(e.data.pixels), e.data.width, e.data.height);

    var opts = { scale: 1 };
    console.log(e.data.palette);
    
    var pal = e.data.palette
	.map(c => {
	    var rgb = chroma(c).rgb();
	    return {r: rgb[0], g: rgb[1], b: rgb[2], a: 255 }
	})
    

    
    if (e.data.palette && e.data.palette.length) { opts.pal = pal }
    opts.colorsampling = 0;
    
    console.time('tracing');
    var svgstr = ImageTracer.imagedataToSVG( imageData, opts );
    console.timeEnd('tracing');
    // console.log(svgstr);
    
    this.postMessage({ svg: svgstr, width: e.data.width, height: e.data.height });
}

