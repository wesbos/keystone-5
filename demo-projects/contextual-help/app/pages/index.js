import ApolloClient from 'apollo-client';
import { ApolloProvider} from 'react-apollo';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import fetch from 'node-fetch';

import { jsx } from '@emotion/core';
import Layout from '../templates/layout';
import Header from '../components/header';

/** @jsx jsx */

const client = new ApolloClient({
  link: new HttpLink({ uri: '/admin/api', fetch: fetch }),
  cache: new InMemoryCache(),
});

export default () => (
  <ApolloProvider client={client}>
    <Layout>
      <Header />
    </Layout>
  </ApolloProvider>
);
