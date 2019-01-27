/** @jsx jsx */
import { jsx } from '@emotion/core';
import { useRef } from 'react';
import { Kbd, Title } from '@arch-ui/typography';
import { colors } from '@arch-ui/theme';
import { Popout, DisclosureArrow } from '../../components/Popout';
import SortSelect, { SortButton } from './SortSelect';

export function ListTitle({ itemsCount, list, sortBy, handleSortChange }) {
  let sortPopoutRef = useRef(null);

  return (
    <Title as="h1" margin="both">
      {itemsCount > 0 ? list.formatCount(itemsCount) : list.plural}
      <span>, by</span>
      <Popout
        innerRef={sortPopoutRef}
        headerTitle="Sort"
        footerContent={
          <div
            css={{
              color: colors.N60,
              fontSize: '0.85em',
            }}
          >
            Hold <Kbd>alt</Kbd> to toggle ascending/descending
          </div>
        }
        target={
          <SortButton>
            {sortBy.field.label.toLowerCase()}
            <DisclosureArrow size="0.2em" />
          </SortButton>
        }
      >
        <SortSelect
          popoutRef={sortPopoutRef}
          fields={list.fields}
          onChange={handleSortChange}
          value={sortBy}
        />
      </Popout>
    </Title>
  );
}
