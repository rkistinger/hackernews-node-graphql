// Repeatable steps in a Prisma application:
// 1) Adjust database schema => run SQL scripts
// 2) Introspect database to update models in prisma schema => npx prisma introspect
// *** Eventually prisma migrate will be able to replace steps 1 & 2 https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-migrate
// 3) (Re-)generate prisma client node_module from reading prisma schema => npx prisma generate
// 4) Interact with database via prisma client => const { PrismaClient } = require('@prisma/client')

const { GraphQLServer, PubSub } = require('graphql-yoga')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { APP_SECRET, getUserId } = require('./utils')

const prisma = new PrismaClient()

// This is needed to implement subscriptions
const pubsub = new PubSub()

const pubsubEvents = {
  newLink: 'newLink',
  newVote: 'newVote',
}

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
    feed: async (parent, args, context, info) => {
      const where = !args.filter
        ? {}
        : {
            OR: [
              {
                description: {
                  contains: args.filter,
                },
              },
              {
                url: {
                  contains: args.filter,
                },
              },
            ],
          }

      let orderBy
      if (args.orderBy) {
        const [orderByKey, orderByDirection] = args.orderBy.split('_')
        orderBy = {
          [orderByKey]: orderByDirection,
        }
      }

      const [links, count] = await Promise.all([
        prisma.link.findMany({
          where,
          skip: args.skip,
          first: args.first,
          orderBy,
        }),
        prisma.link.count(),
      ])

      return {
        links,
        count,
      }
    },
    link: (parent, args, context) => {
      return context.prisma.link.findOne({
        where: {
          id: parseInt(args.id),
        },
      })
    },
  },
  Mutation: {
    createLink: async (parent, args, context) => {
      const userId = getUserId(context)

      const link = await prisma.link.create({
        data: {
          description: args.description,
          url: args.url,
          User: {
            connect: {
              id: userId,
            },
          },
        },
      })

      context.pubsub.publish(pubsubEvents.newLink, {
        newLink: link,
      })

      return link
    },
    updateLink: (parent, args, context) => {
      return context.prisma.link.update({
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
      return context.prisma.link.delete({
        where: {
          id: parseInt(args.id),
        },
      })
    },
    signup: async (parent, args, context, info) => {
      // Encrypt the password
      const password = await bcrypt.hash(args.password, 10)

      // Create the user with encrypted password
      const user = await prisma.user.create({
        data: {
          password,
          email: args.email,
          name: args.name,
        },
      })

      // Generate a signed JWT
      const token = jwt.sign({ userId: user.id }, APP_SECRET)

      // Return an AuthPayload object
      return {
        token,
        user,
      }
    },
    login: async (parent, args, context, info) => {
      // Get existing user by the email argument from the mutation
      const user = await prisma.user.findOne({
        where: {
          email: args.email,
        },
      })
      // Handle a non-existent email
      if (!user) {
        throw new Error(`No user found for email ${args.email}`)
      }

      // Check that the password argument from the mutation is valid
      const isPasswordValid = await bcrypt.compare(args.password, user.password)
      if (!isPasswordValid) {
        throw new Error('Invalid password')
      }

      // Generate a signed JWT
      const token = jwt.sign({ userId: user.id }, APP_SECRET)

      // Return an AuthPayload object
      return {
        token,
        user,
      }
    },
    vote: async (parent, args, context, info) => {
      const userId = getUserId(context)

      const votes = await prisma.vote.findMany({
        where: {
          userId,
          linkId: parseInt(args.linkId),
        },
      })
      if (votes.length) {
        throw new Error(`Already voted for link: ${args.linkId}`)
      }

      const vote = await prisma.vote.create({
        data: {
          Link: {
            connect: {
              id: parseInt(args.linkId),
            },
          },
          User: {
            connect: {
              id: userId,
            },
          },
        },
      })

      pubsub.publish(pubsubEvents.newVote, {
        newVote: vote,
      })

      return vote
    },
  },
  // Subscription resolvers are wrapped in an object with fields
  //   - subscribe: the resolver which maps an event and returns an AsyncIterator
  //   - resolve (optional): manipulate the return payload
  // https://github.com/apollographql/graphql-subscriptions
  Subscription: {
    newLink: {
      subscribe: (parent, args, context, info) => {
        return context.pubsub.asyncIterator(pubsubEvents.newLink)
      },
    },
    newVote: {
      subscribe: (parent, args, context, info) => {
        return context.pubsub.asyncIterator(pubsubEvents.newVote)
      },
    },
  },
  // Resolvers for scalar values can be omitted (Link.id, Link.url, User.name, User.email).
  // Object fields need to be explicitly implemented because our GraphQL server can not infer where to get that data from.
  Link: {
    postedBy: (parent, args, context, info) => {
      return context.prisma.link
        .findOne({
          where: {
            id: parent.id,
          },
        })
        .User()
    },
    votes: (parent, args, context, info) => {
      return prisma.link
        .findOne({
          where: {
            id: parent.id,
          },
        })
        .Vote()
    },
  },
  User: {
    links: (parent, args, context, info) => {
      return prisma.user
        .findOne({
          where: {
            id: parent.id,
          },
        })
        .Link()
    },
  },
  Vote: {
    link: (parent, args, context, info) => {
      return prisma.vote
        .findOne({
          where: {
            id: parent.id,
          },
        })
        .Link()
    },
    user: (parent, args, context, info) => {
      return prisma.vote
        .findOne({
          where: {
            id: parent.id,
          },
        })
        .User()
    },
  },
}

// Create server with schema and resolvers
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  // All resolvers have access to the returned object (useful for sharing data across files)
  context: (request) => {
    return {
      ...request,
      prisma,
      pubsub,
    }
  },
})

// Start server
server.start((options) => {
  console.log(`Server is running on http://localhost:${options.port}`)
})
