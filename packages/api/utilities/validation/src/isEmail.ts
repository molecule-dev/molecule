/**
 * Basic regex for determining whether or not a string is an email address.
 * @param string - The string.
 * @param strict - Whether strict.
 * @returns Whether email.
 */
export const isEmail = (string: string, strict?: boolean): boolean =>
  strict
    ? // eslint-disable-next-line no-useless-escape
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(((\[|)[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(\]|))|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        string,
      )
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string)
