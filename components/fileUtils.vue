<style scoped>
</style>
<template>
  <div>nothing</div>
</template>
    <script>
module.exports = {
    data: function () {
	return {
	};
    },
    mounted: function(){
	console.log('mounted', this)
	Object.keys(this.$parent).forEach(k => console.log(k));

	this.$parent.saveThing = this.saveAsFile;
	this.$parent.handleFileDrop = this.handleFileDrop;
	this.$parent.handleFileDrag = this.handleFileDrag;
    },
    destroyed: function(){

    },
    methods: {
	saveAsFile: function(thing, mime, name){
	    var file = new Blob([thing], {type: mime});
	    var a = document.createElement("a");
	    var url = URL.createObjectURL(file);
	    a.href = url;
	    a.download = name
	    document.body.appendChild(a);
	    a.click();
	    setTimeout(function() { document.body.removeChild(a); window.URL.revokeObjectURL(url) }, 0);
	},
	handleFileDrag: function(){
	    e.preventDefault();
	},
	handleFileDrop: function(e, filter, callback, multiple){
	    var c = this;
	    e.preventDefault();
	    const stop = multiple ? e.dataTransfer.items.length : 1;
	    if (e.dataTransfer.items) {
	    	for (var i = 0; i < 1; i++) {
	    	    if (e.dataTransfer.items[i].kind === 'file' && e.dataTransfer.items[i].type.match(filter)) {
	    		var file = e.dataTransfer.items[i].getAsFile();
			callback(file);
		    }
	    	}
	    }
	}
    },
}
</script>
