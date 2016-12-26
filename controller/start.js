import downloaderMiddle from "../../crawler-downloader/src/app";
import downloaderAnalysisMiddle from "../../crawler-downloader-analysis/src/app";
import htmlAnalysisMiddle from "crawler-html-analysis";
import urlAnalysisMiddle from "crawler-url-analysis";
import { queueStoreUrls, saveQueueItem, saveResults, saveUrls } from "crawler-result-store";
import aiAnalysisMiddle from "crawler-ai-analysis";
import spa from "nspa";
import boom from "boom";
import _ from "lodash";

export default async(config) => {
    class CrawlerCompose extends spa.Compose {
        constructor() {
            super();
        }
        onError(err, ctx) {
            super.onError(err, ctx);
            throw err;
        }
    }
    const compose = new CrawlerCompose();
    const init = async() => {
        compose.use(async(ctx, next) => {
            ctx.config = ctx.params.config;
            ctx.queueItem = ctx.params.queueItem;
            ctx.options = {};
            ctx.body = {};

            await next();
        });
        compose.use(downloaderMiddle({}));
        compose.use(async(ctx, next) => {
            console.log(ctx.queueItem);
            await next();
        });
        compose.use(downloaderAnalysisMiddle({}));
        compose.use(urlAnalysisMiddle({}));
        compose.use(htmlAnalysisMiddle({}));
        compose.use(aiAnalysisMiddle({}));

        compose.use(await saveUrls(config.elastic));
        compose.use(await saveResults(config.elastic));
        compose.use(await saveQueueItem(config.elastic));
        compose.use(await queueStoreUrls(config.mq));

        return compose;
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

        await fn({
            routerKey: "startCompose",
            context: {},
            params: ctx.params
        });

        compose.once("complete", async(res) => {
            ctx.body = _.extend({}, res.errCount, res.body);

            await next();
        });
    };
};