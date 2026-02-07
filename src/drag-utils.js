import Sortable from 'sortablejs';

export function initSortable(el, options = {}) {
	if (!el) return null;

	const defaultOptions = {
		animation: 150,
		handle: '.drag-handle',
		ghostClass: 'drag-ghost',
		chosenClass: 'drag-chosen',
		dragClass: 'drag-item',
		forceFallback: true,
		fallbackOnBody: true,
		swapThreshold: 0.65,
	};

	return new Sortable(el, { ...defaultOptions, ...options });
}
