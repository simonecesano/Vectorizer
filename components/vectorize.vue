<style scoped>
.styled {
    border: 0;
    line-height: 2;
    padding: 0 20px;
    font-size: 1rem;
    text-align: center;
    color: #fff;
    border-radius: 0px;
    background-color: rgba(220, 0, 0, 1);
}

.styled:hover {
    background-color: rgba(255, 0, 0, 1);
}

.styled:active {
    box-shadow: inset -2px -2px 3px rgba(255, 255, 255, .6),
                inset 2px 2px 3px rgba(0, 0, 0, .6);
}

div {
    margin: 0em;
}
#items li { list-style-type: none; }

input[type=range] { margin-top: 0px }


input[type=range][orient=vertical]
{
    writing-mode: bt-lr; /* IE */
    -webkit-appearance: slider-vertical; /* WebKit */
    width: 8px;
    height: 175px;
    padding: 0 5px;
}

#input, #output {
    position: relative;
    display:inline-block;
    top: 0px; left: 0px;
    margin:0; padding:0;
}

#dots, #grid {
    position: absolute;
    top: 0; left: 0;
}

.dot { fill:#ef2929;stroke:#ef2929;stroke-width:0.264999;stop-color:#000000 }
.dot.selected { fill: #0000cd }

div.range { display: table-cell; vertical-align: middle; height: 50px }
div.range label { vertical-align:middle }
div.range input { vertical-align:middle }

div.progressbar { height: 24px; background-color: CornflowerBlue; margin: 6px }

div.canvas { display: inline-block }
</style>
<template>
  <div ref="appspace">
    <div class="canvas">
      <canvas
	v-on:drop.prevent="dropHandler" v-on:dragover.prevent="dragOverHandler"
	style="display:block;background:grey;" ref="input" id="input" height="600" width="600" style="width:600px"></canvas>
    </div>
    <div class="canvas">
      <canvas style="display:block;background:grey;" ref="output" id="output" height="600" width="600" style="width:600px"></canvas>
    </div>
    <div class="range">
      <label for="threshold">threshold</label>
      <input type="range" id="threshold" v-model="threshold" min="0" max="442" step="1" />
    </div>
    <div style="padding-bottom:12px">
      <label for="refColor">Color</label>
      <input type="text" id="refColor" name="refColor" v-model="refColor" >
      <label for="threshold">Threshold</label>
      <input type="text" id="threshold" name="threshold" v-model="threshold" >
    </div>
    <div style="padding-bottom:12px">
      <button class="favorite styled" @click="calcDistance()" type="button">show distance</button>
      <button class="favorite styled" @click="vectorize()" type="button">vectorize</button>
    </div>
    <insideout></insideout>
  </div>
</template>
<script>
module.exports = {
    data: function () {
	return {
	    imageData: undefined,
	    fragSource: undefined,
	    refColor: '#ffff00',
	    threshold: 172,
	    draw: function(){},
	    gl: undefined,
	    kernel: undefined,
	};
    },
    components: {
	insideout: httpVueLoader('components/fileUtils.vue'),
    },
    computed: {
    },
    mounted: function(){
	var c = this;

	c.bounding_box = c.$refs.appspace.getBoundingClientRect()
	
	var canvas = c.$refs.input;
	canvas.width = 960;
	canvas.height = 320;

	var ctx = canvas.getContext("2d");
	ctx.fillStyle = "LightSlateGray";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	c.loadImage('101042ab.jpg')
    },
    destroyed: function(){
    },
    beforeCreate: function(){
    },
    watch: {
	threshold: function(v){
	    this.draw()
	},
	refColor: function(){
	    this.draw()
	}
    },
    methods: {
	copyCanvas: function(){
	    var c = this;
	    var gl = this.$refs.output.getContext("webgl2", { preserveDrawingBuffer: true });
	    this.$refs.input.getContext("2d").drawImage(gl.canvas, 0, 0);
	},
	calcDistance: function(){

	},
	vectorize: function(){
	    var c = this;
	    var gl = this.$refs.output.getContext("webgl2", { preserveDrawingBuffer: true });
	    var pixels;
	    var t = new Worker('tracerWorker.js');

	    if (true) {
		var flipped = document.createElement('canvas');
		flipped.width = gl.drawingBufferWidth;
		flipped.height = gl.drawingBufferHeight;
		flipped.getContext("2d").drawImage(gl.canvas, 0, 0);
		pixels = flipped.getContext("2d").getImageData(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		console.log(pixels.map);
		t.postMessage({ pixels: pixels.data, width: gl.canvas.width, height: gl.canvas.height })
	    }

	    if (false) {
		pixels = new Uint8ClampedArray(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
		gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
		t.postMessage({ pixels: pixels, width: gl.canvas.width, height: gl.canvas.height })
	    }
	    
	    // remove canvas

	    t.onmessage = function(e){
		c.svg = e.data.svg;

		const svgNS = 'http://www.w3.org/2000/svg';

		const domparser = new DOMParser()
		const doc = domparser.parseFromString(c.svg, "image/svg+xml")

		var g = doc.createElementNS(svgNS, 'g');

		g.style.fill = "orange";

		Array.from(doc.querySelectorAll('path, rect, circle'))
		    .forEach(e => {
			var c = e.parentElement.removeChild(e);
			if(chroma(c.getAttribute('fill')).hex().match(/ffffff/i)) {
			} else {
			    c.removeAttribute('fill');
			    c.removeAttribute('stroke');
			    c.setAttribute('fill', 'orange');
			    g.append(c);
			}
		    })

		console.log(doc.querySelector('svg').getBoundingClientRect())
		doc.querySelector('svg').append(g);
		console.log(doc);

		var serializer = new XMLSerializer();
		c.saveThing(serializer.serializeToString(doc), 'image/svg+xml', 'paper.svg');
	    }
	},
	loadImage: function(src){
	    var c = this;

	    var canvasIn  = c.$refs.input;
	    var canvasOut = c.$refs.output;

	    // ------------------------------------------------------------
	    // this is important:
	    // preserveDrawingBuffer must be true
	    // in order to be possible to copy the output canvas
	    // ------------------------------------------------------------
	    var gl = canvasOut.getContext("webgl2", { preserveDrawingBuffer: true });
	    var kernels = new Kernels({ canvas: canvasOut, context: gl, mode: 'gpu' })

	    c.gl = gl;
	    
	    var img = new Image;
	    img.onload = function() {
		console.log(this);
		var r = img;

		canvasIn.style.width = "900px"
		canvasOut.style.width = "900px"
		
		canvasIn.width  = r.width;
		canvasIn.height = r.height;
		
		canvasOut.width  = r.width;
		canvasOut.height = r.height;
		
		var ctx = canvasIn.getContext("2d");
		ctx.drawImage(r, 0, 0);
		
		var imgData = ctx.getImageData(0, 0, canvasIn.width, canvasIn.height)
		const render = kernels.isolateColor.setOutput([imgData.width, imgData.height]);
		c.kernel = render;
		c.draw = function () {
		    var rgb
		    try {
			rgb = chroma(c.refColor).rgb();
		    } catch(e) {
			console.log(e);
		    }
		    if (rgb) {
			c.kernel(imgData, ...rgb, c.threshold)
		    }
		}
		console.time('draw')
		c.draw();
		console.timeEnd('draw')
		c.fragSource = gl.getShaderSource(render.fragShader)
	    }
	    img.src = src;
	},
	dropHandler: function(e){
	    var c = this;
	    this.handleFileDrop(e, /image.+/, function(file){
		console.log(file.name, file.type);
		c.fileName = file.name;
		c.loadImage(URL.createObjectURL(file));
	    })
	},
	dragOverHandler: function(e){
	    e.preventDefault();
	},
	clear: function(){
	    this.points = [];
	},
	clearSVG: function(){
	    var c = this;
	    c.svg = "";
	    c.$refs.output.innerHTML = "";
	    c.outputColors = undefined;
	},
    },
}
</script>
