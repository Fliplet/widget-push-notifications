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
    this.collection = _.concat(this.collection, _.map(this.value, (obj) => {
      if (_.hasIn(obj, 'value')) {
        return obj;
      }

      return {
        value: obj
      };
    }));
    $(this.$refs.input)
      .tokenfield({
        tokens: this.collection,
        createTokensOnBlur: true
      })
      .on('tokenfield:createdtoken', () => {
        this.getTokens();
      })
      .on('tokenfield:removedtoken', () => {
        this.getTokens();
      });
  },
  unmounted() {
    $(this.$refs.input).tokenfield('destroy');
  },
  watch: {
    collection(collection) {
      this.$emit('update:value', _.map(collection, 'value'));
    }
  },
  methods: {
    getTokens() {
      this.collection.splice(0, this.collection.length);
      _.forEach($(this.$refs.input).tokenfield('getTokens'), (token) => {
        this.collection.push(token);
      });
    }
  }
};
</script>
