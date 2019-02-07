import { useState, useEffect } from 'react';

export default function useMediaQuery(query) {
  let [matches, setMatches] = useState(false);
  useEffect(
    () => {
      let match = window.matchMedia(query.replace('@media', '').trim());
      setMatches(match.matches);
      console.log(match);
      function listener(thing) {
        console.log(thing);
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
