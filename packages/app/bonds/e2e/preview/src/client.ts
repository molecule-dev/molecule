/**
 * The page client: a small script the Vite plugin injects into every
 * dev/preview document. It opens a same-origin WebSocket back to the hub,
 * runs `evaluate` requests, navigates on request, relays viewport requests to
 * the IDE that frames it, and forwards console output, errors and dialogs.
 *
 * Plain ES5-flavoured JavaScript in a string: it must run in whatever the
 * previewed app runs in, and it must never depend on the app's bundler.
 *
 * @module
 */

import { E2E_WS_PATH } from './types.js'

/** The client script's source, ready to serve as `text/javascript`. */
export const E2E_PREVIEW_CLIENT_SCRIPT = `;(function () {
  if (window.__molE2EClient) return
  var PATH = ${JSON.stringify(E2E_WS_PATH)}
  var proto = location.protocol === 'https:' ? 'wss://' : 'ws://'
  var pageId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + String(Math.random()).slice(2)
  var ws = null
  var backoff = 500
  var leaving = false
  var safe = function (value) {
    if (value === undefined) return null
    try {
      return JSON.parse(JSON.stringify(value, function (k, v) { return typeof v === 'function' ? undefined : v }))
    } catch (e) {
      return String(value)
    }
  }
  var send = function (obj) {
    try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)) } catch (e) {}
  }
  var describe = function (args) {
    var out = []
    for (var i = 0; i < args.length; i++) {
      var a = args[i]
      if (typeof a === 'string') out.push(a)
      else if (a instanceof Error) out.push(a.stack || a.message || String(a))
      else { try { out.push(JSON.stringify(a)) } catch (e) { out.push(String(a)) } }
    }
    return out.join(' ')
  }
  var sameOrigin = function (url) {
    var u = new URL(url, location.href)
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0') && u.host !== location.host) {
      return location.origin + u.pathname + u.search + u.hash
    }
    return u.href
  }
  var handle = function (msg) {
    var id = msg.id
    var reply = function (obj) { obj.id = id; obj.href = location.href; send(obj) }
    try {
      if (msg.op === 'evaluate') {
        var fn = new Function('return (' + msg.source + ')')()
        Promise.resolve(fn(msg.arg)).then(function (value) {
          reply({ ok: true, value: safe(value) })
        }, function (e) {
          reply({ ok: false, error: (e && e.stack) || String(e) })
        })
      } else if (msg.op === 'goto') {
        var target = sameOrigin(msg.url)
        reply({ ok: true, navigating: true, target: target })
        leaving = true
        if (target === location.href) location.reload()
        else location.assign(target)
      } else if (msg.op === 'reload') {
        reply({ ok: true, navigating: true })
        leaving = true
        location.reload()
      } else if (msg.op === 'history') {
        reply({ ok: true, navigating: true })
        history.go(msg.delta)
      } else if (msg.op === 'viewport') {
        try { window.parent.postMessage({ type: 'molecule:viewport', id: id, width: msg.width, height: msg.height }, '*') } catch (e) {}
        var started = Date.now()
        var check = function () {
          if (Math.abs(innerWidth - msg.width) <= 2 || Date.now() - started > 1500) {
            reply({ ok: true, value: { width: innerWidth, height: innerHeight, framed: window.parent !== window } })
          } else setTimeout(check, 50)
        }
        setTimeout(check, 50)
      } else if (msg.op === 'ping') {
        reply({ ok: true, value: 'pong' })
      } else {
        reply({ ok: false, error: 'unknown op: ' + msg.op })
      }
    } catch (e) {
      reply({ ok: false, error: (e && e.stack) || String(e) })
    }
  }
  var hello = function () {
    send({ hello: true, id: pageId, href: location.href, title: document.title, readyState: document.readyState, innerWidth: innerWidth, innerHeight: innerHeight, hidden: document.hidden, framed: window.parent !== window })
  }
  var connect = function () {
    if (leaving) return
    try { ws = new WebSocket(proto + location.host + PATH + '?role=page&id=' + encodeURIComponent(pageId)) } catch (e) { setTimeout(connect, backoff); return }
    ws.onopen = function () { backoff = 500; hello() }
    ws.onmessage = function (ev) {
      var msg = null
      try { msg = JSON.parse(ev.data) } catch (e) { return }
      if (msg && msg.op) handle(msg)
    }
    ws.onclose = function () { if (!leaving) { backoff = Math.min(backoff * 2, 5000); setTimeout(connect, backoff) } }
    ws.onerror = function () {}
  }
  var levels = ['log', 'info', 'warn', 'error', 'debug']
  for (var i = 0; i < levels.length; i++) (function (level) {
    var orig = console[level]
    console[level] = function () {
      try { send({ event: 'console', type: level === 'warn' ? 'warning' : level, text: describe(arguments) }) } catch (e) {}
      return orig && orig.apply(console, arguments)
    }
  })(levels[i])
  window.addEventListener('error', function (e) {
    send({ event: 'pageerror', message: (e.error && e.error.message) || e.message || 'Error', stack: e.error && e.error.stack, url: e.filename, lineNumber: e.lineno, columnNumber: e.colno })
  })
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason
    send({ event: 'pageerror', message: (r && r.message) || String(r), stack: r && r.stack })
  })
  var dialogs = ['alert', 'confirm', 'prompt']
  for (var d = 0; d < dialogs.length; d++) (function (kind) {
    window[kind] = function (message, defaultValue) {
      send({ event: 'dialog', type: kind, message: String(message === undefined ? '' : message), defaultValue: defaultValue === undefined ? '' : String(defaultValue) })
      if (kind === 'confirm') return true
      if (kind === 'prompt') return defaultValue === undefined ? '' : String(defaultValue)
      return undefined
    }
  })(dialogs[d])
  var navigated = function () { send({ event: 'navigated', href: location.href, title: document.title }) }
  window.addEventListener('popstate', navigated)
  window.addEventListener('hashchange', navigated)
  var wrapHistory = function (name) {
    var orig = history[name]
    history[name] = function () { var r = orig.apply(this, arguments); setTimeout(navigated, 0); return r }
  }
  wrapHistory('pushState')
  wrapHistory('replaceState')
  document.addEventListener('visibilitychange', function () { send({ event: 'visibility', hidden: document.hidden, href: location.href }) })
  window.addEventListener('pagehide', function () { leaving = true; try { if (ws) ws.close() } catch (e) {} })
  window.__molE2EClient = { pageId: pageId, version: 1 }
  connect()
})()
`
