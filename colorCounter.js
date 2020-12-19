var histogram = function(data){
    var h = new Uint32Array(256 * 256 * 256);
    
    for (let i = 0; i < data.length; i += 4) {
	var c = data[i] * 65536 + data[i+1] * 256 + data[i+2];
	h[c]++;
    }
    return h;
}

const LAB_CONSTANTS = {
    // Corresponds roughly to RGB brighter/darker
    Kn: 18,

    // D65 standard referent
    Xn: 0.950470,
    Yn: 1,
    Zn: 1.088830,

    t0: 0.137931034,  // 4 / 29
    t1: 0.206896552,  // 6 / 29
    t2: 0.12841855,   // 3 * t1 * t1
    t3: 0.008856452,  // t1 * t1 * t1
};



var intToRGB = function(intCol) {
    var r = (intCol >> 16) & 255;
    var g = (intCol >> 8)  & 255;
    var b =  intCol        & 255;
    return [ r, g, b ];
}

const intToLAB = (intCol) => {
    const [r,g,b] = intToRGB(intCol);
    const [x,y,z] = rgb2xyz(r,g,b);
    const l = 116 * y - 16;
    return [l < 0 ? 0 : l, 500 * (x - y), 200 * (y - z)];
}

const rgb_xyz = (r) => {
    if ((r /= 255) <= 0.04045) return r / 12.92;
    return Math.pow((r + 0.055) / 1.055, 2.4);
}

const xyz_lab = (t) => {
    if (t > LAB_CONSTANTS.t3) return Math.pow(t, 1 / 3);
    return t / LAB_CONSTANTS.t2 + LAB_CONSTANTS.t0;
}

const rgb2xyz = (r,g,b) => {
    r = rgb_xyz(r);
    g = rgb_xyz(g);
    b = rgb_xyz(b);
    const x = xyz_lab((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / LAB_CONSTANTS.Xn);
    const y = xyz_lab((0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / LAB_CONSTANTS.Yn);
    const z = xyz_lab((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / LAB_CONSTANTS.Zn);
    return [x,y,z];
}



const rgbToInt = function(r, g, b) {
    return 65536 * r + 256 * g + b;
}



const sphere = function(cx, cy, cz, rx, ry, rz) {
    var o = [];

    rz = ry = rx;
    
    for (var x = cx - rx; x <= cx + rx; x++) {
	for (var y = cy - ry; y <= cy + ry; y++) {
	    for (var z = cz - rz; z <= cz + rz; z++) {
		var d = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2) + Math.pow(z - cz, 2)); 
		if (d <= rx && x >= 0 && y >= 0 && z >= 0) {
		    o.push([x, y, z, d])
		}
	    } 
	} 
    }
    return o;
}

const collapse = function(h){
    var seen = new Uint32Array(256 * 256 * 256);
    
    var l = 256 * 256 * 256;
    for (var k = 0; k < l; k++) {
	if (h[k]) {
	    var rgb = intToRGB(k)
	    
	    var s = sphere(rgb[0], rgb[1], rgb[2], 10);
	    
	    if (seen[k]) {
		// do nothing
	    } else {
		// get similar colors
		// mark them as seen
		// collapse them
	    }
	}
    }
    
}

class ColorCounter {
    constructor(imgData) {
	if (imgData) { this.histogram = histogram(imgData) }
	this.intToLAB = intToLAB;
	this.intToRGB = intToRGB;
    }
}
