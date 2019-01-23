import React, { useContext, useEffect, useState } from 'react';
import weakMemoize from '@emotion/weak-memoize';

const ApolloContext = React.createContext();

export let ApolloProvider = ApolloContext.Provider;

export function useApolloClient() {
  return useContext(ApolloContext);
}

let getObservableCache = weakMemoize(() => weakMemoize(() => ({})));

export function useQuery(query, options) {
  let client = useApolloClient();
  if (!client) {
    throw new Error('Please add an ApolloProvider to the top of your tree');
  }
  let observableCache = getObservableCache(client)(query);
  let key = JSON.stringify(options);
  if (observableCache[key] === undefined) {
    observableCache[key] = client.watchQuery({ query, ...options });
  }
  let observable = observableCache[key];
  let [, forceUpdate] = useState();

  useEffect(
    () => {
      const subscription = observable.subscribe(() => {
        forceUpdate();
      });
      return () => {
        subscription.unsubscribe();
      };
    },
    [observable]
  );

  let { data, error, loading } = observable.currentResult();

  if (error) {
    throw error;
  }
  if (!loading) {
    return data;
  }
  throw observable.result();
}

export function useMutation(mutation, baseOptions) {
  const client = useApolloClient();
  return localOptions => client.mutate({ mutation, ...baseOptions, ...localOptions });
}
