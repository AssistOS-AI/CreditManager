
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
import {getCoreInstance} from "../../hatefinity-apis/apiutils/HatefinityCoreInitialisation.js";
import {getUserId,  clean, checkBalance, initUsers} from "./deps/prep.mjs";

await clean();

let logicCore = await getCoreInstance();

logicCore.mint(1000000);

await initUsers(logicCore, "user", 10);

await logicCore.shutDown();

await checkBalance(logicCore, [0.299, 11.189, 110.09, 1010, 1000.1 , 0.2 , 0.2 , 0.2 , 0.2], [999.9, 0, 0, 0, 9.9, 1009.8, 1009.8,1009.8,1009.8]);

console.log("System avaialbe and locked balances are:", await logicCore.balance("system") , "and ", await logicCore.lockedBalance("system"));
console.log("System balance", await logicCore.balance("system") == 989910 + 1908.522);
console.log("System balance", await logicCore.lockedBalance("system") === 0 );