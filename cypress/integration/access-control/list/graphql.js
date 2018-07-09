/* eslint-disable jest/valid-expect */
const { User: users } = require('../../../../projects/access-control/data');

const usersByLevel = users.reduce(
  (memo, user) => {
    memo[user.level] = memo[user.level] || [];
    memo[user.level].push(user);
    return memo;
  },
  {},
);

const accessCombinations = [
  { create: false, read: false, update: false, delete: false },
  { create: true,  read: false, update: false, delete: false },
  { create: false, read: true,  update: false, delete: false },
  { create: true,  read: true,  update: false, delete: false },
  { create: false, read: false, update: true,  delete: false },
  { create: true,  read: false, update: true,  delete: false },
  { create: false, read: true,  update: true,  delete: false },
  { create: true,  read: true,  update: true,  delete: false },
  { create: false, read: false, update: false, delete: true },
  { create: true,  read: false, update: false, delete: true },
  { create: false, read: true,  update: false, delete: true },
  { create: true,  read: true,  update: false, delete: true },
  { create: false, read: false, update: true,  delete: true },
  { create: true,  read: false, update: true,  delete: true },
  { create: false, read: true,  update: true,  delete: true },
  { create: true,  read: true,  update: true,  delete: true },
];

describe('Access Control, List, GraphQL', () => {
  let queries;
  let mutations;
  let types;

  function sanityCheckGraphQL() {
    // check to make sure we're not getting false positives
    expect(types).include('User');
    expect(queries).include('allUsers');
    expect(mutations).include('createUser');
  }

  beforeEach(() => {
    cy
      .task('getProjectInfo', 'access-control')
      .then(({ env: { PORT } }) => {
        cy.loginToKeystone(usersByLevel['su'][0].email, usersByLevel['su'][0].password, PORT)
          .then(() =>
            // Check graphql types via introspection
            cy.graphql_query(
              `http://localhost:${PORT}/admin/api`,
              `{
                __schema {
                  types {
                    name
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
              }`,
            )
          )
          .then(({ data: { __schema } }) => {
            queries = __schema.queryType.fields.map(({ name }) => name);
            mutations = __schema.mutationType.fields.map(({ name }) => name);
            types = __schema.types.map(({ name }) => name);
          });
      });
  });

  function yesNo(truthy) {
    return truthy ? 'Yes' : 'No';
  }

  function getStaticListName(access) {
    return `${yesNo(access.create)}Create${yesNo(access.read)}Read${yesNo(access.update)}Update${yesNo(access.delete)}DeleteStaticList`;
  }

  function getDynamicListName(access) {
    return `${yesNo(access.create)}Create${yesNo(access.read)}Read${yesNo(access.update)}Update${yesNo(access.delete)}DeleteDynamicList`;
  }

  describe('static', () => {

    accessCombinations.forEach(access => {

      it(JSON.stringify(access), () => {
        sanityCheckGraphQL();

        const name = getStaticListName(access);

        // The type is used in all the queries and mutations as a return type
        if (access.create || access.read || access.update || access.delete) {
          expect(types, 'types').include(`${name}`);
        } else {
          expect(types, 'types').not.include(`${name}`);
        }

        // Filter types are only used when reading
        if (access.read) {
          expect(types, 'types').include(`${name}WhereInput`);
          expect(types, 'types').include(`${name}WhereUniqueInput`);
        } else {
          expect(types, 'types').not.include(`${name}WhereInput`);
          expect(types, 'types').not.include(`${name}WhereUniqueInput`);
        }

        // Queries are only accessible when reading
        if (access.read) {
          expect(queries, 'queries').include(`${name}`);
          expect(queries, 'queries').include(`all${name}s`);
          expect(queries, 'queries').include(`_all${name}sMeta`);
        } else {
          expect(queries, 'queries').not.include(`${name}`);
          expect(queries, 'queries').not.include(`all${name}s`);
          expect(queries, 'queries').not.include(`_all${name}sMeta`);
        }

        if (access.create) {
          expect(mutations, 'mutations').include(`create${name}`);
        } else {
          expect(mutations, 'mutations').not.include(`create${name}`);
        }

        if (access.update) {
          expect(mutations, 'mutations').include(`update${name}`);
        } else {
          expect(mutations, 'mutations').not.include(`update${name}`);
        }

        if (access.delete) {
          expect(mutations, 'mutations').include(`delete${name}`);
        } else {
          expect(mutations, 'mutations').not.include(`delete${name}`);
        }
      });

    });

  });

  describe('dynamic', () => {
    accessCombinations.forEach(access => {

      it(`dynamic: ${JSON.stringify(access)}`, () => {
        sanityCheckGraphQL();

        const name = getDynamicListName(access);

        // All types, etc, are included when dynamic no matter the config (because
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

  describe('`read: () => false` dynamic config', () => {
    it('errors on GraphQL access when not logged in', () => {
      // Check `Audit` graphql types exist via introspection. Due to being
      // dynamic, it will always be visible.
      cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) =>
        cy
        .graphql_query(
          `http://localhost:${PORT}/admin/api`,
          'query { allAudits { id } }',
        )
        .then(({ errors }) => {
          expect(errors).to.have.deep.property('[0].name', 'AccessDeniedError');
          expect(errors).to.have.deep.property('[0].message', 'You do not have access to this resource');
          expect(errors).to.have.deep.property('[0].path[0]', 'allAudits');
        })
      );
    });

    describe('logged in', () => {
      beforeEach(() => (
        cy
        .task('getProjectInfo', 'access-control')
        .then(({ env: { PORT } }) =>
          cy.loginToKeystone(usersByLevel['reader'][0].email, usersByLevel['reader'][0].password, PORT)
        )
      ));

      it('still includes in graphQL endpoint', () => {
        // Check `Audit` graphql types exist via introspection. Due to being
        // dynamic, it will always be visible.
        cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) => {
          return cy
            .graphql_query(
              `http://localhost:${PORT}/admin/api`,
              'query { __schema { queryType { fields { name }, } } }',
            )
            .then(({ data: { __schema } }) => {
              expect(__schema.queryType.fields).include({ name: 'Audit' });
              expect(__schema.queryType.fields).include({ name: 'allAudits' });
              expect(__schema.queryType.fields).include({ name: '_allAuditsMeta' });
            });
        });
      });

      it('errors on GraphQL access when denied', () => {
        // Check `Audit` graphql types exist via introspection. Due to being
        // dynamic, it will always be visible.
        cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) =>
          cy
          .graphql_query(
            `http://localhost:${PORT}/admin/api`,
            'query { allAudits { id } }',
          )
          .then(({ errors }) => {
            expect(errors).to.have.deep.property('[0].name', 'AccessDeniedError');
            expect(errors).to.have.deep.property('[0].message', 'You do not have access to this resource');
            expect(errors).to.have.deep.property('[0].path[0]', 'allAudits');
          })
        );
      });
    });
  });

  describe('`read: () => true` dynamic config', () => {
    it.skip('cannot be introspected when logged out', () => {
      // TODO
    });

    it('logged out, access denied', () => {
      // Check `Audit` graphql types exist via introspection. Due to being
      // dynamic, it will always be visible.
      cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) => {
        return cy
          .graphql_query(
            `http://localhost:${PORT}/admin/api`,
            'query { allAudits { id } }',
          )
          .then(({ errors }) => {
            expect(errors).to.have.deep.property('[0].name', 'AccessDeniedError');
            expect(errors).to.have.deep.property('[0].message', 'You do not have access to this resource');
            expect(errors).to.have.deep.property('[0].path[0]', 'allAudits');
          });
      });
    });

    describe('logged in', () => {
      beforeEach(() => {
        cy
          .task('getProjectInfo', 'access-control')
          .then(({ env: { PORT } }) =>
            cy.loginToKeystone(usersByLevel['su'][0].email, usersByLevel['su'][0].password, PORT)
          );
      });

      it('still includes in graphQL endpoint', () => {
        // Check `Audit` graphql types exist via introspection. Due to being
        // dynamic, it will always be visible.
        cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) => {
          return cy
            .graphql_query(
              `http://localhost:${PORT}/admin/api`,
              'query { __schema { queryType { fields { name } } } }',
            )
            .then(({ data: { __schema } }) => {
              expect(__schema.queryType.fields).include({ name: 'Audit' });
              expect(__schema.queryType.fields).include({ name: 'allAudits' });
              expect(__schema.queryType.fields).include({ name: '_allAuditsMeta' });
            });
        });
      });

      it('GraphQL access succeeds', () => {
        // Check calling it actually works
        cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) =>
          cy
            .graphql_query(
              `http://localhost:${PORT}/admin/api`,
              'query { allAudits { id } }',
            )
            .then(({ data, errors }) => {
              expect(errors).to.equal(undefined);
              expect(data.allAudits).to.have.length(4);
            })
        );
      });

    });
  });
});
