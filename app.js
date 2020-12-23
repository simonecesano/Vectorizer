var app = new Vue({
    el: '#app',
    mounted: function(){
    },
    router: (new VueRouter({
	routes: [
	    { path: '/',      redirect: '/hist' },
	    { path: '/hist',  component: httpVueLoader('components/hist.vue') },
	    { path: '/gpu',   component: httpVueLoader('components/gpu.vue') },
	]})),
    data: {
	screen: {}
    }
})
