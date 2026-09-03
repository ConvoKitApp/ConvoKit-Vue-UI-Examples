import { createApp } from 'vue'
import '@convokitapp/vue-ui/styles.css'
import './styles.css'
import LiveExample from './LiveExample.vue'
import ShowcaseApp from './ShowcaseApp.vue'

const isLive = new URLSearchParams(window.location.search).get('mode') === 'live'
createApp(isLive ? LiveExample : ShowcaseApp).mount('#app')
