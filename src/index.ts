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

await fastify.register(Autoload, {
    dir: 'src/routes',
    forceESM: true
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
console.log('Running on http://localhost:3000');
