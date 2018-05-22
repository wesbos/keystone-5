// @flow

import React, { cloneElement, type ComponentType, type Element } from 'react';
import { Transition, TransitionGroup } from 'react-transition-group';

export const transitionDurationMs = 220;
export const transitionDuration = `${transitionDurationMs}ms`;
export const transitionTimingFunction = 'cubic-bezier(0.2, 0, 0, 1)';

// ==============================
// Lifecycle Provider
// ==============================

type TransitionState = 'entering' | 'entered' | 'exiting' | 'exited';
type ProviderProps = {
  children: TransitionState => Node | Element<*>,
  duration: number,
  isOpen: boolean,
};

// Wrapper for providing transition state
export const TransitionProvider = ({
  children,
  duration,
  isOpen,
}: ProviderProps) => (
  <TransitionGroup component={null}>
    {isOpen ? (
      <Transition appear mountOnEnter unmountOnExit timeout={duration}>
        {state => children(state)}
      </Transition>
    ) : null}
  </TransitionGroup>
);
TransitionProvider.defaultProps = {
  duration: transitionDurationMs,
};

// Expose a HoC for certain cases
export const withTransitionState = (Comp: ComponentType<*>) => ({
  isOpen,
  ...props
}: ProviderProps) => {
  return (
    <TransitionProvider isOpen={isOpen}>
      {state => <Comp transitionState={state} {...props} />}
    </TransitionProvider>
  );
};

// ==============================
// Transition Reducer
// ==============================

type Styles = { [string]: string | number };
type TransitionProps = {
  children: Element<*>,
  transitionState: TransitionState,
};
type ReducerProps = {
  constant: Styles,
  dynamic: {
    entering?: Styles,
    entered?: Styles,
    exiting?: Styles,
    exited?: Styles,
  },
};

const TransitionReducer = ({
  children,
  constant,
  dynamic,
  transitionState,
}: ReducerProps & TransitionProps) => {
  const style = {
    ...constant,
    ...dynamic[transitionState],
  };

  return cloneElement(children, { style });
};

// ==============================
// Transitions
// ==============================

export function makeTransitionBase(transitionProperty: string) {
  return { transitionProperty, transitionDuration, transitionTimingFunction };
}

// Fade
// ------------------------------

export const Fade = (props: TransitionProps) => (
  <TransitionReducer
    constant={makeTransitionBase('opacity')}
    dynamic={{
      entering: { opacity: 1 },
      entered: { opacity: 1 },
      exiting: { opacity: 0 },
      exited: { opacity: 0 },
    }}
    {...props}
  />
);

// Slide Up
// ------------------------------

export const SlideUp = (props: TransitionProps) => {
  const out = {
    opacity: 0,
    transform: 'scale(0.95) translate3d(0,20px,0)',
  };
  return (
    <TransitionReducer
      constant={makeTransitionBase('opacity, transform')}
      dynamic={{
        entering: { opacity: 1 },
        entered: { opacity: 1 },
        exiting: out,
        exited: out,
      }}
      {...props}
    />
  );
};

// Slide Down
// ------------------------------

export const SlideDown = (props: TransitionProps) => {
  const out = {
    opacity: 0,
    transform: 'translate3d(0,-8px,0)',
  };
  return (
    <TransitionReducer
      constant={makeTransitionBase('opacity, transform')}
      dynamic={{
        entering: { opacity: 1, transform: 'translate3d(0,0,0)' },
        entered: { opacity: 1, transform: 'translate3d(0,0,0)' },
        exiting: out,
        exited: out,
      }}
      {...props}
    />
  );
};
