import { AssignedTemplateInstance, TemplateInstance } from 'https://cdn.jsdelivr.net/npm/template-extensions/+esm';
import Cookies from 'https://cdn.jsdelivr.net/npm/js-cookie/+esm';
import { processor } from './template-processor.js';

class TodoApp extends HTMLElement {
  static observedAttributes = ['filter'];

  #todos;
  #template;

  constructor() {
    super();

    const stored = Cookies.get('todos-tex');
    this.#todos = stored ? JSON.parse(stored).todos : [];

    let tpl = document.querySelector('#header-tpl');
    new AssignedTemplateInstance(document.querySelector('header'), tpl, this);
    tpl.remove();

    tpl = document.querySelector('#main-tpl');
    this.#template = new TemplateInstance(tpl, this.#state, processor);
    tpl.replaceWith(this.#template);

    this.addEventListener('destroy', this.handleEvent);
    this.addEventListener('save', this.handleEvent);

    const updateView = () => (this.filter = location.hash.slice(2));
    window.addEventListener('hashchange', updateView);
    updateView();
  }

  get #state() {
    let state = {};
    Object.getOwnPropertyNames(this.constructor.prototype)
      .forEach(name => (state[name] = this[name]));
    return {
      ...this,
      ...state,
      allSelected: !this.filter ? 'selected' : '',
      activeSelected: this.filter === 'active' ? 'selected' : '',
      completedSelected: this.filter === 'completed' ? 'selected' : '',
    };
  }

  #update = () => {
    this.#save();
    this.#template.update(this.#state);
  }

  #save = () => {
    Cookies.set('todos-tex', JSON.stringify({ todos: this.#todos }));
  }

  attributeChangedCallback() {
    this.#update();
  }

  get todosCount() { return this.#todos.length; }
  get allCompleted() { return this.#todos.every(t => t.completed); }
  get completed() { return this.#todos.filter(t => t.completed); }
  get completedCount() { return this.completed.length; }
  get active() { return this.#todos.filter(t => !t.completed); }
  get activeCount() { return this.active.length; }

  get filter() { return this.getAttribute('filter'); }
  set filter(val) {
    if (val === 'active' || val === 'completed') {
      this.setAttribute('filter', val);
    } else {
      this.removeAttribute('filter');
    }
    this.#update();
  }

  get todos() {
    if (this.filter === 'active') return this.active;
    if (this.filter === 'completed') return this.completed;
    return this.#todos;
  }

  handleEvent = ({ type, detail: { id, title, completed, editing } }) => {
    if (type === 'destroy') {
      this.#todos = this.#todos.filter(todo => todo.id != id);
      this.#update();
    } else if (type === 'save') {
      const todo = this.#todos.find(todo => todo.id == id);
      Object.assign(todo, { title, completed, editing });
      this.#update();
    }
  }

  addTodo = ({ target, key }) => {
    let title = target.value.trim();
    if (key === "Enter" && title) {
      this.#todos.push({ title, id: Date.now(), completed: false, editing: false });
      target.value = '';
      this.#update();
    }
  }

  toggleAll = ({ target }) => {
    this.#todos = this.#todos.map(todo => ({ ...todo, completed: target.checked }));
    this.#update();
  }

  clearCompleted = () => {
    this.#todos = this.#todos.filter(todo => !todo.completed);
    this.#update();
  }
}

customElements.define('todo-app', TodoApp);


class TodoItem extends HTMLElement {
  static observedAttributes = ['title', 'completed', 'editing'];

  #template;

  constructor() {
    super();

    TodoItem.template ||= document.querySelector('#item-tpl');
    this.#template = new TemplateInstance(TodoItem.template, this.#state, processor);
    TodoItem.template.remove();
    this.append(this.#template);
  }

  get title() { return this.getAttribute('title'); }
  set title(val) { this.setAttribute('title', `${val}`); }

  get completed() { return this.hasAttribute('completed'); }
  set completed(val) {
    if (val) this.setAttribute('completed', '');
    else this.removeAttribute('completed');
  }

  get editing() { return this.hasAttribute('editing'); }
  set editing(val) {
    if (val) this.setAttribute('editing', '');
    else this.removeAttribute('editing');
  }

  get #state() {
    let state = {};
    Object.getOwnPropertyNames(this.constructor.prototype)
      .forEach(name => (state[name] = this[name]));
    return {
      ...this,
      ...state,
      startEdit: this.#startEdit,
      doneEdit: this.#doneEdit,
      toggle: this.#toggle,
      save: this.#save,
    };
  }

  attributeChangedCallback() {
    this.#update();
  }

  destroy = () => {
    this.dispatchEvent(new CustomEvent('destroy', {
      detail: this,
      bubbles: true
    }));
  }

  #save = () => {
    this.dispatchEvent(new CustomEvent('save', {
      detail: this,
      bubbles: true
    }));
  }

  #update = () => {
    this.#template.update(this.#state);
  }

  #toggle = ({ target }) => {
    this.completed = target.checked;
    this.#save();
  }

  #startEdit = ({ target }) => {
    this.editing = true;

    const input = this.querySelector('.edit');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  #doneEdit = ({ key, target }) => {
    if (key === "Enter") {
      this.title = target.value.trim();
      this.editing = false;
      this.#save();
    }
    else if (key === "Escape") {
      this.editing = false;
    }
  }
}

customElements.define('todo-item', TodoItem);
