import Vue from "vue";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faUpload, faCamera } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

import App from "./App.vue";

import "./assets/styles/main.css";

library.add(faUpload, faCamera);
Vue.component("fa-icon", FontAwesomeIcon);

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");
