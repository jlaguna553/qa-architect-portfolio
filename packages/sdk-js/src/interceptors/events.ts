import { UIEventTrace } from '../types';

type UIEventCallback = (event: UIEventTrace) => void;

let clickHandler: ((e: MouseEvent) => void) | null = null;
let submitHandler: ((e: SubmitEvent) => void) | null = null;

function getCssSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.className) {
      const classes = Array.from(current.classList).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }
    parts.unshift(selector);
    current = current.parentElement;
    if (parts.length >= 4) break;
  }
  return parts.join(' > ');
}

export function attachEventListeners(onCapture: UIEventCallback): void {
  clickHandler = (e: MouseEvent) => {
    const target = e.target as Element;
    if (!target) return;
    onCapture({ type: 'click', selector: getCssSelector(target), text: target.textContent?.trim().slice(0, 100) ?? '', url: window.location.href });
  };

  submitHandler = (e: SubmitEvent) => {
    const target = e.target as HTMLFormElement;
    if (!target) return;
    onCapture({ type: 'submit', selector: getCssSelector(target), text: target.getAttribute('action') ?? window.location.href, url: window.location.href });
  };

  document.addEventListener('click', clickHandler, { capture: true, passive: true });
  document.addEventListener('submit', submitHandler, { capture: true });
}

export function detachEventListeners(): void {
  if (clickHandler) { document.removeEventListener('click', clickHandler, { capture: true }); clickHandler = null; }
  if (submitHandler) { document.removeEventListener('submit', submitHandler, { capture: true }); submitHandler = null; }
}
