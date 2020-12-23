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

.swatch { width:32px; height:32px; margin: 4 12 4 12; display: block; border: thin solid white }
.swatch.exclude {
     background: 
         linear-gradient(to top left,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,0) calc(50% - 0.8px),
             rgba(0,0,0,1) 50%,
             rgba(0,0,0,0) calc(50% + 0.8px),
             rgba(0,0,0,0) 100%),
         linear-gradient(to top right,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,0) calc(50% - 0.8px),
             rgba(0,0,0,1) 50%,
             rgba(0,0,0,0) calc(50% + 0.8px),
             rgba(0,0,0,0) 100%);
}

td { padding: 3px }
td.nr { text-align: right }
</style>
<template>
  <div ref="appspace">
    <div style="display:inline-block;vertical-align:top;margin:0;padding:0;position:relative;width:66%;padding-bottom:12px">
      <div
	v-on:drop.prevent="dropHandler" v-on:dragover.prevent="dragOverHandler" 
	ref="inputDiv">
	<canvas v-on:drop.prevent="dropHandler" ref="input" id="input"></canvas>
      </div>
    <div v-if="width">{{ width }}x{{ height }} {{ colorCount }} colors</div>
      <div class="range">
	<label for="scale">Distance</label>
	<input type="range" id="maxDistance" v-model="maxDistance" min="8" max="2048" step="1" />
	<span>{{ maxDistance }}</span>
	<label for="frequencyFactor">Frequency</label>
	<input type="range" v-model="frequencyFactor" v-bind:min="1" v-bind:max="20" step="1"  />
	<span>{{ frequencyFactor }}</span>
	<input type="checkbox" id="scales" name="scales" v-model="unfiltered">
	<label for="scales">direct filtering</label>
      </div>
      <button class="favorite styled" @click="analyseColors()" type="button">analyse</button>
      <button class="favorite styled" @click="vectorize()" type="button">vectorize</button>
      <div v-if="progress" class="progressbar" :style="`width: ${scale * width * progress / 100}px`">&nbsp;</div>
    </div>
    <div style="display:inline-block;vertical-align:top;margin:0;padding:0;position:relative;width:30%">
      <table v-if="lookup">
	<thead>
	  <tr>
	    <td colspan="2"></td>
	    <td>hex</td>
	    <td>pixels</td>
	    <td>alt</td>
	    <td>%</td>
	  </tr>
	</thead>
	<tbody>
	  <tr v-for="(hex, i) in colors">
	    <td class="nr">{{ i }}</td>
	    <td><div :key="tick"
		  @click="toggleExclude(hex)"
		  :style="'background-color:' + hex"
		  :class="lookup[hex].exclude ? [ 'swatch', 'exclude' ] : 'swatch'"
	     >&nbsp;</div></td>
	    <td class="hex">{{ hex }}</td>
	    <td class="nr">{{ lookup[hex].count }}</td>
	    <td class="nr">{{ lookup[hex].alt.length }}</td>
	    <td class="nr">{{ Math.round(lookup[hex].count / pixelCount * 10000) / 100 }}</td>
	  </tr>
	</tbody>
      </table>
    </div>
    <div style="display:inline-block;vertical-align:top;margin:0;padding:0;position:relative;width:66%;">
      <div ref="output" id="output">
      </div>
      <div>
	<button v-if="svg" class="favorite styled" @click="saveVector()" type="button">save vector</button>
      </div>
    </div>
    <div style="display:inline-block;vertical-align:top;margin:0;padding:0;position:relative;width:30%">
      <table v-if="outputColors">
	<thead>
	  <tr>
	    <td colspan="2"></td>
	    <td>hex</td>
	    <td>pixels</td>
	    <td>alt</td>
	    <td>%</td>
	  </tr>
	</thead>
	<tbody>
	  <tr v-for="(hex, i) in outputColors">
	    <td class="nr">{{ i }}</td>
	    <td><div
		  :class="'swatch'"
		  :key="tick" :style="'background-color:' + hex"
	     >&nbsp;</div></td>
	    <td class="hex">{{ hex }}</td>
	  </tr>
	</tbody>
      </table>
    </div>

    
  </div>
</template>
<script>
    var histogram = function(d){
	var h = new Uint32Array(256 * 256 * 256);
	var f = new Float32Array(256 * 256 * 256);
	
	var s = d.length;

	var t = 0;
	for (let i = 0; i < d.length; i += 4) {
	    var c = d[i] * 65536 + d[i+1] * 256 + d[i+2];
	    h[c]++;
	}
	for (let j = 0; j < 256 * 256 * 256; j++) {
	    f[j] = h[j]/s
	    t = h[j] > 0 ? t + 1 : t;
	}
	return { total: t, count: h, frequency: f }
    }

