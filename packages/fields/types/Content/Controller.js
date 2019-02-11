import TextController from '../Text/Controller';

export default class ContentController extends TextController {
  getValue = data => {
    const { path } = this.config;
    if (!data || !data[path] || !data[path].structure) {
      // Forcibly return null if empty string
      return { structure: null };
    }
    return { structure: data[path].structure };
  };

  getQueryFragment = () => {
    return `
      ${this.path} {
        structure
      }
    `;
  };
}
