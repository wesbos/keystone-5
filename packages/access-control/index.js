const {
  getType,
  pick,
} = require('@keystonejs/utils');

module.exports = {
  parseListAccess({ listKey, defaultAccess, access = defaultAccess }) {
    const accessTypes = ['create', 'read', 'update', 'delete'];

    const getDefaults = () => {
      return accessTypes.reduce(
        (result, accessType) => ({
          ...result,
          [accessType]: defaultAccess,
        }),
        {},
      );
    };

    const validateGranularConfigTypes = (longHandAccess) => {
      const errors = Object.entries(longHandAccess)
        .map(([accessType, accessConfig]) => {
          const type = getType(accessConfig);

          if (accessType === 'create') {
            if (!['Boolean', 'Function'].includes(type)) {
              return `Expected a Boolean, or Function for ${listKey}.access.${accessType}, but got ${type}. (NOTE: 'create' cannot have a Declarative access control config)`;
            }
          } else {
            if (!['Object', 'Boolean', 'Function'].includes(type)) {
              return `Expected a Boolean, Object, or Function for ${listKey}.access.${accessType}, but got ${type}`;
            }
          }
        })
        .filter(error => !!error);

      if (errors.length) {
        throw new Error(errors.join('\n'));
      }
    };

    const parseGranularAccessConfig = () => {
      const longHandAccess = pick(access, accessTypes);

      // An object was supplied, but it has the wrong keys (it's probably a
      // declarative access control config being used as a shorthand, which
      // isn't possible [due to `create` not supporting declarative config])
      if (Object.keys(longHandAccess).length === 0) {
        throw new Error(`Must specify one of ${JSON.stringify(accessTypes)} access configs, but got ${JSON.stringify(Object.keys(access))}. (Did you mean to specify a declarative access control config? This can be done on a granular basis only)`);
      }

      validateGranularConfigTypes(longHandAccess);

      // Construct an object with all keys
      return {
        ...getDefaults(),
        ...longHandAccess,
      };
    };

    switch (getType(access)) {
      case 'Boolean':
      case 'Function':
        return {
          create: access,
          read: access,
          update: access,
          delete: access,
        };

      case 'Object':
        return parseGranularAccessConfig();

      default:
        throw new Error('Shorthand list-level access must be specified as either a boolean or a function.');
    }
  },

  // TODO: Implement
  parseFieldAccess() {
    return {
      create: true,
      read: true,
      update: true,
    };
  },

  mergeWhereClause(args, where) {
    if (getType(where) !== 'Object') {
      return args;
    }

    // Access control is a where clause type
    return {
      ...args,
      where: {
        ...args.where,
        where,
      },
    };
  },

  testListAccessControl({ access, listKey, operation, authentication }) {
    // Either a boolean or an object describing a where clause
    if (typeof access[operation] !== 'function') {
      return access[operation];
    }

    const result = access[operation]({
      authentication: authentication.item ? authentication : null
    });

    const type = getType(result);

    if (!['Object', 'Boolean'].includes(type)) {
      throw new Error(`Must return an Object or Boolean from Imperative or Declarative access control function. Got ${type}`);
    }

    // Special case for 'create' permission
    if (operation === 'create' && type === 'Object') {
      throw new Error(`Expected a Boolean for ${listKey}.access.create(), but got Object. (NOTE: 'create' cannot have a Declarative access control config)`);
    }

    return result;
  }
}
