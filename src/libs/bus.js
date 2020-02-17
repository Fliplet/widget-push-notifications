// This bus can be used like a VueComponent
// and it simulates the Node EventEmitter
// bus.$emit bus.$on bus.$off
const bus = new Vue();

bus.callbacks = {};

export default bus;
