import React, { useState, Suspense } from 'react';
import ReactDOM from 'react-dom';
import ApolloClient, { gql } from 'apollo-boost';
import { useMutation, ApolloProvider, useQuery } from './apollo';

import styles from './styles';

const client = new ApolloClient({
  uri: '/admin/api',
});

const GET_TODOS = gql`
  query GetTodos {
    allTodos {
      name
      id
    }
  }
`;

const ADD_TODO = gql`
  mutation AddTodo($type: String!) {
    createTodo(data: { name: $type }) {
      name
      id
    }
  }
`;

const REMOVE_TODO = gql`
  mutation RemoveTodo($id: ID!) {
    deleteTodo(id: $id) {
      name
      id
    }
  }
`;

const Form = () => {
  let [value, setValue] = useState('');
  let createTodo = useMutation(ADD_TODO, {
    update: (cache, { data: { createTodo } }) => {
      const { allTodos } = cache.readQuery({ query: GET_TODOS });

      cache.writeQuery({
        query: GET_TODOS,
        data: { allTodos: allTodos.concat(createTodo) },
      });
    },
  });

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          createTodo({ variables: { type: value } });
          setValue('');
        }}
      >
        <input
          placeholder="Add new item"
          style={styles.formInput}
          className="addItem"
          value={value}
          onChange={event => {
            setValue(event.target.value);
          }}
        />
      </form>
    </div>
  );
};

const Item = props => {
  let removeTodo = useMutation(REMOVE_TODO, {
    update: (cache, { data: { deleteTodo } }) => {
      const { allTodos } = cache.readQuery({ query: GET_TODOS });
      cache.writeQuery({
        query: GET_TODOS,
        data: {
          allTodos: allTodos.filter(todo => {
            return todo.id != deleteTodo.id;
          }),
        },
      });
    },
  });
  return (
    <li style={styles.listItem}>
      {props.todo.name}
      <button
        style={styles.deleteButton}
        className="trash"
        onClick={() => {
          removeTodo({ variables: { id: props.todo.id } });
        }}
      >
        <svg viewBox="0 0 14 16" style={styles.deleteIcon}>
          <title>Delete this item</title>
          <path
            fillRule="evenodd"
            d="M11 2H9c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1H2c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1v9c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 12H3V5h1v8h1V5h1v8h1V5h1v8h1V5h1v9zm1-10H2V3h9v1z"
          />
        </svg>
      </button>
    </li>
  );
};

let List = () => {
  let data = useQuery(GET_TODOS);
  console.log(
    useQuery(gql`
      query ListMeta {
        _ksListsMeta {
          schema {
            type
            queries
            relatedFields {
              type
              fields
            }
          }
        }
      }
    `)
  );
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {data.allTodos.map((todo, index) => (
        <Item todo={todo} key={index} />
      ))}
    </ul>
  );
};

class ErrorBoundary extends React.Component {
  constructor() {
    super();
    this.state = {};
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return 'Oops, something went wrong';
    }
    return this.props.children;
  }
}

const App = () => (
  <ApolloProvider value={client}>
    <div style={styles.app}>
      <h1 style={styles.mainHeading}>To-Do List</h1>
      <ErrorBoundary>
        <Form />
        <Suspense fallback="Loading...">
          <List />
        </Suspense>
      </ErrorBoundary>
    </div>
  </ApolloProvider>
);

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
