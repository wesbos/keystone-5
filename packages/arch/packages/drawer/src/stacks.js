// @flow
// inspired by https://bitbucket.org/atlassian/atlaskit-mk-2/src/75c59d2c870d7e2489d6baea9a6837f9bd4082c4/packages/core/modal-dialog/src/components/StackConsumer.js
// but with a hook
// some comments are new and some are from atlaskit
import { useLayoutEffect, useState } from 'react';

// This is the source of truth for open modals
// TODO: investigate if this will cause problems with concurrent mode
let stackConsumers = [];

let updateStackConsumers = () => {
  stackConsumers.forEach(update => {
    update();
  });
};

// This hook provides the position of a modal dialog in the list of all open dialogs.
// The key behaviours are:
// - When a modal renders for the first time it takes the first stack position
// - When a modal mounts, all other modals have to adjust their position
// - When a modal unmounts, all other modals have to adjust their position

export function useStackIndex(isOpen: boolean): number {
  let [stackIndex, setStackIndex] = useState(isOpen ? 0 : -1);
  useLayoutEffect(() => {
    if (isOpen) {
      let update = () => {
        setStackIndex(stackConsumers.indexOf(update));
      };
      stackConsumers.unshift(update);
      updateStackConsumers();
      return () => {
        stackConsumers = stackConsumers.filter(x => x !== update);
        updateStackConsumers();
      };
    } else {
      setStackIndex(-1);
    }
  }, [isOpen]);
  return stackIndex;
}
