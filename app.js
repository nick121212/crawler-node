import spa from "nspa";
import controller from "./controller";

const config = spa.configFile();

const init = async() => {
    const app = new spa.Spa(20);

    app.initClient(config.schedule, {
        ready: (spaClient) => {
            setTimeout(() => {
                spaClient.proxy.setStatus({ jobs: (app.maxJobs - app.jobs) });
            }, 10);
        }
    });
    await controller(app.spaClient, config);
    app.use(app.spaClient.attach(app, (ctx) => {
        // console.log("crawler-node -- complete---" + ctx.context.retId);
        if (app.spaClient.proxy && app.spaClient.proxy.setStatus) {
            app.spaClient.proxy.setStatus(app.maxJobs - app.jobs);
        }
        ctx.context.return && ctx.context.return(ctx.err || ctx.body);
    }));
    app.use(async(ctx, next) => {
        console.log("crawler-node-app.js", ctx.routerKey, ctx.body, ctx.context.retId);
        await next();
    });
};

init();

process.on("unhandledRejection", function(reason, p) {
    console.log("Unhandled Rejection at: Promise", reason);
});