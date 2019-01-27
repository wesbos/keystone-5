import React from 'react';
import { Button } from '@arch-ui/button';

export function NoResultsMessage({
  filters,
  itemsCount,
  list,
  search,
  currentPage,
  handlePageReset,
}) {
  if (filters && filters.length) {
    return (
      <span>
        No {list.plural.toLowerCase()} found matching the{' '}
        {filters.length > 1 ? 'filters' : 'filter'}
      </span>
    );
  }
  if (search && search.length) {
    return (
      <span>
        No {list.plural.toLowerCase()} found matching &ldquo;
        {search}
        &rdquo;
      </span>
    );
  }

  if (currentPage !== 1) {
    return (
      <div>
        <p>
          Not enough {list.plural.toLowerCase()} found to show page {currentPage}.
        </p>
        <Button variant="ghost" onClick={handlePageReset}>
          Show first page
        </Button>
      </div>
    );
  }

  if (itemsCount === 0) {
    return <span>No {list.plural.toLowerCase()} to display yet...</span>;
  }

  return null;
}
