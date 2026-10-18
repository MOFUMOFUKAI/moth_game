const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function createGame(options = {}) {
  let now = 100000, nextId = 1;
  const frames = [], audioTimers = new Map(), elements = new Map();
  const stored = new Map(Object.entries(options.storage || {}));
  const all = new Set();
  function element(tag = 'div', id = '') {
    const classes = new Set();
    const listeners = {};
    const el = { tagName: tag.toUpperCase(), id, style: { setProperty() {} }, dataset: {}, children: [], parentElement: null,
      clientWidth: id === 'game' ? (options.width || 400) : 48, clientHeight: id === 'game' ? 600 : 48,
      offsetWidth: id === 'hitbox' ? 35 : 48, offsetHeight: id === 'hitbox' ? 35 : 48,
      offsetLeft: 180, offsetTop: 542, paused: true, currentTime: 0, volume: 1, listeners,
      classList: { add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); } },
      appendChild(child) { child.remove(); this.children.push(child); child.parentElement = this; if (child.id) elements.set(child.id, child); return child; },
      remove() { if (this.parentElement) { const list = this.parentElement.children; list.splice(list.indexOf(this), 1); } this.parentElement = null; },
      replaceChildren() { [...this.children].forEach(child => child.remove()); },
      addEventListener(name, callback) { if (!(listeners[name] ||= []).includes(callback)) listeners[name].push(callback); },
      removeEventListener(name, callback) { listeners[name] = (listeners[name] || []).filter(item => item !== callback); },
      querySelectorAll(selector) { return [...all].filter(child => child.parentElement && descendant(child, this) && matches(child, selector)); },
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
      closest(selector) { let child = this; while (child) { if (matches(child, selector)) return child; child = child.parentElement; } return null; },
      getBoundingClientRect() { const width = parseFloat(this.style.width) || this.offsetWidth; const height = parseFloat(this.style.height) || this.offsetHeight;
        const left = parseFloat(this.style.left) || 0; const anchor = parseFloat(this.style.top) || 0;
        const top = this.id === 'player' ? 542 : this.id === 'hitbox' ? 553 :
          this.motionAnchor === anchor && Number.isFinite(this.motionY) ? anchor + this.motionOffset : anchor;
        return { left, top, width, height, right: left + width, bottom: top + height }; },
      play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; }, load() {}, cloneNode() { return element('audio'); }
    };
    Object.defineProperty(el, 'className', { get: () => [...classes].join(' '), set: value => { classes.clear(); value.split(/\s+/).forEach(name => classes.add(name)); } });
    all.add(el); return el;
  }
  function descendant(child, ancestor) { let parent = child.parentElement; while (parent) { if (parent === ancestor) return true; parent = parent.parentElement; } return false; }
  function matches(el, selector) { return selector.split(',').some(part => { const s = part.trim(); if (s === '[data-transient]') return !!el.dataset.transient; if (s.startsWith('.')) return el.classList.contains(s.slice(1)); if (s.startsWith('#')) return el.id === s.slice(1); return el.tagName.toLowerCase() === s; }); }
  const document = element('document'); document.hidden = false;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"/g)) elements.set(match[2], element(match[1], match[2]));
  document.getElementById = id => elements.get(id) || null;
  document.createElement = tag => element(tag);
  const game = elements.get('game'); document.appendChild(game);
  for (const id of ['player', 'hitbox', 'gameClear', 'timeRating', 'thankYouText']) game.appendChild(elements.get(id));
  const window = element('window'); window.scrollTo = () => {};
  const context = { document, window, Math: Object.create(Math), console: { log() {}, warn() {} }, Date: class extends Date { static now() { return now; } }, performance: { now: () => now },
    localStorage: { getItem(key) { if (options.storageThrows) throw new Error('Denied'); return stored.get(key) || null; }, setItem(key, value) { if (options.storageThrows) throw new Error('Denied'); stored.set(key, value); } },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    setInterval(callback, interval) { const id = nextId++; audioTimers.set(id, { callback, interval }); return id; }, clearInterval(id) { audioTimers.delete(id); },
    setTimeout() { throw new Error('Unmanaged timeout'); }, alert() {} };
  context.Math.random = () => 0.5;
  vm.createContext(context);
  for (const file of ['runtime', 'animation', 'game', 'audio', 'input', 'ranking']) vm.runInContext(fs.readFileSync(path.join(root, 'src', file + '.js'), 'utf8'), context, { filename: file + '.js' });
  const run = code => vm.runInContext(code, context);
  const frame = delta => { now += delta; const pending = frames.splice(0); pending.forEach(callback => callback(now)); };
  const advance = (duration, interval = 1000 / 60) => { let left = duration; while (left > 0.00001) { const delta = Math.min(interval, left); frame(delta); left -= delta; } };
  const dispatch = (el, name, extras = {}) => { const event = { target: el, key: '', preventDefault() {}, stopPropagation() {}, ...extras }; (el.listeners[name] || []).forEach(callback => callback(event)); };
  return { run, frame, advance, frames, audioTimers, elements, stored, document, window, dispatch };
}
module.exports = { createGame, root };
