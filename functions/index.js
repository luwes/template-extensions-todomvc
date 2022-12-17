import { parse } from 'cookie';
import { renderToString } from '../node_modules/template-extensions/src/extras/ssr.js';
import { TemplateInstance, InnerTemplatePart } from '../node_modules/template-extensions/src/index.js';
import { createProcessor, processParts } from '../template-processor.js';
import html from '../template.html';

export function onRequest({ request }) {
  const url = new URL(request.url);

  if (url.pathname === '/' || url.pathname.startsWith('/index.html')) {

    const stored = parse(request.headers.get('Cookie') || '')['todos-tex'];
    const todos = JSON.parse(stored).todos ?? [];
    const state = {
      todos,
      todosCount: todos.length,
      allCompleted: todos.every(t => t.completed),
      completedCount: todos.filter(t => t.completed).length,
      activeCount: todos.filter(t => !t.completed).length,
      allSelected: 'selected',
    };

    return new Response(renderToString(html, state, processor), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  return fetch(request);
}

export const processor = createProcessor([processSsrDirective, ...processParts]);

const templateProcessor = createProcessor([
  processTemplateSsr,
  processTemplateInnerTemplate,
  processTemplatePropertyIdentity,
]);

let innerSsrTemplates;

function processSsrDirective(part, expr, state) {
  if (part instanceof InnerTemplatePart && part.directive === 'ssr') {

    const content = new TemplateInstance(part.template, state, processor);

    innerSsrTemplates = [];

    const instance = new TemplateInstance(part.template, {}, templateProcessor);
    const template = part.template.cloneNode();
    template.setAttribute('id', template.getAttribute('expression'));
    template.removeAttribute('expression');
    template.removeAttribute('directive');
    template.appendChild(instance);

    part.replace(content, template, ...innerSsrTemplates);
    return true;
  }
}

function processTemplateSsr(part) {
  if (part instanceof InnerTemplatePart && part.directive === 'ssr') {
    const instance = new TemplateInstance(part.template, {}, templateProcessor);
    const template = part.template.cloneNode();
    template.setAttribute('id', template.getAttribute('expression'));
    template.removeAttribute('expression');
    template.removeAttribute('directive');
    template.appendChild(instance);
    innerSsrTemplates.push(template);
    return true;
  }
}

function processTemplateInnerTemplate(part) {
  if (part instanceof InnerTemplatePart) {
    const instance = new TemplateInstance(part.template, {}, templateProcessor);
    const template = part.template.cloneNode();
    template.appendChild(instance);
    part.replace(template);
    return true;
  }
}

function processTemplatePropertyIdentity(part, expr) {
  part.value = `{{${expr}}}`;
  return true;
}
