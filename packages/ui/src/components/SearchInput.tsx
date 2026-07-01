import { forwardRef, type InputHTMLAttributes } from 'react';

import { cx } from '../utils/cx.js';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly onClear?: () => void;
}

/** Search field with icon affordance — used in agent catalog (Day 4+). */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    className,
    placeholder = 'Search…',
    'aria-label': ariaLabel = 'Search',
    value,
    onClear,
    ...rest
  },
  ref,
) {
  const showClear = onClear !== undefined && value !== undefined && String(value).length > 0;

  return (
    <div className={cx('oacp-search', className)}>
      <span className="oacp-search__icon" aria-hidden>
        ⌕
      </span>
      <input
        ref={ref}
        type="search"
        className="oacp-search__input"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        {...rest}
      />
      {showClear ? (
        <button
          type="button"
          className="oacp-search__clear"
          onClick={onClear}
          aria-label="Clear search"
        >
          ×
        </button>
      ) : null}
    </div>
  );
});
