import TextController from '../Text/Controller';
import { serialiseSlateDocument, buildQueryFromSerialisation } from './serialiser';

export default class ContentController extends TextController {
  getValue = data => {
    const { path } = this.config;
    if (!data || !data[path] || !data[path].document) {
      // Forcibly return null if empty string
      return { document: null };
    }
    const serialisedDocument = serialiseSlateDocument(
      data[path].document,
      this.blocks.filter(({ isComplexData }) => isComplexData)
    );

    return buildQueryFromSerialisation(serialisedDocument);
  };

  getQueryFragment = () => {
    return `
      ${this.path} {
        document
      }
    `;
  };
}
