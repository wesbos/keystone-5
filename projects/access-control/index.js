const { AdminUI } = require('@keystonejs/admin-ui');
const { Keystone } = require('@keystonejs/core');
const { Text, Password, Select, Relationship } = require('@keystonejs/fields');
const { WebServer } = require('@keystonejs/server');
const PasswordAuthStrategy = require('@keystonejs/core/auth/Password');

const { port, staticRoute, staticPath } = require('./config');

const initialData = require('./data');

const keystone = new Keystone({
  name: 'Cypress Test Project For Access Control',
});

// eslint-disable-next-line no-unused-vars
const authStrategy = keystone.createAuthStrategy({
  type: PasswordAuthStrategy,
  list: 'User',
});

keystone.createList('User', {
  fields: {
    name: {
      type: Text,
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    email: {
      type: Text,
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    password: {
      type: Password,
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    posts: {
      type: Relationship,
      ref: 'Post',
      many: true,
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    internal: {
      type: Text,
      access: {
        // Some super secret thing - never available in the app
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    // Normally users might be multiple of each of these, but for demo purposes
    // we assume they can only be one at a time.
    level: {
      type: Select,
      options: ['su', 'admin', 'editor', 'writer', 'reader'],
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
  },
});

keystone.createList('Post', {
  fields: {
    title: {
      type: Text,
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    author: {
      type: Relationship,
      ref: 'User',
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    status: {
      type: Select,
      options: ['deleted', 'draft', 'published'],
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
  },
  labelResolver: item => `${item.title}`,
});

// An audit trail of actions performed
keystone.createList('Audit', {
  fields: {
    user: {
      type: Relationship,
      ref: 'User',
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    post: {
      type: Relationship,
      ref: 'Post',
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
    action: {
      type: Select,
      options: ['edit', 'create', 'delete', 'changestatus'],
      access: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
  },
  // Only admins have access
  access: {
    create: ({ authentication: { item, listKey } }) => (
      listKey === 'User' && ['su', 'admin'].includes(item.level)
    ),
    read: ({ authentication: { item, listKey } }) => {
      console.log({ item, listKey });
      return listKey === 'User' && ['su', 'admin'].includes(item.level);
    },
    update: ({ authentication: { item, listKey } }) => (
      listKey === 'User' && ['su', 'admin'].includes(item.level)
    ),
    delete: ({ authentication: { item, listKey } }) => (
      listKey === 'User' && ['su', 'admin'].includes(item.level)
    ),
  },
});

// A log of everything going on
keystone.createList('Log', {
  fields: {
    entry: { type: Text },
  },
  access: {
    create: true,
    read: false,
    update: false,
    delete: false,
  },
});

const admin = new AdminUI(keystone, {
  adminPath: '/admin',
  // allow disabling of admin auth for test environments
  authStrategy: authStrategy,
});

const server = new WebServer(keystone, {
  'cookie secret': 'qwerty',
  'admin ui': admin,
  session: true,
  port,
});

server.app.get('/reset-db', (req, res) => {
  const reset = async () => {
    await keystone.mongoose.connection.dropDatabase();
    await keystone.createItems(initialData);
    res.redirect(admin.adminPath);
  };
  reset();
});

server.app.use(staticRoute, server.express.static(staticPath));

async function start() {
  keystone.connect();
  server.start();
  const users = await keystone.lists.User.model.find();
  if (!users.length) {
    await keystone.mongoose.connection.dropDatabase();
    await keystone.createItems(initialData);
  }
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
