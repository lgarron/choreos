export function mustExist<T>(t: NonNullable<T> | null): NonNullable<T>;
export function mustExist<T>(t: NonNullable<T> | undefined): NonNullable<T>;
export function mustExist<T>(
  t: NonNullable<T> | null | undefined,
): NonNullable<T> {
  if (typeof t === "undefined" || t === null) {
    throw new Error("Missing value");
  }
  return t;
}
