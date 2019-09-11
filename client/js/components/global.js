const { html } = lighterhtml

export const Title = (text) => html`
  <h1 class="title has-text-centered">
    ${text}
  </h1>
`

export const Button = ({label, onClick}) => html`
  <button
    class="button is-primary"
    onclick=${onClick}
  >
    ${label}
  </button>
`

const Tab = ({label, active, onClick, path}) => html`
  <li class=${(active) ? 'is-active' : ''} >
    <a onclick=${onClick} href=${path} >
      ${label}
    </a>
  </li>
`

export const Tabs = (tabs) => html`
  <div class="tabs is-boxed">
    <ul>
      ${tabs.map(Tab)}
    </ul>
  </div>
`
