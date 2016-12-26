/**
 * Created by NICK on 2016/12/15.
 */

import start from "./start";
import status from "./status";
import init from "./init";

export default async(spaClient, config) => {
    spaClient.attachRouteToSocket("status", await status(config));
    spaClient.attachRouteToSocket("start", await start(config));
    spaClient.attachRouteToSocket("init", await init(config));
};