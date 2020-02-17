import Application from './Application.vue';
import './libs/filters';

new Vue({
  el: '#notifications-container',
  render: (createElement) => {
    return createElement(Application, {
      props: {
        assetRoot: $('#container').data('asset').replace(/\/\?_=[0-9]+/, '')
      }
    });
  }
});
