import { useState, useEffect } from 'react';

export default function useMediaQuery(query) {
  let [matches, setMatches] = useState(false);
  useEffect(
    () => {
      let match = window.matchMedia(query.replace('@media', '').trim());
      setMatches(match.matches);
      function listener() {
        setMatches(match.matches);
      }
      match.addListener(listener);
      return () => {
        match.removeListener(listener);
      };
    },
    [query]
  );
  return matches;
}
