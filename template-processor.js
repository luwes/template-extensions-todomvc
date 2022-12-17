import { AttrPart, TemplateInstance, InnerTemplatePart } from './node_modules/template-extensions/src/index.js';

export const createProcessor = (processParts) => ({
  processCallback(instance, parts, state) {
    if (!state) return;
    for (const [expr, part] of parts) {
      processParts.some((processPart) => processPart(part, expr, state, instance));
    }
  }
});

export const processParts = [
  processSsrDirective,
  processIfDirective,
  processForeachDirective,
  processEvent,
  processBooleanAttribute,
  processPropertyIdentity,
];

export const processor = createProcessor(processParts);

function processSsrDirective(part, expr, state) {
  if (part instanceof InnerTemplatePart && part.directive === 'ssr') {
    const content = new TemplateInstance(part.template, state, processor);
    part.replace(content);
    return true;
  }
}

function processIfDirective(part, expr, state, instance) {
  if (part instanceof InnerTemplatePart && part.directive === 'if') {
    if (!instance.assign) {
      if (state[expr]) {
        const template = new TemplateInstance(part.template, state, processor);
        part.replace(template);
      } else {
        part.replace('');
      }
    }
    return true;
  }
}

function processForeachDirective(part, expr, state, instance) {
  if (part instanceof InnerTemplatePart && part.directive === 'foreach') {
    if (!instance.assign) {
      part.replace((state[expr] ?? []).map(item => {
        return new TemplateInstance(part.template, item, processor);
      }));
    }
    return true;
  }
}

function processBooleanAttribute(part, expr, state) {
  if (
    typeof state[expr] === 'boolean' &&
    part instanceof AttrPart
  ) {
    part.booleanValue = state[expr];
    return true;
  }
}

function processEvent(part, expr, state) {
  if (typeof state[expr] === 'function' && part instanceof AttrPart) {
    part.element.removeAttribute(part.attributeName);
    part.element[part.attributeName] = state[expr];
    return true;
  }
}

function processPropertyIdentity(part, expr, state) {
  part.value = String(state[expr] ?? '');
}
