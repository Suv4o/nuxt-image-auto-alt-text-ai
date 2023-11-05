<script setup lang="ts">
interface Props {
  url: string;
  alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
});

</script>

<template>
  <img
    :src="props.url"
    :alt="props.alt"
  >
</template>
