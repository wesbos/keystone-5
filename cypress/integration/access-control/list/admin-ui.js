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

describe.skip('Access Control Lists > Admin UI', () => {
  describe('Visibility', () => {
    beforeEach(() => (
      cy
      .task('getProjectInfo', 'access-control')
      .then(({ env: { PORT } }) =>
        cy.loginToKeystone(usersByLevel['su'][0].email, usersByLevel['su'][0].password, PORT)
      )
    ));

    it('is not visible when not creatable or readable', () => {
      // TODO: When statically `read: false && create: false`, should not show
      // in the nav or main page, or have a route (ie; the admin ui shouldn't
      // know about it at all)
      cy.get('body').should('not.contain', 'Nocreatenoreads');

      cy
        .task('getProjectInfo', 'access-control')
        .then(({ env: { PORT } }) =>
          cy.visit(`http://localhost:${PORT}/admin/logs`)
        );

      cy.get('body').should('contain', "The list “logs” doesn't exist");

    });

    it('is visible when only creatable', () => {
      // TODO: Nav, Main, Route
    });

    it('is visible when only readable', () => {
      // TODO: Nav, Main, Route
    });

    it('is visible when creatable and readable', () => {
      // TODO: Nav, Main, Route
    });
  });

  describe('reading', () => {
    it('shows items when readable', () => {

    });

    it('shows an access restricted message when not readable', () => {

    });
  });

  describe('creating', () => {
    it('shows create option when creatable', () => {

    });

    it('shows create option even when not readable', () => {

    });

    it('does not show create option when not creatable', () => {

    });
  });

  describe('updating', () => {
    it('shows update item option when updatable', () => {

    });

    it('shows multi-update option when updatable', () => {

    });

    it('does not show update item option when not updatable', () => {

    });

    it('does not show the multi-update option when not updatable', () => {

    });
  });

  describe('deleting', () => {
    it('shows delete item option when deletable', () => {

    });

    it('shows multi-delete option when deletable', () => {

    });

    it('does not show delete item option when not deletable', () => {

    });

    it('does not show the multi-delete option when not deletable', () => {

    });
  });
});
