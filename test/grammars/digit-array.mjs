import { parseModule } from 'meriyah';
import { Grammar } from '@cst-tokens/helpers/grammar';
import { eat, eatMatch, startNode, endNode } from '@cst-tokens/helpers/commands';
import { Literal, LineBreak } from '@cst-tokens/helpers/descriptors';
import { ref } from '@cst-tokens/helpers/shorthand';
import { Bag } from '@cst-tokens/helpers/meta-productions';
import { objectEntries } from '@cst-tokens/helpers/iterable';

const { isArray } = Array;

const Whitespace = () => Literal('Whitespace', /[ \t]+/);

function* _({ getState }) {
  return getState().source ? yield* eat(Bag([Whitespace(), LineBreak()])) : [Whitespace().build()];
}

const stripArray = (value) => (isArray(value) ? value[0] : value);

export const D = (value) => Literal('Digit', stripArray(value));
export const PN = (value) => Literal('Punctuator', stripArray(value));
export const LPN = (value) => Literal('LeftPunctuator', stripArray(value));
export const RPN = (value) => Literal('RightPunctuator', stripArray(value));

// This simple grammar is useful to test the mechanics of hoisting
// matches [] and [1, 2, 3,]

export default new Grammar({
  productions: objectEntries({
    *CSTFragment() {
      yield* eat(ref`fragment`);
      yield* eatMatch(_);
    },
    *Array({ path }) {
      const { elements } = path.node;

      yield* eatMatch(_);
      yield* startNode();
      yield* eat(LPN`[`);

      for (let i = 0; i < elements.length; i++) {
        yield* eat(ref`elements`);
        if (i + 1 === elements.length) {
          yield* eatMatch(_);
          yield* eatMatch(PN`,`);
        } else {
          yield* eatMatch(_);
          yield* eat(PN`,`);
        }
      }

      yield* eatMatch(_);
      yield* eat(RPN`]`);
      yield* endNode();
    },
    *Digit({ path }) {
      const { value } = path.node;

      yield* eatMatch(_);
      yield* startNode();
      yield* eat(D(String(value)));
      yield* endNode();
    },
  }),
});

export const parse = (text) => {
  const ast = parseModule(text);
  const elements = ast.body[0].expression.elements.map(({ value }) => ({ type: 'Digit', value }));
  return { type: 'Array', elements };
};
