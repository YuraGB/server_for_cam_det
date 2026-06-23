export async function asyncActionHandler<T>(
  promiseFn: () => Promise<T>,
): Promise<[T, null] | [null, Error]> {
  try {
    const data = await promiseFn();

    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error("Unknown error")];
  }
}
