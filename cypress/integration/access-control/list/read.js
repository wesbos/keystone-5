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

describe('Access Control, List, Read', () => {
  describe.skip('defaults', () => {
    it.skip('defaults to `read: true`', () => {
      // TODO
    });

    it.skip('expands single-option format correctly', () => {
      // TODO: Check that `access: true`/`access: (auth) => auth.isAdmin`
      // correctly expands to the 'read' part of the CRUD ACL
    });
  });

  describe('`read: false` static config', () => {
    it.skip('cannot be introspected when logged out', () => {
      // TODO
    });

    describe('logged in', () => {
      beforeEach(() => (
        cy
        .task('getProjectInfo', 'access-control')
        .then(({ env: { PORT } }) =>
          cy.loginToKeystone(usersByLevel['su'][0].email, usersByLevel['su'][0].password, PORT)
        )
      ));

      it('is innaccessible from Admin UI', () => {
        cy.get('body').should('not.contain', 'Logs');

        cy
          .task('getProjectInfo', 'access-control')
          .then(({ env: { PORT } }) =>
            cy.visit(`http://localhost:${PORT}/admin/logs`)
          );

        cy.get('body').should('contain', "The list “logs” doesn't exist");
      });
    });
  });

  describe('`read: () => false` dynamic config', () => {
    describe('logged in', () => {
      beforeEach(() => (
        cy
        .task('getProjectInfo', 'access-control')
        .then(({ env: { PORT } }) =>
          cy.loginToKeystone(usersByLevel['reader'][0].email, usersByLevel['reader'][0].password, PORT)
        )
      ));

      it('is innaccessible from Admin UI', () => {
        cy.get('body').should('not.contain', 'Audits');

        cy
          .task('getProjectInfo', 'access-control')
          .then(({ env: { PORT } }) =>
            cy.visit(`http://localhost:${PORT}/admin/audits`)
          );

        cy.get('body').should('contain', 'You do not have access to this resource');
      });
    });
  });

  describe('`read: () => true` dynamic config', () => {
    describe('logged in', () => {
      beforeEach(() => {
        cy
          .task('getProjectInfo', 'access-control')
          .then(({ env: { PORT } }) =>
            cy.loginToKeystone(usersByLevel['su'][0].email, usersByLevel['su'][0].password, PORT)
          );
      });

      it('includes in Admin UI', () => {
        // TODO: Check body text too
        cy.get('body nav').should('contain', 'Audits');
      });

      it('includes in routing', () => {
        cy
          .task('getProjectInfo', 'access-control')
          .then(({ env: { PORT } }) =>
            cy.visit(`http://localhost:${PORT}/admin/audits`)
          );

        cy.get('body').should('not.contain', "The list “Audits” doesn't exist");
        cy.get('body h1').should('contain', 'Audits');
      });

    });
  });
});
