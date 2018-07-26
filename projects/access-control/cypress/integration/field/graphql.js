/* eslint-disable jest/valid-expect */
const {
  getStaticListName,
  listNameToCollectionName,
  fieldAccessVariations,
  getFieldName,
  stayLoggedIn,
} = require('../util');

const FAKE_ID = '5b3eabd9e9f2e3e4866742ea';
const FAKE_ID_2 = '5b3eabd9e9f2e3e4866742eb';

const staticList = getStaticListName({ create: true, read: true, update: true, delete: true });
const staticCollection = listNameToCollectionName(staticList);

const imperativeList = getStaticListName({ create: true, read: true, update: true, delete: true });
const imperativeCollection = listNameToCollectionName(imperativeList);

const identity = val => val;

const arrayToObject = (items, keyedBy, mapFn = identity) => items.reduce(
  (memo, item) => Object.assign(memo, { [item[keyedBy]]: mapFn(item) }),
  {}
);

describe('Access Control, Field, GraphQL', () => {
  describe('Schema', () => {
    let queries;
    let mutations;
    let types;

    function sanityCheckGraphQL() {
      // check to make sure we're not getting false positives
      return Promise.all([
        expect(types).to.have.property('User'),
        expect(queries).to.have.property('allUsers'),
        expect(mutations).to.have.property('createUser'),
      ]);
    }

    stayLoggedIn('su');

    before(() =>
      // Check graphql types via introspection
      cy
        .graphql_query(
          '/admin/api',
          `{
          __schema {
            types {
              name
              fields {
                name
              }
              inputFields {
                name
              }
            }
            queryType {
              fields {
                name
              }
            }
            mutationType {
              fields {
                name
              }
            }
          }
        }`
        )
        .then(({ data: { __schema } }) => {
          queries = arrayToObject(__schema.queryType.fields, 'name');
          mutations = arrayToObject(__schema.mutationType.fields, 'name');
          types = arrayToObject(
            __schema.types,
            'name',
            type => Object.assign({}, type, {
              fields: arrayToObject(type.fields || [], 'name'),
              inputFields: arrayToObject(type.inputFields || [], 'name'),
            }),
          );
        })
    );

    describe.only('static', () => {
      it('sanity check', () => {
        sanityCheckGraphQL();
      });

      fieldAccessVariations.forEach(access => {
        it.only(`${JSON.stringify(access)} on ${staticList}`, () => {
          const name = getFieldName(access);

          expect(types, 'types').to.have.deep.property(`${staticList}.fields`);

          const fields = types[staticList].fields;

          if (access.read) {
            expect(fields, 'fields').to.have.property(name);
          } else {
            expect(fields, 'fields').to.not.have.property(name);
          }

          // Filter types are only used when reading
          expect(types, 'types').to.have.deep.property(`${staticList}WhereInput.inputFields`);
          if (access.read) {
            expect(types, 'types').to.have.deep.property(`${staticList}WhereInput.inputFields.${name}`);
          } else {
            expect(types, 'types').to.not.have.deep.property(`${staticList}WhereInput.inputFields.${name}`);
          }

            /*
          // Queries are only accessible when reading
          if (access.read) {
            expect(queries, 'queries').to.have.property(name);
            expect(queries, 'queries').to.have.property(`all${name}s`);
            expect(queries, 'queries').to.have.property(`_all${name}sMeta`);
          } else {
            expect(queries, 'queries').to.not.have.property(name);
            expect(queries, 'queries').to.not.have.property(`all${name}s`);
            expect(queries, 'queries').to.not.have.property(`_all${name}sMeta`);
          }

          if (access.create) {
            expect(mutations, 'mutations').to.have.property(`create${name}`);
          } else {
            expect(mutations, 'mutations').to.not.have.property(`create${name}`);
          }

          if (access.update) {
            expect(mutations, 'mutations').to.have.property(`update${name}`);
          } else {
            expect(mutations, 'mutations').to.not.have.property(`update${name}`);
          }
          */
        });
      });
    });

    describe('imperative', () => {
      it('sanity check', () => {
        sanityCheckGraphQL();
      });

      fieldAccessVariations.forEach(access => {
        it(JSON.stringify(access), () => {
          const name = getImperativeListName(access);

          // All types, etc, are included when imperative no matter the config (because
          // it can't be resolved until runtime)
          expect(types, 'types').include(`${name}`);
          expect(types, 'types').include(`${name}WhereInput`);
          expect(types, 'types').include(`${name}WhereUniqueInput`);

          expect(queries, 'queries').include(`${name}`);
          expect(queries, 'queries').include(`all${name}s`);
          expect(queries, 'queries').include(`_all${name}sMeta`);

          expect(mutations, 'mutations').include(`create${name}`);
          expect(mutations, 'mutations').include(`update${name}`);
          expect(mutations, 'mutations').include(`delete${name}`);
        });
      });
    });

    describe('declarative', () => {
      it('sanity check', () => {
        sanityCheckGraphQL();
      });

      fieldAccessVariations.forEach(access => {
        it(JSON.stringify(access), () => {
          const name = getDeclarativeListName(access);

          // All types, etc, are included when declarative no matter the config (because
          // it can't be resolved until runtime)
          expect(types, 'types').to.have.property(name);
          expect(types, 'types').to.have.property(`${name}WhereInput`);
          expect(types, 'types').to.have.property(`${name}WhereUniqueInput`);

          expect(queries, 'queries').to.have.property(name);
          expect(queries, 'queries').to.have.property(`all${name}s`);
          expect(queries, 'queries').to.have.property(`_all${name}sMeta`);

          expect(mutations, 'mutations').to.have.property(`create${name}`);
          expect(mutations, 'mutations').to.have.property(`update${name}`);
          expect(mutations, 'mutations').to.have.property(`delete${name}`);
        });
      });
    });
  });

  describe('performing actions', () => {
    describe('imperative based on user', () => {
      describe('logged out', () => {
        before(() => {
          cy.visit('/admin/signout');
          cy.visit('/admin');
        });

        describe('create', () => {
          fieldAccessVariations.filter(({ create }) => !create).forEach(access => {
            it(`denied: ${JSON.stringify(access)}`, () => {
              const createMutationName = `create${getImperativeListName(access)}`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${createMutationName}(data: { foo: "bar" }) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'create mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'create mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'create mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    createMutationName
                  );
                });
            });
          });
        });

        describe('query', () => {
          fieldAccessVariations.filter(({ read }) => !read).forEach(access => {
            it(`'all' denied: ${JSON.stringify(access)}`, () => {
              const allQueryName = `all${getImperativeListName(access)}s`;
              cy
                .graphql_query('/admin/api', `query { ${allQueryName} { id } }`)
                .then(({ errors }) => {
                  expect(errors, 'allQuery Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'allQuery Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'allQuery Errors').to.have.deep.property(
                    '[0].path[0]',
                    allQueryName
                  );
                });
            });

            it(`meta denied: ${JSON.stringify(access)}`, () => {
              const metaName = `_all${getImperativeListName(access)}sMeta`;
              cy
                .graphql_query('/admin/api', `query { ${metaName} { count } }`)
                .then(({ errors }) => {
                  expect(errors, 'meta Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'meta Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'meta Errors').to.have.deep.property(
                    '[0].path[0]',
                    metaName
                  );
                });
            });

            it(`single denied: ${JSON.stringify(access)}`, () => {
              const singleQueryName = getImperativeListName(access);
              cy
                .graphql_query(
                  '/admin/api',
                  `query { ${singleQueryName}(where: { id: "abc123" }) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'singleQuery Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'singleQuery Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'singleQuery Errors').to.have.deep.property(
                    '[0].path[0]',
                    singleQueryName
                  );
                });
            });
          });
        });

        describe('update', () => {
          fieldAccessVariations.filter(({ update }) => !update).forEach(access => {
            it(`denies: ${JSON.stringify(access)}`, () => {
              const updateMutationName = `update${getImperativeListName(access)}`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${updateMutationName}(id: "${FAKE_ID}", data: { foo: "bar" }) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'update mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'update mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'update mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    updateMutationName
                  );
                });
            });
          });
        });

        describe('delete', () => {
          fieldAccessVariations.filter(access => !access.delete).forEach(access => {
            it(`single denied: ${JSON.stringify(access)}`, () => {
              const deleteMutationName = `delete${getImperativeListName(access)}`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${deleteMutationName}(id: "${FAKE_ID}") { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    deleteMutationName
                  );
                });
            });

            it(`multi denied: ${JSON.stringify(access)}`, () => {
              const multiDeleteMutationName = `delete${getImperativeListName(access)}s`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${multiDeleteMutationName}(ids: ["${FAKE_ID}"]) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    multiDeleteMutationName
                  );
                });
            });
          });
        });
      });

      describe('logged in', () => {
        stayLoggedIn('su');

        describe('create', () => {
          fieldAccessVariations.filter(({ create }) => create).forEach(access => {
            it(`allowed: ${JSON.stringify(access)}`, () => {
              const createMutationName = `create${getImperativeListName(access)}`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${createMutationName}(data: { foo: "bar" }) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'create mutation Errors').to.equal(undefined);
                  expect(
                    data[createMutationName],
                    `createMutation data.${createMutationName}`
                  ).to.have.property('id');
                });
            });
          });
        });

        describe('query', () => {
          fieldAccessVariations.filter(({ read }) => read).forEach(access => {
            it(`'all' allowed: ${JSON.stringify(access)}`, () => {
              const allQueryName = `all${getImperativeListName(access)}s`;
              cy
                .graphql_query('/admin/api', `query { ${allQueryName} { id } }`)
                .then(({ data, errors }) => {
                  expect(errors, 'allQuery Errors').to.equal(undefined);
                  expect(
                    data[allQueryName],
                    `allQuery data.${allQueryName}`
                  ).to.have.property('length');
                });
            });

            it(`meta allowed: ${JSON.stringify(access)}`, () => {
              const metaName = `_all${getImperativeListName(access)}sMeta`;
              cy
                .graphql_query('/admin/api', `query { ${metaName} { count } }`)
                .then(({ data, errors }) => {
                  expect(errors, 'meta Errors').to.equal(undefined);
                  expect(
                    data[metaName].count,
                    `meta data.${metaName}.count`
                  ).to.be.gte(0);
                });
            });

            it(`single allowed: ${JSON.stringify(access)}`, () => {
              const singleQueryName = getImperativeListName(access);
              cy
                .graphql_query(
                  '/admin/api',
                  `query { ${singleQueryName}(where: { id: "${FAKE_ID}" }) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'single query Errors').to.equal(undefined);
                  expect(
                    data[singleQueryName],
                    `meta data.${singleQueryName}`
                  ).to.equal(null);
                });
            });
          });
        });

        describe('update', () => {
          fieldAccessVariations.filter(({ update }) => update).forEach(access => {
            it(`allowed: ${JSON.stringify(access)}`, () => {
              const updateMutationName = `update${getImperativeListName(access)}`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${updateMutationName}(id: "${FAKE_ID}", data: { foo: "bar" }) { id } }`
                )
                .then(({ errors }) => {
                  // It errors because it's a fake ID.
                  // That's ok, as long as it's not an AccessDeniedError.
                  // We test that updates actually work elsewhere.
                  expect(
                    errors[0],
                    'update mutation Errors'
                  ).to.not.have.ownProperty('name');
                  expect(
                    errors[0],
                    'update mutation Errors'
                  ).to.not.have.property(
                    'message',
                    'You do not have access to this resource'
                  );
                });
            });
          });
        });

        describe('delete', () => {
          fieldAccessVariations.filter(access => access.delete).forEach(access => {
            it(`single allowed: ${JSON.stringify(access)}`, () => {
              const deleteMutationName = `delete${getImperativeListName(access)}`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${deleteMutationName}(id: "${FAKE_ID}") { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'delete mutation Errors').to.equal(undefined);
                  expect(data, 'deleteMutation data').to.have.ownProperty(
                    deleteMutationName
                  );
                });
            });

            it(`multi allowed: ${JSON.stringify(access)}`, () => {
              const multiDeleteMutationName = `delete${getImperativeListName(access)}s`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${multiDeleteMutationName}(ids: ["${FAKE_ID}"]) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'delete mutation Errors').to.equal(undefined);
                  expect(data, 'deleteMutation data').to.have.ownProperty(
                    multiDeleteMutationName
                  );
                });
            });
          });
        });

        describe('disallowed', () => {
          before(() => cy.visit('/admin'));

          describe('create', () => {
            fieldAccessVariations.filter(({ create }) => !create).forEach(access => {
              it(`denied: ${JSON.stringify(access)}`, () => {
                const createMutationName = `create${getImperativeListName(access)}`;

                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${createMutationName}(data: { foo: "bar" }) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'create mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'create mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'create mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      createMutationName
                    );
                  });
              });
            });
          });

          describe('query', () => {
            fieldAccessVariations.filter(({ read }) => !read).forEach(access => {
              it(`'all' denied: ${JSON.stringify(access)}`, () => {
                const allQueryName = `all${getImperativeListName(access)}s`;
                cy
                  .graphql_query('/admin/api', `query { ${allQueryName} { id } }`)
                  .then(({ errors }) => {
                    expect(errors, 'allQuery Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'allQuery Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'allQuery Errors').to.have.deep.property(
                      '[0].path[0]',
                      allQueryName
                    );
                  });
              });

              it(`meta denied: ${JSON.stringify(access)}`, () => {
                const metaName = `_all${getImperativeListName(access)}sMeta`;
                cy
                  .graphql_query('/admin/api', `query { ${metaName} { count } }`)
                  .then(({ errors }) => {
                    expect(errors, 'meta Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'meta Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'meta Errors').to.have.deep.property(
                      '[0].path[0]',
                      metaName
                    );
                  });
              });

              it(`single denied: ${JSON.stringify(access)}`, () => {
                const singleQueryName = getImperativeListName(access);
                cy
                  .graphql_query(
                    '/admin/api',
                    `query { ${singleQueryName}(where: { id: "abc123" }) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'singleQuery Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'singleQuery Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'singleQuery Errors').to.have.deep.property(
                      '[0].path[0]',
                      singleQueryName
                    );
                  });
              });
            });
          });

          describe('update', () => {
            fieldAccessVariations.filter(({ update }) => !update).forEach(access => {
              it(`denies: ${JSON.stringify(access)}`, () => {
                const updateMutationName = `update${getImperativeListName(access)}`;
                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${updateMutationName}(id: "${FAKE_ID}", data: { foo: "bar" }) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'update mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'update mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'update mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      updateMutationName
                    );
                  });
              });
            });
          });

          describe('delete', () => {
            fieldAccessVariations.filter(access => !access.delete).forEach(access => {
              it(`single denied: ${JSON.stringify(access)}`, () => {
                const deleteMutationName = `delete${getImperativeListName(access)}`;
                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${deleteMutationName}(id: "${FAKE_ID}") { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      deleteMutationName
                    );
                  });
              });

              it(`multi denied: ${JSON.stringify(access)}`, () => {
                const multiDeleteMutationName = `delete${getImperativeListName(access)}s`;
                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${multiDeleteMutationName}(ids: ["${FAKE_ID}"]) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      multiDeleteMutationName
                    );
                  });
              });
            });
          });
        });
      });
    });

    describe('declarative based on user', () => {
      describe('logged out', () => {
        before(() => cy.visit('/admin'));

        describe('create', () => {
          fieldAccessVariations.filter(({ create }) => create).forEach(access => {
            it(`denied: ${JSON.stringify(access)}`, () => {
              const createMutationName = `create${getDeclarativeListName(access)}`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${createMutationName}(data: { foo: "bar" }) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'create mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'create mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'create mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    createMutationName
                  );
                });
            });
          });
        });

        describe('query', () => {
          fieldAccessVariations.filter(({ read }) => read).forEach(access => {
            it(`'all' denied: ${JSON.stringify(access)}`, () => {
              const allQueryName = `all${getDeclarativeListName(access)}s`;
              cy
                .graphql_query('/admin/api', `query { ${allQueryName} { id } }`)
                .then(({ errors }) => {
                  expect(errors, 'allQuery Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'allQuery Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'allQuery Errors').to.have.deep.property(
                    '[0].path[0]',
                    allQueryName
                  );
                });
            });

            it(`meta denied: ${JSON.stringify(access)}`, () => {
              const metaName = `_all${getDeclarativeListName(access)}sMeta`;
              cy
                .graphql_query('/admin/api', `query { ${metaName} { count } }`)
                .then(({ errors }) => {
                  expect(errors, 'meta Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'meta Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'meta Errors').to.have.deep.property(
                    '[0].path[0]',
                    metaName
                  );
                });
            });

            it(`single denied: ${JSON.stringify(access)}`, () => {
              const singleQueryName = getDeclarativeListName(access);
              cy
                .graphql_query(
                  '/admin/api',
                  `query { ${singleQueryName}(where: { id: "abc123" }) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'singleQuery Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'singleQuery Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'singleQuery Errors').to.have.deep.property(
                    '[0].path[0]',
                    singleQueryName
                  );
                });
            });
          });
        });

        describe('update', () => {
          fieldAccessVariations.filter(({ update }) => update).forEach(access => {
            it(`denied: ${JSON.stringify(access)}`, () => {
              const updateMutationName = `update${getDeclarativeListName(access)}`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${updateMutationName}(id: "${FAKE_ID}", data: { foo: "bar" }) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'update mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'update mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'update mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    updateMutationName
                  );
                });
            });
          });
        });

        describe('delete', () => {
          fieldAccessVariations.filter(access => access.delete).forEach(access => {
            it(`single denied: ${JSON.stringify(access)}`, () => {
              const deleteMutationName = `delete${getDeclarativeListName(access)}`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${deleteMutationName}(id: "${FAKE_ID}") { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    deleteMutationName
                  );
                });
            });

            it(`multiple denied: ${JSON.stringify(access)}`, () => {
              const multiDeleteMutationName = `delete${getDeclarativeListName(access)}s`;
              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${multiDeleteMutationName}(ids: ["${FAKE_ID}"]) { id } }`
                )
                .then(({ errors }) => {
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'delete mutation Errors').to.have.deep.property(
                    '[0].path[0]',
                    multiDeleteMutationName
                  );
                });
            });
          });
        });
      });

      describe('logged in', () => {
        stayLoggedIn('su');

        describe('create', () => {
          fieldAccessVariations.filter(({ create }) => create).forEach(access => {
            it(`allowed: ${JSON.stringify(access)}`, () => {
              const createMutationName = `create${getDeclarativeListName(access)}`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${createMutationName}(data: { foo: "bar" }) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'create mutation Errors').to.equal(undefined);
                  expect(
                    data[createMutationName],
                    `createMutation data.${createMutationName}`
                  ).to.have.property('id');
                });
            });
          });
        });

        describe('query', () => {
          fieldAccessVariations.filter(({ read }) => read).forEach(access => {
            it(`'all' allowed: ${JSON.stringify(access)}`, () => {
              const allQueryName = `all${getDeclarativeListName(access)}s`;
              cy
                .graphql_query('/admin/api', `query { ${allQueryName} { id } }`)
                .then(({ data, errors }) => {
                  expect(errors, 'allQuery Errors').to.equal(undefined);
                  expect(
                    data[allQueryName],
                    `allQuery data.${allQueryName}`
                  ).to.have.property('length');
                });
            });

            it(`meta allowed: ${JSON.stringify(access)}`, () => {
              const metaName = `_all${getDeclarativeListName(access)}sMeta`;
              cy
                .graphql_query('/admin/api', `query { ${metaName} { count } }`)
                .then(({ data, errors }) => {
                  expect(errors, 'meta Errors').to.equal(undefined);
                  expect(
                    data[metaName].count,
                    `meta data.${metaName}.count`
                  ).to.be.gte(0);
                });
            });

            it(`single allowed: ${JSON.stringify(access)}`, () => {
              const singleQueryName = getDeclarativeListName(access);
              const collection = listNameToCollectionName(singleQueryName);

              cy.task('mongoFind', { collection, query: {} }).then(items => {
                // filter items for foo: 'Hello', then pick THAT id.
                const item = items.find(({ foo }) => foo === 'Hello');
                return cy
                  .graphql_query(
                    '/admin/api',
                    `query { ${singleQueryName}(where: { id: "${item.id}" }) { id } }`
                  )
                  .then(({ data, errors }) => {
                    expect(errors, 'single query Errors').to.equal(undefined);
                    expect(data, 'single query data').to.have.deep.property(
                      `${singleQueryName}.id`,
                      item.id,
                    );
                  });
              });
            });

            it(`single denied when filtered out: ${JSON.stringify(access)}`, () => {
              const singleQueryName = getDeclarativeListName(access);
              cy
                .graphql_query(
                  '/admin/api',
                  `query { ${singleQueryName}(where: { id: "${FAKE_ID}" }) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(data, 'data').to.equal(undefined);
                  expect(errors, 'error name').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'error message').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'error path').to.have.deep.property(
                    '[0].path[0]',
                    singleQueryName
                  );
                });
            });

            it(`all returns empty array when filtered out: ${JSON.stringify(access)}`, () => {
              const allQueryName = `all${getDeclarativeListName(access)}s`;
              cy
                .graphql_query(
                  '/admin/api',
                  `query { ${allQueryName}(where: { id_in: ["${FAKE_ID}", "${FAKE_ID_2}"] }) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'multi query denied Errors').to.equal(undefined);
                  expect(data, 'multi query denied data').to.have.property(allQueryName);
                  expect(data[allQueryName], 'multi query denied data').to.deep.equal([]);
                });
            });
          });
        });

        describe('update', () => {
          fieldAccessVariations.filter(({ update }) => update).forEach(access => {
            it(`allowed: ${JSON.stringify(access)}`, () => {
              const list = getDeclarativeListName(access);
              const collection = listNameToCollectionName(list);

              cy.task('mongoFind', { collection, query: {} }).then(items => {
                // filter items for foo: 'Hello', then pick THAT id.
                const item = items.find(({ foo }) => foo === 'Hello');
                const updateMutationName = `update${list}`;

                return cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${updateMutationName}(id: "${item.id}", data: { zip: "bar" }) { id } }`
                  )
                  .then(({ data, errors }) => {
                    expect(errors, 'update mutation Errors').to.equal(undefined);
                    expect(data, 'update mutation data').to.have.deep.property(
                      `${updateMutationName}.id`,
                      item.id,
                    );
                    //expect(data, 'update mutation data').to.have.deep.property(
                    //  `${updateMutationName}.zip`,
                    //  'bar',
                    //);
                  });
              });
            });

            it(`denied when filtered out: ${JSON.stringify(access)}`, () => {
              const list = getDeclarativeListName(access);
              const updateMutationName = `update${list}`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${updateMutationName}(id: "${FAKE_ID}", data: { zip: "bar" }) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(data, 'data').to.equal(undefined);
                  expect(errors, 'error name').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'error message').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'error path').to.have.deep.property(
                    '[0].path[0]',
                    updateMutationName
                  );
                });
            });
          });
        });

        describe('delete', () => {
          fieldAccessVariations.filter(access => access.delete).forEach(access => {
            it(`single allowed: ${JSON.stringify(access)}`, () => {
              const list = getDeclarativeListName(access);
              const collection = listNameToCollectionName(list);
              // First, insert an item that can be deleted
              cy.task('mongoInsertOne', { collection, document: { foo: 'Hello', zip: 'zap' } }).then(({ id }) => {

                const deleteMutationName = `delete${list}`;
                return cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${deleteMutationName}(id: "${id}") { id } }`
                  )
                  .then(({ data, errors }) => {
                    expect(errors, 'delete mutation Errors').to.equal(undefined);
                    expect(data, 'deleteMutation data').to.have.ownProperty(
                      deleteMutationName
                    );
                    expect(data, 'deleteMutation id').to.have.deep.property(
                      `${deleteMutationName}.id`,
                      id,
                    );
                  });
              });
            });

            it(`single denied when filtered out: ${JSON.stringify(access)}`, () => {
              const list = getDeclarativeListName(access);
              const deleteMutationName = `delete${list}`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${deleteMutationName}(id: "${FAKE_ID}") { id } }`
                )
                .then(({ data, errors }) => {
                  expect(data, 'data').to.equal(undefined);
                  expect(errors, 'error name').to.have.deep.property(
                    '[0].name',
                    'AccessDeniedError'
                  );
                  expect(errors, 'error message').to.have.deep.property(
                    '[0].message',
                    'You do not have access to this resource'
                  );
                  expect(errors, 'error path').to.have.deep.property(
                    '[0].path[0]',
                    deleteMutationName
                  );
                });
            });

            it(`multi allowed: ${JSON.stringify(access)}`, () => {
              const list = getDeclarativeListName(access);
              const collection = listNameToCollectionName(list);
              // First, insert an item that can be deleted
              cy.task('mongoInsertOne', { collection, document: { foo: 'Hello', zip: 'zap' } }).then(({ id: id1 }) => {
                return cy.task('mongoInsertOne', { collection, document: { foo: 'Hello', zip: 'zing' } }).then(({ id: id2 }) => {

                  const multiDeleteMutationName = `delete${list}s`;
                  return cy
                    .graphql_mutate(
                      '/admin/api',
                      `mutation { ${multiDeleteMutationName}(ids: ["${id1}", "${id2}"]) { id } }`
                    )
                    .then(({ data, errors }) => {
                      expect(errors, 'delete mutation Errors').to.equal(undefined);
                      expect(data, 'deleteMutation data').to.have.ownProperty(
                        multiDeleteMutationName
                      );
                    });
                });
              });
            });

            it(`multi denied when filtered out: ${JSON.stringify(access)}`, () => {
              const list = getDeclarativeListName(access);
              const multiDeleteMutationName = `delete${list}s`;

              cy
                .graphql_mutate(
                  '/admin/api',
                  `mutation { ${multiDeleteMutationName}(ids: ["${FAKE_ID}", "${FAKE_ID_2}"]) { id } }`
                )
                .then(({ data, errors }) => {
                  expect(errors, 'multi query denied Errors').to.equal(undefined);
                  expect(data, 'multi query denied data').to.have.property(multiDeleteMutationName);
                  expect(data[multiDeleteMutationName], 'multi query denied data').to.deep.equal([]);
                });
            });
          });
        });

        describe('disallowed', () => {
          before(() => cy.visit('/admin'));

          describe('create', () => {
            fieldAccessVariations.filter(({ create }) => !create).forEach(access => {
              it(`denied: ${JSON.stringify(access)}`, () => {
                const createMutationName = `create${getDeclarativeListName(access)}`;

                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${createMutationName}(data: { foo: "bar" }) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'create mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'create mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'create mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      createMutationName
                    );
                  });
              });
            });
          });

          describe('query', () => {
            fieldAccessVariations.filter(({ read }) => !read).forEach(access => {
              it(`'all' denied: ${JSON.stringify(access)}`, () => {
                const allQueryName = `all${getDeclarativeListName(access)}s`;
                cy
                  .graphql_query('/admin/api', `query { ${allQueryName} { id } }`)
                  .then(({ errors }) => {
                    expect(errors, 'allQuery Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'allQuery Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'allQuery Errors').to.have.deep.property(
                      '[0].path[0]',
                      allQueryName
                    );
                  });
              });

              it(`meta denied: ${JSON.stringify(access)}`, () => {
                const metaName = `_all${getDeclarativeListName(access)}sMeta`;
                cy
                  .graphql_query('/admin/api', `query { ${metaName} { count } }`)
                  .then((result) => {
                    const errors = result.errors;
                    expect(errors, 'meta Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'meta Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'meta Errors').to.have.deep.property(
                      '[0].path[0]',
                      metaName
                    );
                  });
              });

              it(`single denied: ${JSON.stringify(access)}`, () => {
                const singleQueryName = getDeclarativeListName(access);
                cy
                  .graphql_query(
                    '/admin/api',
                    `query { ${singleQueryName}(where: { id: "abc123" }) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'singleQuery Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'singleQuery Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'singleQuery Errors').to.have.deep.property(
                      '[0].path[0]',
                      singleQueryName
                    );
                  });
              });
            });
          });

          describe('update', () => {
            fieldAccessVariations.filter(({ update }) => !update).forEach(access => {
              it(`denies: ${JSON.stringify(access)}`, () => {
                const updateMutationName = `update${getDeclarativeListName(access)}`;
                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${updateMutationName}(id: "${FAKE_ID}", data: { foo: "bar" }) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'update mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'update mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'update mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      updateMutationName
                    );
                  });
              });
            });
          });

          describe('delete', () => {
            fieldAccessVariations.filter(access => !access.delete).forEach(access => {
              it(`single denied: ${JSON.stringify(access)}`, () => {
                const deleteMutationName = `delete${getDeclarativeListName(access)}`;
                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${deleteMutationName}(id: "${FAKE_ID}") { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      deleteMutationName
                    );
                  });
              });

              it(`multi denied: ${JSON.stringify(access)}`, () => {
                const multiDeleteMutationName = `delete${getDeclarativeListName(access)}s`;
                cy
                  .graphql_mutate(
                    '/admin/api',
                    `mutation { ${multiDeleteMutationName}(ids: ["${FAKE_ID}"]) { id } }`
                  )
                  .then(({ errors }) => {
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].name',
                      'AccessDeniedError'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].message',
                      'You do not have access to this resource'
                    );
                    expect(errors, 'delete mutation Errors').to.have.deep.property(
                      '[0].path[0]',
                      multiDeleteMutationName
                    );
                  });
              });
            });
          });
        });
      });
    });
  });
});
