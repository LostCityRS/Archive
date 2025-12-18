import path from 'path';

import Fastify from 'fastify';
import Autoload from '@fastify/autoload';
import Static from '@fastify/static';
import View from '@fastify/view';

import ejs from 'ejs';

const fastify = Fastify({
    // logger: true
    // trustProxy: true
});

fastify.register(Static, {
    root: path.join(process.cwd(), 'public')
});

fastify.register(View, {
    engine: {
        ejs
    },
    root: path.join(process.cwd(), 'view'),
    viewExt: 'ejs'
});

fastify.setNotFoundHandler((req, reply) => {
    reply.redirect('/', 302);
});

fastify.setErrorHandler((err, req, reply) => {
    reply.redirect('/', 302);

    console.error(err);
});

await fastify.register(Autoload, {
    dir: 'src/routes',
    forceESM: true
});

fastify.listen({ port: process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 3000, host: '0.0.0.0' });
console.log(`Running on http://localhost:${process.env.WEB_PORT ?? 3000}`);

// setInterval(() => {
//   const mem = process.memoryUsage();
//   console.log(`Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
// }, 1000);
