
let USERS = [];
export function getUserId(userNumber) {
    return USERS[userNumber];
}


let NFTS = [];
export function getNFTId(userNumber) {
    return NFTS[userNumber];
}


export async function initUsers(logicCore, prefix, count) {
    for(let i = 0; i < count; i++) {
        let name = prefix + i;
        let user = await logicCore.addUser("user" + i + "@example.com", name, i >0 ? getUserId(i-1) : undefined);
        await logicCore.validateUser(user.id, i < 5 ? i : 0);

        USERS.push(user.id);
        console.debug("Creating user " + name + " with id: " + user.id);
        /*let nft = await logicCore.createNFT(user.id, 1, "NFT of " +user.id);
        NFTS.push(nft.id); */
    }
}

import * as fs from 'fs/promises';
export async function clean() {

    console.log("Start cleaning...");

    try{
        console.log("Cleaning logs...");
        await fs.rm("./logs/", { recursive: true, force: true });
    } catch(e) {
        console.log(e);
    }

    try{
        console.log("Cleaning data...");
        await fs.rm("./data/", { recursive: true, force: true });
    } catch(e) {
        console.log(e);
    }
    console.log("Cleaning done...");
    await fs.mkdir("./data/");
    console.log("core data folder created...");
}



export async function checkBalance(logicCore, arrValuesAvailable, arrValuesLocked) {
    let currentBalance = 0;
    let lockedBalance = 0;
    for(let i = 0; i < arrValuesAvailable.length; i++) {
        if(USERS[i] === undefined) {
            continue;
        }
        currentBalance = await logicCore.balance(USERS[i]);
        lockedBalance = await logicCore.lockedBalance(USERS[i]);

        currentBalance = Math.round(currentBalance * 1000) / 1000;
        lockedBalance = Math.round(lockedBalance * 1000 ) / 1000;

        if(currentBalance != arrValuesAvailable[i]) {
            console.error("Balance mismatch for user ", i, " expected ", arrValuesAvailable[i], " got ", currentBalance);
        }

        if(lockedBalance != arrValuesLocked[i]) {
            console.error("Locked Balance mismatch for user ", i, " expected ", arrValuesLocked[i], " got ", lockedBalance);
        }
    }
}
