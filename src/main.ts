import { createApp } from 'vue'
import '@convokitapp/vue-ui/styles.css'
import './styles.css'
import LiveExample from './LiveExample.vue'
import ShowcaseApp from './ShowcaseApp.vue'

const params = new URLSearchParams(window.location.search)
const isLive = params.get('mode') !== 'showcase' && (!params.has('variant') || params.get('mode') === 'live')
createApp(isLive ? LiveExample : ShowcaseApp).mount('#app')
