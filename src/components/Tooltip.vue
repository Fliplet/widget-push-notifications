<template>
  <span data-toggle="tooltip" :data-placement="placement" :title="title">
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
      type: String,
      required: true
    }
  },
  mounted() {
    $(this.$el).tooltip({
      trigger: 'hover'
    });
  },
  unmounted() {
    $(this.$el).tooltip('destroy');
  }
};
</script>
