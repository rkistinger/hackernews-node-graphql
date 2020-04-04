const { GraphQLServer } = require('graphql-yoga')

const links = [
  {
    id: 'link-0',
    url: 'www.howtographql.com',
    description: 'Fullstack tutorial for GraphQL',
  },
]

/*
  2) Define the implementation (data fetching) of our schema (1:1 root field to resolver - names must match)

  Every GraphQL resolver receives four arguments:
  - parent = result of the previous resolver execution level / nesting level. For lists 'parent' is each element in the list.
  - args = arguments for the operation defined in the schema
*/
const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    feed: () => links,
    link: (parent, args) => links.find((link) => link.id === args.id),
  },
  Mutation: {
    post: (parent, args) => {
      const link = {
        id: `link-${links.length}`,
        description: args.description,
        url: args.url,
      }
      links.push(link)
      return link
    },
    updateLink: (parent, args) => {
      const updateIndex = links.findIndex((link) => link.id === args.id)
      const updatedLink = {
        id: `link-${updateIndex}`,
        url: args.url || links[updateIndex].url,
        description: args.description || links[updateIndex].description,
      }
      links.splice(updateIndex, 1, updatedLink)
      return updatedLink
    },
    deleteLink: (parent, args) => {
      const deleteIndex = links.findIndex((link) => link.id === args.id)
      const deletedLink = links.splice(deleteIndex, 1)
      return deletedLink
    },
  },
}

// 3) Create server with schema and resolvers
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
})

// 4) Start server
server.start((options) => {
  console.log(`Server is running on http://localhost:${options.port}`)
})
