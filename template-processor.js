import { InnerTemplatePart, TemplateInstance, AttrPart } from 'https://cdn.jsdelivr.net/npm/template-extensions/+esm';

const renderedTemplates = new WeakMap();
const renderedTemplateInstances = new WeakMap();

export const processor = {
  processCallback(instance, parts, state) {
    if (!state) return;
    for (const [expression, part] of parts) {
      if (part instanceof InnerTemplatePart) {
        switch (part.directive) {
          case 'foreach': {
            part.replace((state[expression] ?? []).map(item => {
              return new TemplateInstance(part.template, item, processor);
            }));
            break;
          }
          case 'if':
            if (!!state[expression]) {
              if (renderedTemplates.get(part) !== part.template) {
                renderedTemplates.set(part, part.template);
                const tpl = new TemplateInstance(part.template, state, processor);
                part.replace(tpl);
                renderedTemplateInstances.set(part, tpl);
              } else {
                renderedTemplateInstances.get(part)?.update(state);
              }
            } else {
              part.replace('');
              renderedTemplates.set(part, null);
            }
            break;
        }
        continue;
      }

      if (expression in state) {
        const value = state[expression];
        if (
          typeof value === 'boolean' &&
          part instanceof AttrPart
          // typeof part.element[part.attributeName] === 'boolean'
        ) {
          part.booleanValue = value;
        } else if (typeof value === 'function' && part instanceof AttrPart) {
          part.element.removeAttribute(part.attributeName);
          part.element[part.attributeName] = value;
        } else {
          part.value = value;
        }
      }
    }
  }
};
