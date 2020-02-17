<template>
  <div class="notifications-container">
    <Notification-List v-show="view === 'list'"></Notification-List>
    <Notification-Form v-if="view === 'form'"></Notification-Form>
  </div>
</template>

<script>
import NotificationList from './components/NotificationList';
import NotificationForm from './components/NotificationForm';
import { setAssetRoot } from './store';
import bus from './libs/bus';

export default {
  data() {
    return {
      view: 'list'
    };
  },
  props: {
    assetRoot: String
  },
  created() {
    setAssetRoot(this.assetRoot);
    bus.$on('set-view', this.onSetView);
    bus.$on('autosize', this.onAutosize);
  },
  destroyed() {
    bus.$off('set-view', this.onSetView);
    bus.$off('autosize', this.onAutosize);
  },
  components: {
    NotificationList,
    NotificationForm
  },
  methods: {
    onSetView(view) {
      this.view = view;
      Fliplet.Widget.autosize();
    },
    onAutosize() {
      Fliplet.Widget.autosize();
    }
  }
};
</script>
