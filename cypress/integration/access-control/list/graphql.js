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
  describe('`read: false` static config', () => {
    beforeEach(() => (
      cy
      .task('getProjectInfo', 'access-control')
      .then(({ env: { PORT } }) =>
        cy.loginToKeystone(usersByLevel['su'][0].email, usersByLevel['su'][0].password, PORT)
      )
    ));

    it('queries excluded from graphQL endpoint', () => {
      // Check graphql types via introspection
      cy.task('getProjectInfo', 'access-control').then(({ env: { PORT } }) => {
        return cy
          .graphql_query(
            `http://localhost:${PORT}/admin/api`,
            'query { __schema { queryType { fields { name } } } }',
          )
          .then(({ data: { __schema } }) => {
            // check to make sure we're not getting false positives
            expect(__schema.queryType.fields).include({ name: 'allUsers' });
            // Do the checks to see the absense of the Jobs list
            expect(__schema.queryType.fields).not.include({ name: 'Job' });
            expect(__schema.queryType.fields).not.include({ name: 'allJobs' });
          });
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
