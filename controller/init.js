import { queueResultUrl } from "crawler-url-analysis";
import { queueStoreUrls, saveUrls } from "crawler-result-store";
import spa from "nspa";
import boom from "boom";

export default async(config) => {
    class CrawlerCompose extends spa.Compose {
        constructor() {
            super();
        }
        onError(err, ctx) {
            console.log(err);
            super.onError(err, ctx);
        }
    }
    const compose = new CrawlerCompose();
    const init = async() => {
        compose.use(async(ctx, next) => {
            ctx.config = ctx.params.config;
            ctx.queueItem = ctx.params.queueItem || {};
            ctx.queueItem.analysisResultUrls = [ctx.config.initDomain];
            ctx.body = {};

            await next();
        });

        compose.use(queueResultUrl(config.mq));
        compose.use(async(ctx, next) => {
            ctx.queueItem.analysisUrlResult = ctx.queueItem.analysisResultUrlResult;
            await next();
        });
        compose.use(await saveUrls(config.elastic));
        compose.use(async(ctx, next) => {
            await next();
        });
        compose.use(await queueStoreUrls(config.mq));
    };

    await init();
    return async(ctx, next) => {
        if (!ctx.params.config) {
            throw boom.create(604, "没有配置文件");
        }
        if (ctx.app.jobs > ctx.app.maxJobs - 1) {
            throw boom.create(609, "爬虫任务已满");
        }
        let fn = compose.callback();

        compose.once("complete", async(res) => {
            ctx.body = res.body;
            await next();
        });

        await fn({
            routerKey: "startCompose",
            context: {},
            params: ctx.params
        });
    };
};