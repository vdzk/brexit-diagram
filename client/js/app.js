import { getUserData, persist } from './persist.js'
import { getFactor } from './routes/factor.js'
import { getValues, activeAgent, importUserValues } from './routes/values.js'
import { getValue } from './routes/value.js'
import { getDiagram } from './routes/diagram.js'
import {
  getDecision,
  getDecisionToolbar,
  startedEvauation,
  checkStatus,
  complete
} from './routes/decision.js'
import { getAbout } from './routes/about.js'
import { NavBar, App, NotFound, Discussion } from './components/app.js'
import { debounce } from './util.js'
import { importUserVals } from './calc/calc.js'
import Navigo from '../third_party/navigo.js'
import { getStats } from './stats.js'
import { hideComments, showComments } from './comments.js'
const { render } = lighterhtml

let activeRoute
let activeParams
let evaluating = true
const appEl = document.getElementById('App')

const setEvaluation = (newEval) => {
  evaluating = newEval
  updateView()
}

let showMenu = false
const toggleMenu = () => {
  showMenu = !showMenu
  updateView()
}

const getNav = () => {
  const navTabs = []
  const navTabsEnd = []
  for (const route in routes) {
    const { navTab, navEnd, navPath, path } = routes[route]
    if (navTab) {
      const tab = {
        title: navTab,
        active: route === activeRoute,
        href: navPath || path,
        onClick: (event) => navigate(navPath || path, event)
      }
      ;(navEnd) ? navTabsEnd.push(tab) : navTabs.push(tab)
    }
  }
  return NavBar({ navTabs, navTabsEnd, showMenu, toggleMenu })
}

export function updateView() {
  render(appEl, () => {
    const { content, title } = routes[activeRoute].get(
      activeParams,
      { evaluating, setEvaluation, updateView, navigate }
    )
    document.title = title
    let toolbar
    if (complete) {
      document.body.classList.remove('has-navbar-fixed-bottom')
    } else {
      toolbar = getDecisionToolbar()
      document.body.classList.add('has-navbar-fixed-bottom')
    }
    return App(getNav(), content, toolbar)
  })
}

const router = new Navigo(window.location.origin)

export const navigate = (path, event) => {
  showMenu = false
  if (event) {
    if (event.ctrlKey) {
      return true
    } else {
      event.preventDefault()
    }
  }
  router.navigate(path)
}

//Intercept content link clicks
appEl.addEventListener('click', (event) => {
  const path = event.target.pathname
  if (path && (event.target.closest('.content') !== null
              || event.target.closest('.menu') !== null)) {
    navigate(path, event)
  }
})

//TODO: Fix activeAgent and add activeDiagram variables
const routes = {
  diagram: {
    get: getDiagram,
    navTab: 'Diagram',
    path: '/diagram/:subKey',
    navPath: '/diagram/brexit',
  },
  factor: {
    get: getFactor,
    path: '/factor/:key',
    comments: true,
  },
  factorActiveKey: {
    get: getFactor,
    path: '/factor/:key/:activeKey',
    comments: true,
  },
  values: {
    get: getValues,
    navTab: 'Values',
    path: '/values/:agent',
    navPath: '/values/' + activeAgent,
  },
  value: {
    get: getValue,
    path: '/value/:key/:agent',
    comments: true,
  },
  valueActiveOption: {
    get: getValue,
    path: '/value/:key/:agent/:activeOption',
    comments: true,
  },
  decision: {
    get: getDecision,
    navTab: 'Decision',
    path: '/decision',
  },
  about: {
    get: getAbout,
    navTab: 'About',
    navEnd: true,
    path: '/about/:activeTopic',
    navPath: '/about/project',
  },
  discussion: {
    get: () => {
      showComments()
      return {content: Discussion(), title: 'Discussion' }
    },
    navTab: 'Discussion',
    navEnd: true,
    path: '/discussion',
  },
}

const routeHandlers = {}
for (const route in routes) {
  const { path } = routes[route]
  routeHandlers[path] = (params) => {
    const oldRoute = activeRoute
    activeRoute = route
    activeParams = params
    updateView()
    if (route !== oldRoute) {
      window.scroll(0, 0)
    }
  }
}
router.on(routeHandlers)
router.hooks({
  before: (done) => {
    evaluating = true
    hideComments()
    done()
  },
  after: () => {
    gtag('config', 'UA-147529439-1', { 'page_path': window.location.pathname })
  }
})
router.notFound(() => render(appEl, NotFound))

getUserData().then((data) => {
  if (data !== null) {
    importUserVals(data)
    importUserValues(data)
    checkStatus()
    updateView()
  }
})

getStats().then(() => router.resolve())
