<template>
  <span>
    <input type="text" class="form-control" :placeholder="placeholder" ref="input" v-model="value" />
  </span>
</template>

<script>
export default {
  data() {
    return {
      collection: []
    };
  },
  props: {
    value: {
      type: Array
    },
    placeholder: {
      type: String
    }
  },
  mounted() {
    $(this.$refs.input)
      .on('tokenfield:createdtoken', () => {
        this.collection = $(this.$refs.input).tokenfield('getTokens');
      })
      .on('tokenfield:removedtoken', () => {
        this.collection = $(this.$refs.input).tokenfield('getTokens');
      })
      .tokenfield({
        tokens: this.value,
        createTokensOnBlur: true
      });
  },
  unmounted() {
    $(this.$refs.input).tokenfield('destroy');
  },
  watch: {
    collection(collection) {
      this.$emit('update:value', _.map(collection, 'value'));
    }
  }
};
</script>
