const { GraphQLServer } = require('graphql-yoga')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/*
  Define the implementation (data fetching) of our schema (1:1 root field to resolver - names must match)

  Every GraphQL resolver receives four arguments:
  - parent / root = result of the previous resolver execution level / nesting level. For lists 'parent' is each element in the list.
  - args = arguments of the resolver’s field defined in the schema
  - context = custom object that each resolver can read from / write to for communication
  - info = AST representation of the query or mutation (rarely used)
*/
const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    feed: (parent, args, context, info) => {
      return context.prisma.links.findMany()
    },
    link: (parent, args, context) => {
      return context.prisma.links.findOne({
        where: {
          id: parseInt(args.id),
        },
      })
    },
  },
  Mutation: {
    post: (parent, args, context) => {
      return context.prisma.links.create({
        data: {
          description: args.description,
          url: args.url,
        },
      })
    },
    updateLink: (parent, args, context) => {
      return context.prisma.links.update({
        where: {
          id: parseInt(args.id),
        },
        data: {
          url: args.url,
          description: args.description,
        },
      })
    },
    deleteLink: (parent, args, context) => {
      return context.prisma.links.delete({
        where: {
          id: parseInt(args.id),
        },
      })
    },
  },
}

// Create server with schema and resolvers
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  context: {
    // All resolvers will have access to context.prisma
    prisma,
  },
})

// Start server
server.start((options) => {
  console.log(`Server is running on http://localhost:${options.port}`)
})
