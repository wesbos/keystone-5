import { mapKeys } from '@voussoir/utils';

import { walkSlateDocument } from './slate-walker';

const CREATE = 'create';
const CONNECT = 'connect';

/**
 * @param document Object For example:
 * [
 *   { object: 'block', type: 'cloudinaryImage', data: { file: <FileObject>, align: 'center' } },
 *   { object: 'block', type: 'cloudinaryImage', data: { file: <FileObject>, align: 'center' } },
 *   { object: 'block', type: 'relationshipUser', data: { id: 'abc123' } }
 *   { object: 'block', type: 'relationshipUser', data: { _joinId: 'xyz789', id: 'uoi678' } }
 * ]
 *
 * @return Object For example:
 * {
 *   document: [
 *     { object: 'block', type: 'cloudinaryImage', data: { path: 'cloudinaryImages', action: 'create', index: 0 },
 *     { object: 'block', type: 'cloudinaryImage', data: { path: 'cloudinaryImages', action: 'create', index: 1 },
 *     { object: 'block', type: 'relationshipUser', data: { path: 'relationshipUsers', action: 'create', index: 0 } }
 *     { object: 'block', type: 'relationshipUser', data: { path: 'relationshipUsers', action: 'connect', index: 0 } }
 *   ],
 *   serialisations: {
 *     cloudinaryImages: {
 *       create: [
 *         { data: { image: <FileObject>, align: 'center' } },
 *         { data: { image: <FileObject>, align: 'center' } }
 *       ]
 *     },
 *     relationshipUsers: {
 *       create: [{ data: { id: 'abc123' } }],
 *       connect: [{ id: 'xyz789' }],
 *     },
 *   },
 * }
 */
export function serialiseSlateDocument(document, blocks) {
  // eg;
  // {
  //   cloudinaryImages: [],
  //   relationshipUser: [],
  //   ...
  // }
  const complexItems = blocks.reduce(
    (memo, block) => ({
      ...memo,
      [block.path]: {}
    }),
    {}
  );

  const mutatedDocument = walkSlateDocument(
    document,
    {
      visitBlock(node) {
        // All our blocks need data, so we can early-out for any that don't have
        // data set.
        if (!node.data) {
          return node;
        }

        const block = blocks.find(({ type }) => type === node.type);

        if (!block) {
          return node;
        }

        let query;
        let action;

        if (node.data._joinId) {
          // An existing connection
          action = CONNECT;
          query = block.buildConnectionQuery({ id: node.data._joinId, data: node.data });
        } else {
          // Create a new related complex data type
          action = CREATE;
          query = block.buildCreateQuery({ data: node.data });
        }

        complexItems[block.path][action] = complexItems[block.path][action] || [];
        complexItems[block.path][action].push(query);

        return {
          ...node,
          data: {
            path: block.path,
            action,
            index: complexItems[block.path].length - 1,
          },
        };
      },
    },
  );

  return {
    document: mutatedDocument,
    serialisations: complexItems,
  };
}

export function buildQueryFromSerialisation({ document, serialisations }) {
  return {
    document,
    ...mapKeys(serialisations, ({ create, connect }) => ({
      // We forcibly disconnect all previous links because we know the entire
      // document, so all creations & connections exist below
      // TODO: Could we optimize this since we already know connections exist
      disconnectAll: true,
      create,
      connect,
    })),
  };
}

/**
 * @param document Object For example:
 * {
 *   document: [
 *     { object: 'block', type: 'cloudinaryImage', data: { _joinId: 'abc123' },
 *     { object: 'block', type: 'cloudinaryImage', data: { _joinId: 'qwe345' },
 *     { object: 'block', type: 'relationshipUser', data: { _joinId: 'ert567' } }
 *     { object: 'block', type: 'relationshipUser', data: { _joinId: 'xyz890' } }
 *   ],
 *   serialisations: {
 *     cloudinaryImages: {
 *       'abc123': { publicUrl: '...', align: 'center' },
 *       'qwe345': { publicUrl: '...', align: 'center' },
 *     },
 *     relationshipUsers: {
 *       'ert567': { user: { id: 'dfg789' } },
 *       'xyz890': { user: { id: 'uoi678' } },
 *     },
 *   },
 * }
 *
 * @return Object For example:
 * [
 *   { object: 'block', type: 'cloudinaryImage', data: { _joinId: 'abc123', publicUrl: '...', align: 'center' } },
 *   { object: 'block', type: 'cloudinaryImage', data: { _joinId: 'qwe345', publicUrl: '...', align: 'center' } },
 *   { object: 'block', type: 'relationshipUser', data: { _joinId: 'ert567', id: 'dfg789' }
 *   { object: 'block', type: 'relationshipUser', data: { _joinId: 'xyz789', id: 'uoi678' } }
 * ]
 */
export function deserialiseSlateDocument({ document, serialisations }) {
  // TODO
}