module.exports = {
    data: function () {
	return {
	    pixelCount: 1,
	    maxDistance: 256,
	    frequencyFactor: 10,
	    lookup: undefined,
	    tick: (new Date()).getTime(),
	    svg: undefined,

	    progress: undefined,
	    
	    width: undefined,
	    height: undefined,
	    scale: 1,
	    unfiltered: false,
	    outputColors: undefined,
	    colorCount: undefined,
	};
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
    },
    destroyed: function(){
    },
    beforeCreate: function(){
    },
    watch: {
	maxDistance: function(v){
	    // console.log(v);
	},
	unfiltered: function(v){
	    console.log(v);
	}
    },
    methods: {
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

	    var canvas = c.$refs.input;
	    var ctxs   = [
		c.$refs.input.getContext('2d'),
	    ];

	    c.bounding_box = c.$refs.inputDiv.getBoundingClientRect()
	    c.outputColors = undefined;
	    
	    var img = new Image;
	    img.onload = function() {
		var width = Math.min(img.width, (c.bounding_box.width ) - 128); 
		var scale = width / img.width;

		c.width  = img.width;
		c.height = img.height;
		c.scale  = scale;
		
		canvas.width = width;
		canvas.height = img.height * scale;

		c.pixelCount = canvas.width * canvas.height;
		
		ctxs.forEach((ctx, i) => {
		    ctx.clearRect(0, 0, canvas.width, canvas.height);
		    if (i < 2) { ctx.scale(scale, scale) }

		    ctx.drawImage(img, 0, 0);
		    ctx.setTransform(1, 0, 0, 1, 0, 0);
		})

		var ctx = ctxs[0]
		var imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
		var d = histogram(imgData.data);
		c.colorCount = d.total;
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
	analyseColors: function(){
	    var c = this;
	    c.lookup = false;
	    c.progress = 1;
	    

	    var canvas = this.$refs.input;
	    var ctx = canvas.getContext('2d');
	    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)

	    var h = histogram(imgData.data)
	    c.colorCount = h.total;

	    var w = new Worker('colorWorker.js');
	    w.postMessage({ time: (new Date).getTime(), hist: h, maxDistance: c.maxDistance, frequencyFactor: c.frequencyFactor, unfiltered: c.unfiltered });

	    w.onmessage = function(e){
		if (e.data.lookup) {
		    var lookup = e.data.lookup;
		    c.colors = Object.keys(lookup).sort((a, b) => { return lookup[b].count - lookup[a].count });
		    c.lookup = lookup;
		    c.progress = 0;
		} else if (e.data.progress) {
		    c.progress = e.data.progress;
		}
	    }
	},
	vectorize: function(){
	    var c = this;
	    if (c.lookup) {
		console.log(c.lookup);
		var palette = Object.keys(c.lookup).filter(k => !(c.lookup[k].exclude));

		var canvas = this.$refs.input;
		var ctx = canvas.getContext('2d');
		var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		
		c.svg = '';
		c.$refs.output.innerHTML = '';
		
		var t = new Worker('tracerWorker.js');
		t.postMessage({ pixels: imgData.data, width: canvas.width, height: canvas.height, palette: palette })
		t.onmessage = function(e){
		    c.svg = e.data.svg;
		    c.$refs.output.innerHTML = e.data.svg;
		    c.outputColors = [...new Set(Array.from(c.$refs.output.querySelectorAll('path, rect, circle, line, polygon, polyline')).map(e => e.getAttribute('fill'))) ];
		}
	    }
	},
	clearSVG: function(){
	    var c = this;
	    c.svg = "";
	    c.$refs.output.innerHTML = "";
	    c.outputColors = undefined;
	},
	saveVector: function(){
	    var c = this;
	    console.log(c.$refs.output.innerHTML)
	    if (true) {
		var file = new Blob([c.$refs.output.innerHTML], {type: "image/svg+xml"});
		var a = document.createElement("a");
		var url = URL.createObjectURL(file);
		
		a.href = url;
		a.download = 'vectorized.svg';
		document.body.appendChild(a);
		a.click();
		setTimeout(function() { document.body.removeChild(a); window.URL.revokeObjectURL(url) }, 0);
	    }
	}
    },
}
</script>
