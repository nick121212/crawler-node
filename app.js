import * as configUtil from "./lib/config";
import { Application } from "./lib/application";
import downloaderMiddle from "crawler-downloader";
import downloaderAnalysisMiddle from "crawler-downloader-analysis";
import htmlAnalysisMiddle from "crawler-html-analysis";
import urlAnalysisMiddle from "crawler-url-analysis";
import { Client } from "eureca.io";
import resultStoreMiddle, { queueResultUrl } from "crawler-result-store";
import aiAnalysisMiddle from "crawler-ai-analysis";
import boom from "boom";

const app = new Application();
const config = configUtil.configFile();

let busy = false;
let serverProxy;
let eurecaClient = new Client({
    uri: config.schedule.uri,
    prefix: config.schedule.prefix || ""
});

eurecaClient.on("ready", function(proxy) {
    serverProxy = proxy;
});

eurecaClient.exports = {
    start: function(options) {
        let context = this;

        context.async = true;
        if (busy) {
            return context.return(boom.create(607, options.queueItem.url + "爬虫正在执行中！"));
        }
        busy = true;
        serverProxy.setStatus(true).onReady(function() {
            app.callback(context)(options);
        });
    },
    status: function() {
        let context = this;
        context.async = true;
        context.return(busy);
    }
};

const init = async() => {
    const overFunc = () => {
        busy = false;
        serverProxy.setStatus(false);
    };

    app.use(async(ctx, next) => {
        ctx.queueItem = ctx.options.queueItem;
        ctx.config = ctx.options.config;
        busy = true;
        await next();
    });
    app.use(downloaderMiddle({}));
    app.use(downloaderAnalysisMiddle({}));
    app.use(urlAnalysisMiddle({}));
    app.use(htmlAnalysisMiddle({}));
    app.use(aiAnalysisMiddle({}));
    app.use(await resultStoreMiddle(config.elastic));
    app.use(await queueResultUrl(config));
    app.use(async(ctx, next) => {
        overFunc(ctx);
        console.log(`${ctx.queueItem.url} -- statusCode: ${ctx.queueItem.statusCode} -- ${new Date}`);
        ctx.client.return({
            status: ctx.status,
            statusCode: ctx.queueItem.statusCode,
            pid: process.pid
        });
        await next();
    });
    app.on("error", (err, ctx) => {
        console.error(err);
        ctx.client.return(err);
        overFunc(ctx);
    });
};
init();