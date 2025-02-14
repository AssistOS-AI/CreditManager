
import assert from "assert";
import {initUsers, runXTicks, clean, getUserId, checkBalance} from "./deps/prep.mjs";
await clean();
console.log("Start initialisation...");
import {getCoreInstance} from "../../hatefinity-apis/apiutils/CoreInitialisation.js";
let logicCore = await getCoreInstance();
const MAIN_CHANNEL = "MainChannel";
const FOUNDERS_AGENT_ACCOUNT = "A000-0000";
let channelId = await logicCore.addChannel(MAIN_CHANNEL, FOUNDERS_AGENT_ACCOUNT);


await initUsers(logicCore, "user", 5, channelId);

logicCore.boostPost(1, getUserId(1), channelId,"article1");

logicCore.boostPost(1, getUserId(2), channelId,"article1");

await runXTicks(logicCore, "user", 5, 6, channelId);

await logicCore.shutDown();

checkBalance(logicCore, [84, 61.578, 104.421, 64, 64, 0, 4, 44, 44, 44, 24, 0, 0 , 0 , 0 ]);
