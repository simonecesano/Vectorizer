class Kernels {
    constructor(){
	var gpu = new GPU(...arguments);
	gpu.addFunction(function rgbToHsl(rgb) {
	    const r = rgb[0]; const g = rgb[1]; const b = rgb[2];
	    
	    const maxv = Math.max(Math.max(r, g), b);
	    const minv = Math.min(Math.min(r, g), b);
	    
	    
	    let h = 0;
	    let s = 0;
	    let l = (maxv + minv) / 2;
	    
	    if (maxv == minv) {
	    	h = s = 0; // achromatic
	    } else {
	    	let d = maxv - minv;
	    	s = l > 0.5 ? d / (2 - maxv - minv) : d / (maxv + minv);
			
		if (maxv == r) {
			    h = (g - b) / d + (g < b ? 6 : 0); 
		} else if (maxv == g) {
		    h = (b - r) / d + 2; 
		} else if (maxv == g) {
		    h = (r - g) / d + 4; 
		}
	    	h = h / 6;
	    }
	    return [ h, s, l ];
	}, { argumentTypes: { rgb: 'Array(4)'}, returnType: 'Array(3)' });
	
	
	gpu.addFunction(function rgbToLab(rgb){
	    let r = rgb[0]; let g = rgb[1]; let b = rgb[2];
	    
	    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
	    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
	    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
	    
	    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
	    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
	    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
	    
	    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
	    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
	    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
	    
	    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
	}, { argumentTypes: { rgb: 'Array(4)'}, returnType: 'Array(3)' })
	
	gpu.addFunction(function deltaE(labA, labB){
	    const deltaL = labA[0] - labB[0];
	    const deltaA = labA[1] - labB[1];
	    const deltaB = labA[2] - labB[2];
	    const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
	    const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
	    const deltaC = c1 - c2;
	    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
	    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
	    const sc = 1.0 + 0.045 * c1;
	    const sh = 1.0 + 0.015 * c1;
	    const deltaLKlsl = deltaL / (1.0);
	    const deltaCkcsc = deltaC / (sc);
	    const deltaHkhsh = deltaH / (sh);
	    const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
	    return i < 0 ? 0 : Math.sqrt(i);
	})

	gpu.addFunction(function euclDistance(labA, labB){
	    const r = Math.sqrt(
		Math.pow(labA[0] - labB[0], 2) + Math.pow(labA[1] - labB[1], 2) + Math.pow(labA[2] - labB[2], 2)
	    );
	    return r / 255
	}, { argumentTypes: { labA: 'Array(3)'}, labB: 'Array(3)', returnType: 'Float' })

	
	this.gpu = gpu;
    }

    get grayScale(){
	return this.gpu.createKernel(function(image) {
	    const pixel = image[this.thread.y][this.thread.x];
	    const grey = ((0.3 * pixel[0]) + (0.59 * pixel[1]) + (0.11 * pixel[2]));
	    this.color(grey, grey, grey);
	}).setGraphical(true)
    }

    get threshold() {
	return this.gpu.createKernel(function(image, threshold) {
	    const pixel = image[this.thread.y][this.thread.x];
	    const grey = ((0.3 * pixel[0]) + (0.59 * pixel[1]) + (0.11 * pixel[2]));

	    if (((0.3 * pixel[0]) + (0.59 * pixel[1]) + (0.11 * pixel[2])) < threshold) {
		this.color(0, 0, 0);
	    } else {
		this.color(255, 255, 255);
	    }
	}).setGraphical(true)
    }

    get rgbToLab(){
	return this.gpu.createKernel(function(image) {
	    const rgb = image[this.thread.y][this.thread.x];
	    const lab = rgbToLab(rgb);
	    this.color(lab[0], lab[1], lab[2]);
	}).setGraphical(true)
    }

    get isolateColor(){
	return this.gpu.createKernel(function(image, r, g, b, maxDist) {
	    const color = image[this.thread.y][this.thread.x];
	    const lab   = rgbToLab(color);
	    const ref   = rgbToLab([ r, g, b, 0 ]);
	    const dist  = euclDistance([color[0], color[1], color[2]], [r, g, b]);
	    this.color(dist, dist, dist)
	}).setGraphical(true)
    }
}
