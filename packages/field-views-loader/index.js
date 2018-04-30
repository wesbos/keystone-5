const loaderUtils = require('loader-utils');

module.exports = function() {
  const options = loaderUtils.getOptions(this);
  const adminMeta = options.adminMeta;
  /* adminMeta gives us a `lists` object in the shape:
    {
      [listPath]: {  // e.g "User"
        ...
        Controller: 'absolute/path/to/controller',
        views: {
          [fieldPath]: {  // e.g 'email'
            [fieldTypeView]: 'absolute/path/to/view', // e.g 'Field'
            [fieldTypeView]: 'another/absolute/path'  // e.g 'Column'
            ...
          }
          ...
        }
      }
    }

  and our loader simply tranforms it into usuable code that looks like this:

  module.exports = {
    "User": {
      "email": {
        Controller: require('absolute/path/to/controller'),
        views: {
          Field: require('relative/path/to/view'),
          Column: require('another/relative/path')
          ...
        }
      },
      ...
    }
    ...
  }
   */

   // "controller": require('${list.controllers[listPath]}'),

  const stringifiedObject = `{
    ${Object.entries(adminMeta.lists)
      .map(([listPath, list]) => {
        return `"${listPath}": {
          ${Object.entries(list.views)
            .map(([fieldPath, views]) => {
              return `"${fieldPath}": {
                "Controller": require('${list.controllers[fieldPath]}').default,
                "views": {
                  ${Object.entries(views)
                    .map(([viewType, resolution]) => {
                      return `${viewType}: require('${resolution}').default`;
                    })
                    .join(',\n')}
                },
            }`;
            })
            .join(',\n')}
      }`;
      })
      .join(',\n')}
  }`;

  return `module.exports = ${stringifiedObject}`;
};
