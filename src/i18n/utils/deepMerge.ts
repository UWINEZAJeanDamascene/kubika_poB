type PlainObject = Record<string, unknown>;

export function deepMerge<T extends PlainObject>(base: T, override: PlainObject): T {
  const result = { ...base } as PlainObject;

  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as PlainObject, value as PlainObject);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}
