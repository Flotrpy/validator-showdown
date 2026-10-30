/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters --
   The single-use type parameters are the whole trick: they make TypeScript
   compare A and B exactly instead of by assignability. */

/**
 * Tiny compile-time helpers. `Expect<Equal<A, B>>` fails `npm run typecheck`
 * if A and B are not exactly the same type.
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type Expect<T extends true> = T;
