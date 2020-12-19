importScripts('ktree.js', 'colorCounter.js');

var OctTree = ktree.Octree;

onmessage = function(e) {
    var d = (new Date).getTime(); 

    var a = new Array(256 * 256 * 256);

    var h = e.data.hist.count;
    var f = e.data.hist.frequency;

    var maxDistance     = e.data.maxDistance;
    var frequencyFactor = e.data.frequencyFactor;
    var unfiltered      = e.data.unfiltered;
    
    for (var k = 0; k < 256 * 256 * 256; k++) { a[k] = k;  }

    var colorCount = a.filter(k => k > 0).length;
    
    const intToLAB = (new ColorCounter()).intToLAB;

    var memo = {};
    
    const tree = new ktree.Octree([], {
	key: 'hex',
	transform: function(c) {
	    if (memo[c.hex]) {
	    	return memo[c.hex]
	    } else {
		var lab = intToLAB(parseInt(c.hex.replace(/^#/, ''), 16));
		memo[c.hex] = lab;
		return memo[c.hex]
	    }
	}
    });


    var b = a.filter(a => f[a] > 0)

    var p = {};
    var lookup = {};

    b.map(c => '#' + c.toString(16).padStart(6, '0'))
    	.forEach((c, i) => {
    	    var closest = tree.closest({ hex: c });
	    var colorInt = parseInt(c.replace(/^#/, ''), 16)
	    
	    var d = unfiltered ? 
		maxDistance :
		-(maxDistance / 100) * frequencyFactor * Math.log(f[i])

    	    if (closest && closest.d2 < d) {
    		lookup[closest.hex].alt.push(c);
		lookup[closest.hex].count += h[colorInt];
    	    } else {
    	    	tree.add({ hex: c })
    		lookup[c] = { alt: [], count: h[colorInt] }
    	    }
    	    if ((i % 1000) == 0) {
    		// console.log('tree', tree)	    
		this.postMessage({ progress: Math.round(i / b.length * 100) });
    	    }
    	})
    this.postMessage({ lookup: lookup });
}
