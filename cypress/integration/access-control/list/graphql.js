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

describe('Access Control, List, GraphQL', () => {
  describe('static configs', () => {
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

    it('`{ create: true, read: true, update: true, delete: true }', () => {
      sanityCheckGraphQL();

      expect(types, 'types').include('YesCreateYesReadYesUpdateYesDeleteList');
      expect(types, 'types').include('YesCreateYesReadYesUpdateYesDeleteListWhereInput');
      expect(types, 'types').include('YesCreateYesReadYesUpdateYesDeleteListWhereUniqueInput');

      expect(queries, 'queries').include('YesCreateYesReadYesUpdateYesDeleteList');
      expect(queries, 'queries').include('allYesCreateYesReadYesUpdateYesDeleteLists');
      expect(queries, 'queries').include('_allYesCreateYesReadYesUpdateYesDeleteListsMeta');

      expect(mutations, 'mutations').include('createYesCreateYesReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('updateYesCreateYesReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('deleteYesCreateYesReadYesUpdateYesDeleteList');
    });

    it('`{ create: false, read: true, update: true, delete: true }', () => {
      sanityCheckGraphQL();

      expect(types, 'types').include('NoCreateYesReadYesUpdateYesDeleteList');
      expect(types, 'types').include('NoCreateYesReadYesUpdateYesDeleteListWhereInput');
      expect(types, 'types').include('NoCreateYesReadYesUpdateYesDeleteListWhereUniqueInput');

      expect(queries, 'queries').include('NoCreateYesReadYesUpdateYesDeleteList');
      expect(queries, 'queries').include('allNoCreateYesReadYesUpdateYesDeleteLists');
      expect(queries, 'queries').include('_allNoCreateYesReadYesUpdateYesDeleteListsMeta');

      expect(mutations, 'mutations').not.include('createNoCreateYesReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('updateNoCreateYesReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('deleteNoCreateYesReadYesUpdateYesDeleteList');
    });

    it('`{ create: true, read: false, update: true, delete: true }', () => {
      sanityCheckGraphQL();

      expect(types, 'types').include('YesCreateNoReadYesUpdateYesDeleteList');
      expect(types, 'types').not.include('YesCreateNoReadYesUpdateYesDeleteListWhereInput');
      expect(types, 'types').not.include('YesCreateNoReadYesUpdateYesDeleteListWhereUniqueInput');

      expect(queries, 'queries').not.include('YesCreateNoReadYesUpdateYesDeleteList');
      expect(queries, 'queries').not.include('allYesCreateNoReadYesUpdateYesDeleteLists');
      expect(queries, 'queries').not.include('_allYesCreateNoReadYesUpdateYesDeleteListsMeta');

      expect(mutations, 'mutations').include('createYesCreateNoReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('updateYesCreateNoReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('deleteYesCreateNoReadYesUpdateYesDeleteList');
    });

    it('`{ create: false, read: false, update: true, delete: true }', () => {
      sanityCheckGraphQL();

      expect(types, 'types').include('NoCreateNoReadYesUpdateYesDeleteList');
      expect(types, 'types').not.include('NoCreateNoReadYesUpdateYesDeleteListWhereInput');
      expect(types, 'types').not.include('NoCreateNoReadYesUpdateYesDeleteListWhereUniqueInput');

      expect(queries, 'queries').not.include('NoCreateNoReadYesUpdateYesDeleteList');
      expect(queries, 'queries').not.include('allNoCreateNoReadYesUpdateYesDeleteLists');
      expect(queries, 'queries').not.include('_allNoCreateNoReadYesUpdateYesDeleteListsMeta');

      expect(mutations, 'mutations').not.include('createNoCreateNoReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('updateNoCreateNoReadYesUpdateYesDeleteList');
      expect(mutations, 'mutations').include('deleteNoCreateNoReadYesUpdateYesDeleteList');
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
