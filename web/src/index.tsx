import {
  ApolloClient,
  ApolloLink,
  concat,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { ApolloProvider } from '@apollo/client';
import * as ReactDOM from 'react-dom';
import { getAccessToken } from './accessToken';
import { App } from './App';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
  credentials: 'include',
});

const authMiddleware = new ApolloLink((operation, forward) => {
  // add the authorization to the headers
  const accessToken = getAccessToken();
  operation.setContext({
    headers: {
      authorization: accessToken ? `bearer ${accessToken}` : '',
    },
  });
  return forward(operation);
});

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: concat(authMiddleware, httpLink),
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
);
