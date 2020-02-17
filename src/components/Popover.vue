<template>
  <span data-toggle="popover" :data-placement="placement" :title="title" :data-content="content" :data-trigger="trigger">
    <slot></slot>
  </span>
</template>

<script>
export default {
  props: {
    placement: {
      type: String,
      default: 'top'
    },
    title: {
      type: String
    },
    content: {
      type: String
    },
    trigger: {
      type: String,
      default: 'focus'
    },
    html: {
      type: Boolean,
      default: true
    }
  },
  mounted() {
    $(this.$el).popover({
      html: this.html
    });
  },
  unmounted() {
    $(this.$el).popover('destroy');
  }
};
</script>
