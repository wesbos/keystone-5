module.exports = {
  User: [
    {
      name: 'Ticiana',
      email: 'ticiana@keystonejs.com',
      password: 'correct',
      level: 'su',
      internal: 'abc',
      posts: { where: { title: 'Hello' } },
    },
    {
      name: 'Boris Bozic',
      email: 'boris@keystonejs.com',
      password: 'battery',
      level: 'admin',
      internal: 'def',
      posts: { where: { title: 'Hellwhoa' } },
    },
    {
      name: 'Jed Watson',
      email: 'jed@keystonejs.com',
      password: 'horse',
      level: 'editor',
      internal: 'ghi',
      posts: { where: { title: 'Aloha' } },
    },
    {
      name: 'John Molomby',
      email: 'john@keystonejs.com',
      password: 'staple',
      level: 'writer',
      internal: 'jkl',
      posts: { where: { title: 'Salut' } },
    },
    {
      name: 'Jess Telford',
      email: 'jess@keystonejs.com',
      password: 'xkcd',
      level: 'reader',
      internal: 'mno',
      posts: [{ where: { title: 'Bonjour' } }, { where: { title: "G'day" } }],
    },
  ],

  Post: [
    {
      title: 'Hello',
      status: 'draft',
      author: { where: { email: 'ticiana@keystonejs.com' } },
    },
    {
      title: 'Hellwhoa',
      status: 'deleted',
      author: { where: { email: 'boris@keystonejs.com' } },
    },
    {
      title: 'Aloha',
      status: 'published',
      author: { where: { email: 'jed@keystonejs.com' } },
    },
    {
      title: 'Salut',
      status: 'published',
      author: { where: { email: 'john@keystonejs.com' } },
    },
    {
      title: 'Bonjour',
      status: 'published',
      author: { where: { email: 'jess@keystonejs.com' } },
    },
    {
      title: "G'day",
      status: 'draft',
      author: { where: { email: 'jess@keystonejs.com' } },
    },
  ],

  Audit: [
    {
      user: { where: { email: 'jed@keystonejs.com' } },
      post: { where: { title: 'Aloha' } },
      action: 'edit',
    },
    {
      user: { where: { email: 'jess@keystonejs.com' } },
      post: { where: { title: 'Bonjour' } },
      action: 'changestatus',
    },
    {
      user: { where: { email: 'boris@keystonejs.com' } },
      post: { where: { title: 'Hellwhoa' } },
      action: 'delete',
    },
    {
      user: { where: { email: 'jess@keystonejs.com' } },
      post: { where: { title: "G'day" } },
      action: 'create',
    },
  ],
};
