export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): T {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);

    const run = () => {
      last = Date.now();
      fn(...args);
    };

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      run();
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        run();
      }, remaining);
    }
  }) as T;
}
