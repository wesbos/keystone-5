const camelize = (exports.camelize = str =>
  str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return '';
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  }));

exports.getType = (thing) =>
  Object.prototype.toString.call(thing).replace(/\[object (.*)\]/, '$1');

exports.fixConfigKeys = (config, remapKeys = {}) => {
  const rtn = {};
  Object.keys(config).forEach(key => {
    if (remapKeys[key]) rtn[remapKeys[key]] = config[key];
    else rtn[camelize(key)] = config[key];
  });
  return rtn;
};

exports.checkRequiredConfig = (config, requiredKeys = {}) => {
  Object.keys(requiredKeys).forEach(key => {
    if (config[key] === undefined) throw requiredKeys[key];
  });
};

exports.escapeRegExp = str =>
  str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

exports.resolveAllKeys = obj => {
  const result = {};
  const allPromises = Object.keys(obj).map(key =>
    Promise.resolve(obj[key]).then(val => {
      result[key] = val;
    })
  );
  return Promise.all(allPromises).then(() => result);
};

exports.pick = (obj, keys) =>
  keys.reduce((result, key) => ({ ...result, [key]: obj[key] }), {});

exports.parseListAccess = ({ listKey, access, defaultAccess }) => {
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
        const type = exports.getType(accessConfig);

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
    const longHandAccess = exports.pick(access, accessTypes);

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

  switch (exports.getType(access)) {
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
};

exports.mergeWhereClause = (args, where) => {
  if (exports.getType(where) !== 'Object') {
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
};
