import { useEffect, useState } from 'react';

function isChildElementFocussed(root, currentEle = document.activeElement) {
  return currentEle && (currentEle === root || isChildElementFocussed(root, currentEle.parentNode));
}

export default function useIsChildFocussed(ref) {
  let [isFocussed, setIsFocussed] = useState(false);

  useEffect(() => {
    setIsFocussed(isChildElementFocussed(ref.current));
  });
  return isFocussed;
}
