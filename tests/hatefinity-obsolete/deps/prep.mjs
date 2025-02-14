
let USERS = {};
export async function initUsers(logicCore, prefix, count, channelName) {
    for(let i = 0; i < count; i++) {
        let name = prefix + i;
        let user = await logicCore.addUser("user" + i + "@example.com", name, i >0 ? getUserId(i-1) : undefined);
        await logicCore.validateUser(user.id, 1);
        USERS[i] = user.id;
        console.debug("Creating user " + name + " with id: " + user.id);
        logicCore.publishArticle(1, user.id, channelName,"article" + i);
    }
}

export async function runXTicks(logicCore, prefix, tickCount, startNumber, channelName) {
    for(let i = startNumber; i < startNumber + tickCount; i++) {
        let name = prefix + i
        console.debug("Creating user " + name);
        let user = await logicCore.addAccount("user" + i + "@example.com", name, getUserId(1));
        await logicCore.validateUser(user.id, 1);
        USERS[i] = user.id;
        logicCore.publishArticle(1, user.id, channelName,  "article" + i);
        logicCore.tickTack();
        let activeArticles = logicCore.listActiveArticles(channelName);
        let dumpWithWeights = activeArticles.map((a) => {
            let ainfo = logicCore.getArticleInfo(channelName, a);
            return ainfo.id + "[" + ainfo.currentWeight.toFixed(2) + "]";
        });
        console.log("----------\t\t\tActive articles: " + dumpWithWeights);
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

export function getUserId(userNumber) {
    return USERS[userNumber];
}


export function checkBalance(logicCore, arrValues){

    for(let i = 0; i < arrValues.length; i++) {
        if(Math.floor(logicCore.balance(USERS[i]) * 1000 )/1000 != arrValues[i]) {
            console.error("Balance mismatch for user ", i, " expected ", arrValues[i], " got ", logicCore.balance(USERS[i]));
        }
    }
}
