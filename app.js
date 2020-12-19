var app = new Vue({
    el: '#app',
    mounted: function(){
	console.log('foo');
    },
    router: (new VueRouter({
	routes: [
	    { path: '/',         redirect: '/hist' },
	    { path: '/hist',  component: httpVueLoader('components/hist.vue') },
	]})),
    data: {
	screen: {}
    }
})
