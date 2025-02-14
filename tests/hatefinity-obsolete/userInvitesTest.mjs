import {initUsers, runXTicks, clean, getUserId, checkBalance} from "./deps/prep.mjs";
await clean();
console.log("Start initialisation...");
import {getCoreInstance} from "../../hatefinity-apis/apiutils/CoreInitialisation.js";
let logicCore = await getCoreInstance();

const MAIN_CHANNEL = "MainChannel";
const FOUNDERS_AGENT_ACCOUNT = "A000-0000";
let channelId = await logicCore.addChannel("MainChannel", FOUNDERS_AGENT_ACCOUNT);


await initUsers(logicCore, "user", 2, channelId);
await runXTicks(logicCore, "user", 3, 5, channelId);
await logicCore.shutDown(10);

console.log("Checking balance...");
checkBalance(logicCore, [104, 84, 64, 64, 64, 5, 64, 64, 64, 44, 24, 0, 0 , 0 , 0, 0]);


