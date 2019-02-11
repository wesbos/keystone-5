const { MongoTextInterface, Text } = require('../Text/Implementation');
const { flatMap } = require('@voussoir/utils');
const { walkSlateDocument } = require('./slate-walker');

const GQL_TYPE_PREFIX = '_ContentType';

function isKnownBlock(node, blocks) {
  return true; // TODO;
}

/**
 * @param data Object For example:
 * {
 *   document: [
 *     { object: 'block', type: 'cloudinaryImage', data: { path: 'cloudinaryImages', action: 'create', index: 0 },
 *     { object: 'block', type: 'cloudinaryImage', data: { path: 'cloudinaryImages', action: 'create', index: 1 },
 *     { object: 'block', type: 'relationshipUser', data: { path: 'relationshipUsers', action: 'create', index: 0 } }
 *     { object: 'block', type: 'relationshipUser', data: { path: 'relationshipUsers', action: 'connect', index: 0 } }
 *   ],
 *   cloudinaryImages: {
 *     create: [
 *       { data: { image: <FileObject>, align: 'center' } },
 *       { data: { image: <FileObject>, align: 'center' } }
 *     ]
 *   },
 *   relationshipUsers: {
 *     create: [{ data: { id: 'abc123' } }],
 *     connect: [{ id: 'xyz789' }],
 *   },
 * }
 */
async function processSerialised({ document, ...serialisations }, { blocks }) {

  // TODO
  // 1. Resolve all the `serialisations` mutations
  const resolvedMutations = await TODO(serialisations);

  return {
    document: walkSlateDocument(
      document,
      {
        visitBlock(node) {
          // All our blocks need data, so we can early-out for any that don't have
          // data set.
          if (!node.data || !isKnownBlock(node, blocks)) {
            return node;
          }

          return {
            ...node,
            data: {
              _joinId: resolvedMutations[node.data.path][node.data.action][node.data.index],
            },
          };
        },
      },
    ),
  };

}

/**
 * @param query Object For example:
 * {
 *   document,
 *   cloudinaryImages {
 *     id
 *     publicUrl: publicUrlTransformed(transformation: { crop: 'fill', width: '200px' })
 *   }
 *   # _embed comes from the `relationship` block adding it to the graphql
 *   # schema. Gives a way for that block to provide a different query for
 *   # variations of a block (for example; the block might have
 *   # { data: { style: 'embed' })
 *   relationshipUsers_embed {
 *     id
 *     username
 *     bio
 *     avatar {
 *       publicUrl: publicUrlTransformed(transformation: { crop: 'fill', width: '30px' })
 *     }
 *   }
 *   relationshipUsers_mention {
 *     id
 *     username
 *   }
 * }
 */
function resolveDocumentAndSerialisations(id, query) {

  // TODO: Default optional query parts
  // if (!query.cloudinaryImages_fullWidth) {
  //   query.cloudinaryImages_fullWidth = query.cloudinaryImages;
  // }

}

class Content extends Text {
  constructor(path, config, listConfig) {
    super(...arguments);

    this.listConfig = listConfig;

    // To maintain consistency with other types, we grab the sanitised name
    // directly from the list.
    const { itemQueryName } = this.getListByKey(this.listKey).gqlNames;

    // We prefix with `_` here to avoid any possible conflict with a list called
    // `ContentType`.
    // Including the list name + path to make sure these input types are unique
    // to this list+field and don't collide.
    const type = `${GQL_TYPE_PREFIX}_${itemQueryName}_${this.path}`;

    this.gqlTypes = {
      create: `${type}_CreateInput`,
      update: `${type}_UpdateInput`,
      output: type,
    };

    this.complexBlocks = this.config.blocks
      .map(blockConfig => {
        let Impl = blockConfig;
        let fieldConfig = {};

        if (Array.isArray(blockConfig)) {
          Impl = blockConfig[0];
          fieldConfig = blockConfig[1];
        }

        if (!Impl.isComplexDataType) {
          return null;
        }

        return new Impl(fieldConfig, {
          fromList: this.listKey,
          createAuxList: listConfig.createAuxList,
          getListByKey: listConfig.getListByKey,
          listConfig: this.listConfig,
        });
      })
      .filter(block => block);
  }
  /*
   * Blocks come in 2 halves:
   * 1. The block implementation (eg; ./views/editor/blocks/embed.js)
   * 2. The config (eg; { apiKey: process.env.EMBEDLY_API_KEY })
   * Because of the way we bundle the admin UI, we have to split apart these
   * two halves and send them seperately (see `@voussoir/field-views-loader`):
   * 1. Sent as a "view" (see `extendViews` below), which will be required (so
   *    it's included in the bundle).
   * 2. Sent as a serialized JSON object (see `extendAdminMeta` below), which
   *    will be injected into the `window` and read back ready for use.
   * We then stitch those two halves back together within `views/Field.js`.
   */
  extendAdminMeta(meta) {
    return {
      ...meta,
      // NOTE: We rely on order, which is why we end up with a sparse array
      blockOptions: this.config.blocks.map(block => (Array.isArray(block) ? block[1] : undefined)),
    };
  }
  // Add the blocks config to the views object for usage in the admin UI
  // (ie; { Cell: , Field: , Filters: , blocks: ...})
  extendViews(views) {
    return {
      ...views,
      blocks: this.config.blocks.map(block => (Array.isArray(block) ? block[0] : block).viewPath),
    };
  }
  get gqlUpdateInputFields() {
    return [`${this.path}: ${this.gqlTypes.update}`];
  }
  get gqlCreateInputFields() {
    return [`${this.path}: ${this.gqlTypes.create}`];
  }
  getGqlAuxTypes() {
    const inputFields = `
      document: String
    `;

    return [
      ...super.getGqlAuxTypes(),
      /*
       * For example:
       *
         document: String
         cloudinaryImages: _ContentType_cloudinaryImageRelateToManyInput
         relationships_User: _ContentType_relationship_UserRelateToManyInput
       */
      `
      input ${this.gqlTypes.create} {
        ${inputFields}
        ${flatMap(this.complexBlocks, block =>
          flatMap(block.getGqlInputFields(), field => field.gqlCreateInputFields)
        ).join('\n')}
      }
      `,
      `
      input ${this.gqlTypes.update} {
        ${inputFields}
        ${flatMap(this.complexBlocks, block =>
          flatMap(block.getGqlInputFields(), field => field.gqlUpdateInputFields)
        ).join('\n')}
      }
      `,
      ...flatMap(this.complexBlocks, block =>
        flatMap(block.getGqlInputFields(), field => field.getGqlAuxTypes())
      ),
      `
      type ${this.gqlTypes.output} {
        document: String
        ${flatMap(this.complexBlocks, block =>
          flatMap(block.getGqlOutputFields(), field => field.gqlOutputFields)
        ).join('\n')}
      }
      `,
    ];
  }

  get gqlAuxFieldResolvers() {
    return {
      [this.gqlTypes.output]: item => item,
    };
  }

  get gqlOutputFields() {
    return [`${this.path}: ${this.gqlTypes.output}`];
  }

  get gqlOutputFieldResolvers() {
    // TODO: serialize / etc
    return {
      [this.path]: item => ({
        document: item[this.path],
      }),
    };
  }

  async resolveInput({ resolvedData }) {
    return resolvedData[this.path].document;
    return processSerialised(resolvedData[this.path]);
  }
}

class MongoContentInterface extends MongoTextInterface {}

module.exports = {
  Content,
  MongoContentInterface,
};
