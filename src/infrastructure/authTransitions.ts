/** Serialize SDK authentication mutations. Local sign-out/invalidation happens
 * immediately; a new OAuth flow waits until older MFA/logout work settles. */
export function authTransitions() {
  let previous = Promise.resolve();
  return <T>(action: () => Promise<T>): Promise<T> => {
    const result = previous.then(action);
    previous = result.then(() => undefined, () => undefined);
    return result;
  };
}
export type AuthTransition = ReturnType<typeof authTransitions>;
