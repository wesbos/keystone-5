// @flow

import React, { PureComponent, type Node } from 'react';
import styled from 'react-emotion';
import { XIcon } from '@keystonejs/icons';

import {
  makeTransitionBase,
  transitionDuration,
  withTransitionState,
} from './transitions';

import { borderRadius, colors } from '../theme';

const boldBackgroundColor = {
  info: colors.primary,
  success: colors.create,
  warning: colors.warning,
  danger: colors.danger,
};
const boldTextColor = {
  info: 'white',
  success: 'white',
  warning: 'white',
  danger: 'white',
};
const subtleBackgroundColor = {
  info: colors.B.L80,
  success: colors.G.L80,
  warning: colors.Y.L80,
  danger: colors.R.L80,
};
const subtleTextColor = {
  info: colors.B.D20,
  success: colors.G.D20,
  warning: colors.Y.D20,
  danger: colors.R.D20,
};

type Props = {
  /* Affects the visual style of the alert */
  appearance: 'info' | 'success' | 'danger' | 'warning',
  /* The alert content */
  children: Node,
  /* The value displayed within the alert. */
  variant: 'bold' | 'subtle',
};

const AlertElement = styled.div(({ appearance, variant }: Props) => ({
  backgroundColor:
    variant === 'bold'
      ? boldBackgroundColor[appearance]
      : subtleBackgroundColor[appearance],
  color:
    variant === 'bold'
      ? boldTextColor[appearance]
      : subtleTextColor[appearance],
  borderRadius,
  display: 'flex',
  fontWeight: variant === 'bold' ? 500 : null,
  minWidth: 1,
  padding: '0.9em 1.2em',

  '& a': {
    color:
      variant === 'bold'
        ? boldTextColor[appearance]
        : subtleTextColor[appearance],
    textDecoration: 'underline',
  },
}));

const DismissButton = styled.button(({ appearance, variant }) => {
  return {
    alignItems: 'center',
    backgroundColor:
      variant === 'bold'
        ? boldTextColor[appearance]
        : subtleTextColor[appearance],
    color:
      variant === 'bold'
        ? boldBackgroundColor[appearance]
        : subtleBackgroundColor[appearance],
    border: 0,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    height: 18,
    justifyContent: 'center',
    opacity: 0.66,
    outline: 0,
    transition: 'opacity 150ms',
    width: 18,

    // "squash" the SVG icon
    paddingLeft: 5,
    paddingRight: 5,

    ':hover, :focus': {
      opacity: 1,
    },
  };
});

export const Alert = ({ children, onDismiss, ...props }) => (
  <AlertElement {...props}>
    <div css={{ flex: 1 }}>{children}</div>
    {onDismiss ? (
      <DismissButton
        onClick={onDismiss}
        appearance={props.appearance}
        variant={props.variant}
      >
        <XIcon />
      </DismissButton>
    ) : null}
  </AlertElement>
);
Alert.defaultProps = {
  appearance: 'info',
  variant: 'subtle',
};

const transitionBase = makeTransitionBase('height, opacity');
class Animation extends PureComponent<*> {
  height: number;
  getHeightTransition = () => {
    const { transitionState } = this.props;
    const outerDynamic = {
      entering: { height: 0 },
      entered: { height: this.height },
      exiting: { height: 0 },
      exited: { height: 0 },
    };

    return {
      overflow: 'hidden',
      ...transitionBase,
      ...outerDynamic[transitionState],
    };
  };
  getOpacityTransition = () => {
    const { transitionState } = this.props;
    const innerDynamic = {
      entering: { opacity: 0 },
      entered: {
        opacity: 1,
        transitionDelay: transitionDuration,
      },
      exiting: { opacity: 0 },
      exited: { opacity: 0 },
    };

    return {
      ...transitionBase,
      ...innerDynamic[transitionState],
    };
  };
  getNode = ref => {
    this.height = ref ? ref.scrollHeight : 0;
  };
  render() {
    const { transitionState, ...props } = this.props;

    return (
      <div style={this.getHeightTransition()} ref={this.getNode}>
        <Alert {...props} style={this.getOpacityTransition()} />
      </div>
    );
  }
}

export const AnimatedAlert = withTransitionState(Animation);
