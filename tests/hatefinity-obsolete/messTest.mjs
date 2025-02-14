
import {initUsers, runXTicks, clean, getUserId, checkBalance} from "./deps/prep.mjs";
await clean();
console.log("Start initialisation...");
import {getCoreInstance} from "../../hatefinity-apis/apiutils/CoreInitialisation.js";
let logicCore = await createCore();
const MAIN_CHANNEL = "MainChannel";
const FOUNDERS_AGENT_ACCOUNT = "A000-0000";
let channelId = await logicCore.addChannel("MainChannel", FOUNDERS_AGENT_ACCOUNT);


await initUsers(logicCore,"user", 6, channelId);

logicCore.boostPost(1, getUserId(1), channelId,"article1");
logicCore.boostPost(2, getUserId(1), channelId,"article2");
logicCore.boostPost(1, getUserId(1), channelId,"article3");
logicCore.boostPost(1, getUserId(2), channelId,"article4");
logicCore.boostPost(1, getUserId(2), channelId,"article5");
logicCore.addComment(2, getUserId(2), channelId,"article1", "com_1_1");
logicCore.addComment(3, getUserId(3), channelId,"article1", "com_1_2");
logicCore.addComment(1, getUserId(4), channelId,"article2", "com_2_1");
logicCore.addComment(2, getUserId(5), channelId,"article2", "com_2_1");
logicCore.boostComment(1, getUserId(5), channelId,"article1", "com_1_1");

await runXTicks(logicCore, "user", 100, 10,channelId);

await logicCore.shutDown(10);

console.log("Checking balance...");
checkBalance(logicCore, [5, 350.013, 205.047, 211.664, 49.001, 232.277, 0, 0, 0, 0, 10.001, 10.001, 30 , 50.001 , 70.001, 70.001]);


