// @flow
/** @jsx jsx */
import { jsx } from '@emotion/core';
import { format, setDay } from 'date-fns';
import { memo } from 'react';
import { colors, borderRadius } from '@arch-ui/theme';
import { isToday as isDayToday } from 'date-fns';

export const WeekRow = (props: {}) => {
  return <div css={{ display: 'flex' }} role="row" {...props} />;
};

export const WeekLabels = memo<{}>(
  () => (
    <div
      css={{
        display: 'flex',
        color: colors.N40,
        fontSize: '0.65rem',
        fontWeight: 500,
        textTransform: 'uppercase',
      }}
    >
      {[...new Array(7)]
        .map((_, day) => format(setDay(new Date(), day), 'ddd'))
        .map(d => (
          <div
            css={{
              alignItems: 'center',
              borderRadius,
              display: 'flex',
              flexDirection: 'column',
              flexBasis: 'calc(100% / 7)',
              padding: '0.5rem',
              textAlign: 'center',
              width: 'calc(100% / 7)',
            }}
            key={d}
          >
            {d}
          </div>
        ))}
    </div>
  ),
  () => true
);

type DayProps = {
  date: Date,
  isSelected: boolean,
  isDisabled: boolean,
};

export let Day = ({ date, isSelected, isDisabled, ...props }: DayProps) => {
  let isToday = isDayToday(date);
  let textColor;
  if (isToday) textColor = colors.danger;
  if (isDisabled) textColor = colors.N40;
  if (isSelected) textColor = 'white';

  let styles = {
    alignItems: 'center',
    backgroundColor: isSelected ? colors.primary : null,
    borderRadius: borderRadius,
    color: textColor,
    cursor: isDisabled ? 'default' : 'pointer',
    display: 'flex',
    flexDirection: 'column',
    fontWeight: (isSelected || isToday) && !isDisabled ? 'bold' : null,
    flexBasis: 'calc(100% / 7)',
    padding: '0.5rem',
    textAlign: 'center',
    width: 'calc(100% / 7)',

    ':hover': {
      backgroundColor: !isDisabled && !isSelected ? colors.B.L90 : null,
      color: !isDisabled && !isSelected && !isToday ? colors.B.D40 : null,
    },
    ':active': {
      backgroundColor: !isDisabled && !isSelected ? colors.B.L80 : null,
    },
  };
  return (
    <div role="gridcell" css={styles} disabled={isDisabled} {...props}>
      {date.getDate()}
      {isToday && (
        <div
          css={{
            backgroundColor: isSelected ? 'white' : colors.danger,
            borderRadius: 4,
            height: 2,
            marginBottom: -4,
            marginTop: 2,
            width: '1em',
          }}
        />
      )}
    </div>
  );
};
