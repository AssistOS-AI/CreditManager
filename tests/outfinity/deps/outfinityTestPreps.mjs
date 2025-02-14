
let USERS = [];
export function getUserId(userNumber) {
    return USERS[userNumber];
}


let NFTS = [];
export function getNFTId(number) {
    return NFTS[number];
}


export async function initUsersAndCreateOneNFT(logicCore, prefix, count) {
    for(let i = 0; i < count; i++) {
        let name = prefix + i;
        let user = await logicCore.addUser("user" + i + "@example.com", name, i >0 ? getUserId(i-1) : undefined);
        await logicCore.validateUser(user.id, 3);
        USERS.push(user.id);
       // console.debug("Creating user " + name + " with id: " + user.id);
        let nft = await logicCore.createNFT(user.id, 1, "NFT of " +user.id);
        //console.debug("Creating NFT with id: " + nft.id);
        NFTS.push(nft.id);
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
        console.log("Cleaning coredata...");
        await fs.rm("./coredata/", { recursive: true, force: true });
    } catch(e) {
        console.log(e);
    }
    console.log("Cleaning done...");
    await fs.mkdir("./coredata/");
    console.log("core data folder created...");
}



export async function checkBalance(logicCore, arrValues){
    let currentBalance = 0;
    for(let i = 0; i < arrValues.length; i++) {
        if(USERS[i] == undefined) {
            continue;
        }
        currentBalance = await logicCore.balance(USERS[i]);
        currentBalance = Math.floor(currentBalance * 1000 / 1000);
        if(currentBalance !== arrValues[i]) {
            console.error("Balance mismatch for user ", i, " expected ", arrValues[i], " got ", currentBalance);
        }
    }
}
