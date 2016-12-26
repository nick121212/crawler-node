import spa from "nspa";
import controller from "./controller";

const config = spa.configFile();

class Application extends spa.Spa {
    constructor(_maxJobs) {
        super(_maxJobs);
    }

    onComplete(ctx) {
        super.onComplete(ctx);
        if (this.spaClient.proxy && this.spaClient.proxy.setStatus) {
            this.spaClient.proxy.setStatus(this.maxJobs - this.jobs);
        }
    }
}

const init = async() => {
    const app = new Application(20);

    app.initClient(config.schedule, {
        ready: (spaClient) => {
            let data = { jobs: (app.maxJobs - app.jobs) };

            console.log(data);
            spaClient.proxy.setStatus(data);
        }
    });
    await controller(app.spaClient, config);
    app.use(app.spaClient.attach(app));
    app.use(async(ctx, next) => {
        setTimeout(async() => {
            await next();
        }, 1000);
    });
};

init();

process.on("unhandledRejection", function(reason, p) {
    console.log("Unhandled Rejection at: Promise", reason);
});