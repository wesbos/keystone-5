const express = require('express');
const bodyParser = require('body-parser');
const fastMemoize = require('fast-memoize');
const { apolloUploadExpress } = require('apollo-upload-server');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const {
  formatError,
  isInstance: isApolloErrorInstance,
} = require('apollo-errors');
const cuid = require('cuid');
const logger = require('@keystonejs/logger');

const graphqlLogger = logger('graphql');

const getType = (thing) => {
  return Object.prototype.toString.call(thing).replace(/\[object (.*)\]/, '$1');
};

module.exports = function createGraphQLMiddleware(
  keystone,
  { apiPath, graphiqlPath }
) {
  const app = express();

  // add the Admin GraphQL API
  const schema = keystone.getAdminSchema();
  const accessControl = keystone.describeAccessControl();

  app.use(
    apiPath,
    bodyParser.json(),
    // TODO: Make configurable
    apolloUploadExpress({ maxFileSize: 200 * 1024 * 1024, maxFiles: 5 }),
    graphqlExpress(req => {

      // memoizing to avoid requests that hit the same type multiple times.
      // We do it within the request callback so we can resolve it based on the
      // request info ( like who's logged in right now, etc)
      const getAccessControl = fastMemoize((listKey, operation) => {

        // Either a boolean or an object describing a where clause
        if (typeof accessControl[listKey][operation] !== 'function') {
          return accessControl[listKey][operation];
        }

        let authentication;
        if (req.user) {
          authentication = {
            item: req.user,
            listKey: req.authedListKey,
          };
        }

        const result = accessControl[listKey][operation]({ authentication });
        const type = getType(result);
        if (!['Object', 'Boolean'].includes(type)) {
          throw new Error(`Must return an Object or Boolean from Imperative or Declarative access control function. Got ${type}`);
        }
        if (operation === 'create' && type === 'Object') {
          throw new Error(`Expected a Boolean for ${listKey}.access.create(), but got Object. (NOTE: 'create' cannot have a Declarative access control config)`);
        }

        return result;
      });

      return {
        schema,
        // Will come from the session middleware above
        context: {
          authedItem: req.user,
          authedListKey: req.authedListKey,
          getAccessControl,
        },
        formatError: error => {
          // For correlating user error reports with logs
          error.uid = cuid();
          const { originalError } = error;
          if (isApolloErrorInstance(originalError)) {
            // log internalData to stdout but not include it in the formattedError
            // TODO: User pino for logging
            graphqlLogger.info({
              type: 'error',
              data: originalError.data,
              internalData: originalError.internalData,
            });
          } else {
            graphqlLogger.error(error);
          }
          const formattedError = formatError(error);

          if (error.uid) {
            formattedError.uid = error.uid;
          }

          return formattedError;
        },
      };
    })
  );
  if (graphiqlPath) {
    app.use(graphiqlPath, graphiqlExpress({ endpointURL: apiPath }));
  }
  return app;
};
