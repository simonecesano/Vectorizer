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

td { padding: 3px }
td.nr { text-align: right }
</style>
<template>
  <div ref="appspace">
    <div>
      <canvas style="display:block;background:grey;" ref="paper" id="paper" height="600" width="600" style="width:600px"></canvas>
    </div>
    <div class="range">
      <label for="threshold">threshold</label>
      <input type="range" id="threshold" v-model="threshold" min="0" max="255" step="1" />
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
    <div>
      <canvas style="display:block;background:grey;" ref="output" id="output" height="600" width="600" style="width:600px"></canvas>
    </div>
  </div>
</template>
<script>
module.exports = {
    data: function () {
	return {
	    imageData: undefined,
	    fragSource: undefined,
	    refColor: '#ffffff',
	    threshold: 128,
	    draw: function(){},
	    gl: undefined,
	    kernel: undefined,
	};
    },
    computed: {
    },
    mounted: function(){
	var c = this;

	c.bounding_box = c.$refs.appspace.getBoundingClientRect()
	
	var canvas = c.$refs.paper;
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
	calcDistance: function(){

	},
	vectorize: function(){
	    var gl = this.$refs.output.getContext("webgl2", { preserveDrawingBuffer: true });
	    var pixels = new Uint8ClampedArray(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
	    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	    console.log(pixels);
	    console.log(gl.canvas)
	    this.$refs.paper.getContext("2d").drawImage(gl.canvas, 0, 0)
	},
	calculateHistogram: function(d){
	    console.log(d);
	    
	    var h = new Uint32Array(256 * 256 * 256);
	    var f = new Float32Array(256 * 256 * 256);
	    
	    var s = d.data.length / 4;
	    
	    for (let i = 0; i < d.length; i += 4) {
		var c = d[i] * 65536 + d[i+1] * 256 + d[i+2];
		h[c]++;
	    }
	    var t = 0;
	    for (let j = 0; j < 256 * 256 * 256; j ++) {
		f[j] = h[j]/s
		
	    }
	    return { total: s, count: h, frequency: f }
	},
	toggleExclude: function(hex){
	    this.lookup[hex].exclude = !(this.lookup[hex].exclude);
	    this.tick = (new Date()).getTime();
	},
	loadImage: function(src){
	    var c = this;

	    var canvas    = c.$refs.paper;
	    var canvasOut = c.$refs.output;

	    // ------------------------------------------------------------
	    // this is important:
	    // preserveDrawingBuffer must be true
	    // in order to be possible to copy the output canvas
	    // ------------------------------------------------------------
	    var gl = canvasOut.getContext("webgl2", { preserveDrawingBuffer: true });
	    var kernels = new Kernels({ canvas: canvasOut, context: gl, mode: 'gpu' })

	    c.gl = gl;
	    
	    console.log(canvas);
	    
	    var img = new Image;
	    img.onload = function() {
		console.log(this);
		var r = img;

		canvas.style.width = "900px"
		canvasOut.style.width = "900px"
		
		canvas.width  = r.width;
		canvas.height = r.height;
		
		canvasOut.width  = r.width;
		canvasOut.height = r.height;
		
		var ctx = canvas.getContext("2d");
		ctx.drawImage(r, 0, 0);
		
		var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)

		console.time('distance');
		if (false) {
		    function euclDistance(labA, labB){
			const r = Math.sqrt(
			    Math.pow(labA[0] - labB[0], 2) + Math.pow(labA[1] - labB[1], 2) + Math.pow(labA[2] - labB[2], 2)
			);
			return r
		    }
		    var l = imgData.width * imgData.height * 4;
		    
		    var d = imgData.data
		    var o = new Uint8ClampedArray(l)
		    
		    for (var p = 0; p < l; p += 4) {
			var rgb = [ d[p], d[p+1], d[p+2] ];
			var dist = euclDistance(rgb, [255, 0, 0]);
			o[p] = o[p+1] = o[p+2] = dist;
			o[p+3] = 255;
		    }
		    
		    console.log(imgData.data, o);
		    
		    const imgOut = new ImageData(o, imgData.width, imgData.height);
		    console.log(imgOut);
		    
		    
		    // var gl = canvasOut.getContext("2d");
		    // gl.putImageData(imgOut, 0, 0)
		    
		    console.timeEnd('distance');
		}
		const render = kernels.isolateColor.setOutput([imgData.width, imgData.height]);
		c.kernel = render;
		

		c.draw = function () {
		    var rgb = chroma(c.refColor).rgb();
		    c.kernel(imgData, ...rgb, c.threshold)
		}
		console.time('draw')
		c.draw();
		console.timeEnd('draw')
		c.fragSource = gl.getShaderSource(render.fragShader)
				    
		// console.log('frag shader', kernels.gpu.kernels[0].compiledFragmentShader)
	    }
	    img.src = src;
	},
	dropHandler: function(e){
	    var c = this;
	    e.preventDefault();
	    if (e.dataTransfer.items) {
	    	for (var i = 0; i < 1; i++) {
	    	    if (e.dataTransfer.items[i].kind === 'file' && e.dataTransfer.items[i].type.match(/image.*/)) {
	    		var file = e.dataTransfer.items[i].getAsFile();
			c.fileName = file.name;
			c.loadImage(URL.createObjectURL(file));
			c.clearSVG();
			c.lookup = undefined;
		    } else {
			
		    }
	    	}
	    }
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
