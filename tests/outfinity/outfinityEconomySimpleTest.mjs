
import assert from "assert";

console.log("Start initialisation...");
import { promises as fs } from "fs";

export async function deleteFolder(folderPath) {
    try {
        await fs.rm(folderPath, { recursive: true, force: true });
        console.log(`Folder deleted: ${folderPath}`);
    } catch (error) {
        console.error(`Error deleting folder: ${error.message}`);
    }
}
await deleteFolder("./data/");
import {getCoreInstance} from "./deps/OutfinityCoreInitialisation.js";
import {initUsersAndCreateOneNFT, getUserId, getNFTId, clean, checkBalance} from "./deps/outfinityTestPreps.mjs";



await clean();
let logicCore = await getCoreInstance();
const MAIN_CHANNEL = "MainChannel";
const FOUNDERS_AGENT_ACCOUNT = "A000-0000";
logicCore.mint(1000000000);

let channelId = await logicCore.createNFT(FOUNDERS_AGENT_ACCOUNT , 1, "Initialisation NFT");


await initUsersAndCreateOneNFT(logicCore, "user", 10);

await logicCore.claimFounder(getUserId(0), 100000000);

console.log("Founder status: ", await logicCore.accountStatus(getUserId(0)));


console.log("Start testing...", getNFTId(0), getNFTId(1), getNFTId(2), getNFTId(3), getNFTId(4));


logicCore.boostNFT(getUserId(1), getNFTId(1), 2);
logicCore.boostNFT(getUserId(2), getNFTId(2), 3);


await logicCore.shutDown();

console.log( ">>>>>>> Checking logs...");
console.log("Founder logs: ", await logicCore.getUserLogs(getUserId(0)));
console.log( "<<<<<<< End Checking logs...");

await checkBalance(logicCore, [ 100010100, 10098, 10097, 10100, 10100, 10100, 10100, 10100 , 10100 , 10000 ]);

console.log("Available system balance: ", await logicCore.getSystemAvailablePoints());
console.log("Test done");