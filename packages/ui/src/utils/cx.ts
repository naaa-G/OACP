/** Merge class names — falsy values are omitted. */
export function cx(...classes: readonly (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
