import { uuidv4 } from './util.js'

const apiHost = 'https://api.gitarg.org'
const uid = Cookies.get('uid') || uuidv4()
const cookieDays = 15
Cookies.set('uid', uid, { expires: cookieDays })
if (Cookies.get('hasUserData')) {
  Cookies.set('hasUserData', true, { expires: cookieDays })
}

const post = (path, data) => fetch( apiHost + path, {
  method: 'POST',
  body: JSON.stringify(data),
})

export const persist = (key, val) => {
  Cookies.set('hasUserData', true, { expires: cookieDays })
  const data = { uid }
  data[key] = val
  post('/updateUser', data)
}

export const bulkPersist = (data) => {
  Cookies.set('hasUserData', true, { expires: cookieDays })
  data.uid = uid
  post('/updateUser', data)
}

export const getUserData = async () => {
  if (Cookies.get('hasUserData')) {
    //TODO: safeguard agains DB lookup errors
    const response = await post('/getUser', { uid })
    const userData = await response.json()
    return userData
  } else {
    return null
  }
}

export const saveArgument = (path, side, text) => {
  post('/addArgument', {path, side, text})
}

export const getUnmodArgs = async () => {
  const response = await post('/getAllArguments', {})
  const unmodArgs = await response.json()
  return unmodArgs
}

export const saveSurvey = (data) => post('/saveSurvey', data)
