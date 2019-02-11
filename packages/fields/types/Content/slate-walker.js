import { Block } from 'slate';

function walkSlateDocument(node, { visitBlock }) {
  if (
    node.object == 'document' ||
    (node.object == 'block' && Block.isBlockList(node.nodes))
  ) {
    return node.nodes.map(walkSlateDocument);
  } else {
    return visitBlock(node);
  }
}

module.exports = { walkSlateDocument };
