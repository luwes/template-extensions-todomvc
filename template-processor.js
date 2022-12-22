import { AttrPart, AssignedTemplateInstance, TemplateInstance, InnerTemplatePart } from './web_modules/template-extensions/src/index.js';

export const createProcessor = (processParts) => ({
  processCallback(instance, parts, state) {
    if (!state) return;
    for (const [expr, part] of parts) {
      processParts.some((processPart) => processPart(part, expr, state, instance));
    }
  }
});

export const processParts = [
  processIfDirective,
  processForeachDirective,
  processEvent,
  processBooleanAttribute,
  processPropertyIdentity,
];

export const processor = createProcessor(processParts);

const ifTemplates = new WeakMap();
const templateInstances = new WeakMap();

function processIfDirective(part, expr, state, instance) {
  if (part instanceof InnerTemplatePart && part.directive === 'if') {
    const { parentNode } = part;
    if (instance.assign) {
      if (state[expr]) {
        ifTemplates.set(parentNode, part.template);

        const tpl = new AssignedTemplateInstance(parentNode, part.template, state, processor);
        templateInstances.set(parentNode, tpl);
      }
      return true;
    }

    if (state[expr]) {
      if (ifTemplates.get(parentNode) !== part.template) {
        ifTemplates.set(parentNode, part.template);

        const tpl = new TemplateInstance(part.template, state, processor);
        part.replace(tpl);
        templateInstances.set(parentNode, tpl);
      } else {
        templateInstances.get(parentNode)?.update(state);
      }
    } else {
      part.replace('');
      ifTemplates.delete(parentNode);
      templateInstances.delete(parentNode);
    }
    return true;
  }
}

function processForeachDirective(part, expr, state, instance) {
  if (part instanceof InnerTemplatePart && part.directive === 'foreach') {
    if (instance.assign) {
      state[expr].forEach((item, i) => {
        const childNodes = [part.replacementNodes[i]];
        const tpl = new AssignedTemplateInstance(
          { childNodes },
          part.template,
          item,
          processor
        );
        templateInstances.set(item, { tpl, childNodes });
      });
      return true;
    }

    part.replace((state[expr] ?? []).map(item => {
      let { tpl, childNodes } = templateInstances.get(item) ?? {};
      if (tpl) {
        tpl.update(item);
        return childNodes;
      }

      tpl = new TemplateInstance(part.template, item, processor);
      childNodes = [...tpl.childNodes];
      templateInstances.set(item, { tpl, childNodes });
      return childNodes;
    }));
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
    part.value = undefined;
    part.element[part.attributeName] = state[expr];
    return true;
  }
}

function processPropertyIdentity(part, expr, state) {
  const val = String(state[expr] ?? '');
  if (val !== part.value) {
    part.value = val;
  }
}
