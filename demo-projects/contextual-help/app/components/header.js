import Link from 'next/link';
import { jsx } from '@emotion/core';

/** @jsx jsx */

export default () => (
  <header
    css={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '48px 0',
    }}
  >
    <p css={{ margin: 0, fontSize: '2em' }}>Contextual Help</p>
  </header>
);
