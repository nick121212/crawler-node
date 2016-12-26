export default (config) => {

    return async(ctx, next) => {
        if (ctx.app.jobs > ctx.app.maxJobs) {
            ctx.body = { jobs: 0 };
        } else {
            ctx.body = { jobs: ctx.app.maxJobs - ctx.app.jobs };
        }

        await next();
    };
};