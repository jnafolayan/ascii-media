<template>
  <div id="app" class="flex items-center justify-center h-screen">
    <display />
  </div>
</template>

<script>
import Display from "./components/Display";

export default {
  name: "App",
  components: {
    Display
  }
};
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  @apply bg-gray-300;
  background: rgb(20, 20, 20);
}

#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
