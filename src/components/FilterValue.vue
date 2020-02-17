<template>
  <div>
    <input type="text" class="form-control" v-if="type === 'text'" placeholder="Value" v-model="value" />
    <Token-Field v-if="type === 'collection'" :value.sync="value"></Token-Field>
  </div>
</template>

<script>
import TokenField from './TokenField';

export default {
  props: {
    type: {
      type: String,
      default: 'text'
    },
    value: [String, Object, Number]
  },
  components: {
    TokenField
  },
  watch: {
    value(value) {
      this.$emit('update:value', value);
    }
  }
};
</script>
