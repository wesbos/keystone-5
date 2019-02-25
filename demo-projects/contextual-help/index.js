//imports for Next.js app core
const next = require('next');

//imports for Keystone app core
const { AdminUI } = require('@voussoir/admin-ui');
const { Keystone } = require('@voussoir/core');
const {
  File,
  Text,
  Relationship,
  Select,
  Password,
  Checkbox,
  CalendarDay,
  DateTime,
} = require('@voussoir/fields');
const { WebServer } = require('@voussoir/server');
const { LocalFileAdapter } = require('@voussoir/file-adapters');
const PasswordAuthStrategy = require('@voussoir/core/auth/Password');
const { MongooseAdapter } = require('@voussoir/adapter-mongoose');

// config
const path = require('path');
const port = 3005;
const staticRoute = '/public'; // The URL portion
const staticPath = path.join(process.cwd(), 'public'); // The local path on disk
const initialData = {
  User: [
    {
      name: 'Administrator',
      email: 'mauro@thinkmill.com.au',
      isAdmin: true,
      dob: '1990-01-01',
      password: 'password',
    },
    {
      name: 'Demo User',
      email: 'user@demo.com',
      isAdmin: false,
      dob: '1995-06-09',
      password: 'password',
    },
  ],
};

const nextApp = next({
  dir: 'app',
  distDir: 'build',
  dev: process.env.NODE_ENV !== 'PRODUCTION',
});

const getYear = require('date-fns/get_year');

const mongoDbUri = 'mongodb://admin:admin@localhost:27017/';

const keystone = new Keystone({
  name: 'Page Helper',
  adapter: new MongooseAdapter(),
});

const authStrategy = keystone.createAuthStrategy({
  type: PasswordAuthStrategy,
  list: 'User',
  sortListsAlphabetically: true,
});

const fileAdapter = new LocalFileAdapter({
  directory: `${staticPath}/uploads`,
  route: `${staticRoute}/uploads`,
});

const avatarFileAdapter = new LocalFileAdapter({
  directory: `${staticPath}/avatars`,
  route: `${staticRoute}/avatars`,
});

keystone.createList('User', {
  fields: {
    name: { type: Text },
    email: { type: Text, isUnique: true },
    dob: {
      type: CalendarDay,
      format: 'Do MMMM YYYY',
      yearRangeFrom: 1901,
      yearRangeTo: getYear(new Date()),
    },
    password: { type: Password },
    isAdmin: { type: Checkbox },
    avatar: { type: File, adapter: avatarFileAdapter },
  },
  labelResolver: item => `${item.name} <${item.email}>`,
});

keystone.createList('Article', {
  fields: {
    title: { type: Text },
    author: {
      type: Relationship,
      ref: 'User',
    },
    categories: {
      type: Relationship,
      ref: 'ArticleCategory',
      many: true,
    },
    status: {
      type: Select,
      defaultValue: 'draft',
      options: [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }],
    },
    body: { type: Text, isMultiline: true },
    posted: { type: DateTime },
    image: { type: File, adapter: fileAdapter },
  },
  adminConfig: {
    defaultPageSize: 20,
    defaultColumns: 'title, status',
    defaultSort: 'title',
  },
  labelResolver: item => item.title,
});

keystone.createList('ArticleCategory', {
  fields: {
    name: { type: Text },
    slug: { type: Text },
  },
});

keystone.createList('UrlMapping', {
  fields: {
    url: { type: Text },
    article: {
      type: Relationship,
      ref: 'Article',
    },
    posted: { type: DateTime },
  },
  labelResolver: item => item.url,
});

const admin = new AdminUI(keystone, {
  adminPath: '/admin',
  sortListsAlphabetically: true,
});

const server = new WebServer(keystone, {
  'cookie secret': 'qwerty',
  'admin ui': admin,
  port,
  authStrategy: authStrategy,
});

server.app.use(staticRoute, server.express.static(staticPath));

server.app.use(nextApp.getRequestHandler());

async function start() {
  await Promise.all([keystone.connect(mongoDbUri), nextApp.prepare()]);
  server.start();
  const users = await keystone.lists.User.adapter.findAll();
  if (!users.length) {
    Object.values(keystone.adapters).forEach(async adapter => {
      await adapter.dropDatabase();
    });
    await keystone.createItems(initialData);
  }
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
