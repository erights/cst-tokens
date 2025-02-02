import regexEscape from 'escape-string-regexp';
import { parse } from '@iter-tools/regex';

import { matchChrs, eatMatchChrs, eatChrs, EOF } from './symbols.js';
import { Coroutine } from './production.js';

export const matchDescriptor = (command, grammar, s) => {
  const { value: descriptor, error: cause } = command;
  const co = new Coroutine(descriptor.eatChrs(grammar.context));
  const startIndex = s.source.index;
  let debug_ = false;

  if (s.source.type === 'TokensSource') {
    s.source.startDescriptor(descriptor, co);
  }

  while (!co.done) {
    const { value: command } = co;
    const { type, value } = command;
    let returnValue = undefined;

    if (debug_) {
      debug_ = false;
      debugger;
    }

    switch (type) {
      case matchChrs:
      case eatMatchChrs:
      case eatChrs: {
        let pattern = value;

        if (pattern === EOF) {
          returnValue = s.source.done ? EOF : null;
          break;
        }

        if (typeof pattern === 'string') {
          pattern = new RegExp(regexEscape(pattern), 'y');
        }

        if (!(pattern instanceof RegExp)) {
          throw new Error('Unsupported pattern');
        }

        const flags = pattern.flags.includes('y') ? pattern.flags : pattern.flags + 'y';
        const pattern_ = parse(pattern.source, flags);

        const result = type !== matchChrs ? s.source.exec(pattern_) : s.source.testExec(pattern_);

        if (!result && type === eatChrs) {
          const actualSource = s.source;
          while (s.source.index > startIndex) actualSource.advanceChr(true);
          co.return(null);
        }

        returnValue = result;
        break;
      }

      case 'debug': {
        debug_ = true;
        break;
      }

      default:
        throw new Error(`Unexpected command of {type: ${type}} emitted from descriptor.eatChrs`);
    }
    if (!co.done) {
      co.advance(returnValue);
    }
  }

  if (s.source.type === 'TokensSource') {
    s.source.endDescriptor(co.value);
  }

  if (co.value === '') {
    throw new Error('Descriptors must not be optional', cause && { cause });
  }

  return [s, co.value];
};
