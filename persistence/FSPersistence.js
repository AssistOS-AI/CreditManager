const process = require("process");
const path = require("path");
const fs = require("fs");
const coreUtil = require("../util/CoreUtil");


function Account(json) {
    this.creationTIme = Date.now();
    for(let key in json){
        if(this[key] === undefined){
            this[key] = json[key];
        }
    }
}

let transformToUserID = require("../util/CoreUtil").transformToUserID;

const MINTING_USER = "S000-0000";

function loadPersistenceFile(fileName, defaultValue) {
    if(process.env.PERSISTENCE_FOLDER === undefined) {
        console.error("LOGS_FOLDER environment variable is not set. Please set it to the path where the logs should be stored. Defaults to './coredata/'");
        process.env.PERSISTENCE_FOLDER = "./coredata/"
    }
    let persistenceRoot = process.env.PERSISTENCE_FOLDER;
    let filePath = path.join(persistenceRoot, fileName);
    if (fs.existsSync(filePath)) {
        let data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } else {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true }); // Create missing directories
        }
        fs.writeFileSync(filePath, JSON.stringify(defaultValue));
        return defaultValue;
    }
}



/*function getCallback(fileName, countDownPromise, fileHandle){
    return function(err, res){
        if(err){
            console.error("Error saving ", fileName, err);
        }
        countDownPromise.dec();
    }
}*/

function saveFile(fileName, variable, countDownPromise){
    let persistenceRoot = process.env.PERSISTENCE_FOLDER;
    let filePath = path.join(persistenceRoot, fileName);
    const jsonData = JSON.stringify(variable, null, 2);

    const stream = fs.createWriteStream(filePath, { flags: 'w' , highWaterMark: 1024 * 1024, flush:true});

    countDownPromise.inc();
    countDownPromise.register(stream);

    stream.on('ready', (err) => {
        stream.write(jsonData);
        stream.end();
        if(err){
            console.error("Error saving ", fileName, err);
        }
        stream.close((err) => {
            if(err){
                console.error("Error closing file ", fileName, err);
            }
            countDownPromise.dec();
            console.debug("File saved ", fileName);
        });
    });

    stream.on('error', (err) => {
        console.error("Error saving ", fileName, err);
        countDownPromise.dec();
    });
}

let watchedFiles = {}
let memoryCaches = {}

async function saveAll(fileName, data){
    let countDownPromise = coreUtil.createCountDownPromise(1);
    for(let file in watchedFiles){
        if(watchedFiles[file]){
            watchedFiles[file] = false;
            saveFile(file, memoryCaches[file], countDownPromise);
        }
    }
    console.debug("Waiting for all files to be saved");
    countDownPromise.dec();
    await countDownPromise.getPromise();
    console.debug("All files saved");
}
function createAutoSaver(timer, config){
    let interval = setInterval(async ()=>{
        await saveAll();
    }, timer);
    let result = {
        shutDown: async function () {
            clearInterval(interval);
            await saveAll();
        }
    }

    for(let name in config) {
        memoryCaches[name] = loadPersistenceFile(name, config[name]);
        console.log("Creating function ", "save" + name);
        result["save" + name] = function(){
            watchedFiles[name] = true;
        }
        console.log("Creating function ", "get" + name);
        result["get" + name] = function(){
            return memoryCaches[name];
        }
        console.log("Creating function ", "set" + name);
        result["set" + name] = function(value){
            return memoryCaches[name] = value;
        }
    }

    return  result;
}


function FSPersistence(loadAndStoreInterface) {
    this.load = async function() {
        return structuredClone(await loadAndStoreInterface._loadChannelsInfo());
    };
    this.store = async function(value) {
        await loadAndStoreInterface._storeChannelsInfo(value);
    };

    this.createAccount = async function(email, name, invitingUserID) {
        if(invitingUserID){
             await loadAndStoreInterface._getAccount(invitingUserID);
        }

        let id = transformToUserID(loadAndStoreInterface._getNumberOfAccounts() + 1);
        let newAccount = new Account({id, name, email, invitingUserID});
        return await loadAndStoreInterface._createAccount(newAccount);
    }

    this.createChannelAccount = async function(channelName) {
        let userIDForChannel = transformToUserID(loadAndStoreInterface._getNumberOfAccounts() + 1, "C");
        let newAccount = new Account({id:userIDForChannel, name:channelName, email:"group or channel"});
        return await loadAndStoreInterface._createAccount(newAccount);
    }

    this.createAgentAccount = async function(agentName, ownerID) {
        let userIDForAgent = transformToUserID(loadAndStoreInterface._getNumberOfAccounts() + 1, "A");
        let newAccount = new Account({id:userIDForAgent, name:agentName, email:"agent"});
        return await loadAndStoreInterface._createAccount(newAccount);
    }


    this.updateAccount = async function(accountID, values) {
        return await loadAndStoreInterface._updateAccount(accountID, values);
    }

    this.getAccount = async function(accountID) {
        return await loadAndStoreInterface._getAccount(accountID);
    }

    this.getBalance = function(accountID) {
        return loadAndStoreInterface._getBalanceSync(accountID);
    }

    this.getLockedBalance = function(accountID) {
        return loadAndStoreInterface._getLockedBalanceSync(accountID);
    }

    this.mint = function(amount, whyLog) {
        console.debug("Minting ", amount, " for reason ", whyLog);
        return loadAndStoreInterface._mintSync(amount, whyLog);
    }

    this.rewardUser = function(accountID, amount, reasonWhy) {
        console.debug("Rewarding user ", accountID, " amount ", amount, " for reason ", reasonWhy);
        if(isNaN(amount) ||  typeof amount !== "number" || amount <= 0){
            throw new Error("Invalid reward amount " + amount);
        }
        try {
            return loadAndStoreInterface._balanceTransferSync(MINTING_USER, accountID, amount);
        } catch(e) {
            console.warn("Failed to reward user ", accountID, " amount ", amount, " for reason: ", e.message);
        }

    }

    this.rewardChannel = function( amount,channelId, why){
        console.debug("Rewarding channel ", channelId, " amount ", amount, " for reason ", why);
        if(isNaN(amount) || typeof amount !== "number" || amount <= 0){
            throw new Error("Invalid reward amount " + amount);
        }
        try {
            return loadAndStoreInterface._balanceTransferSync(MINTING_USER, channelId, amount);
        } catch(e) {
            console.warn("Failed to reward channel ", channelId, " amount ", amount, " for reason: ",  e.message);
        }
    }

    this.transfer =  function(amount, accountIDFrom, accountIDTo,  reasonWhy ) {
        console.debug("Transferring funds from ", accountIDFrom, " to ", accountIDTo, " amount ", amount, " for reason ", reasonWhy);
        if(isNaN(amount) || typeof amount !== "number" || amount < 0){
            throw new Error("Invalid transfer amount " + amount);
        }
        return loadAndStoreInterface._balanceTransferSync(accountIDFrom, accountIDTo, amount);
    }

    this.transferLocked =  function(amount, accountIDFrom, accountIDTo,  reasonWhy ) {
        console.debug("Transferring funds from ", accountIDFrom, " to ", accountIDTo, " amount ", amount, " for reason ", reasonWhy);
        if(isNaN(amount) || typeof amount !== "number" || amount < 0){
            throw new Error("Invalid transfer amount " + amount);
        }
        return loadAndStoreInterface._lockedBalanceTransferSync(accountIDFrom, accountIDTo, amount);
    }

    this.blockFunds =  function(accountID, amount, whyLog) {
        console.debug("Blocking funds for account", accountID, amount, " for reason ", whyLog);
        return  loadAndStoreInterface._blockFundsSync(accountID, amount, whyLog);
    }

    this.lockPoints = this.blockFunds;

    this.unblockFunds = async function(accountID, amount, whyLog) {
        if(typeof accountID != "string" || isNaN(amount) || amount <= 0){
            throw new Error("Invalid account ID " + accountID + " or invalid amount " + amount + " for reason " + whyLog);
        }
        console.debug("Unblocking " , amount, " for account", accountID,  " for reason ", whyLog );
        return loadAndStoreInterface._unblockFundsSync(accountID, amount, whyLog);
    }

    this.unlockPoints = this.unblockFunds;

    this.agentIsOwnedBy = function(agentID, ownerID) {
        return loadAndStoreInterface._getOwner(agentID) === ownerID;
    }

    this.transferAgentOwnership = async function(fromUserID, agentID, newOwnerID) {
        let agentOwner = loadAndStoreInterface._getOwner(agentID);
        if(!agentOwner || agentOwner !== fromUserID){
            throw new Error("Agent " + agentID + " is not owned by " + fromUserID);
        }
        return loadAndStoreInterface._setOwner(agentID, newOwnerID);
    }

}


module.exports = {
    createBasicPersistence : function(loadAndStoreInterface) {
        return new FSPersistence(loadAndStoreInterface);
    },
    loadPersistenceFile,
    createAutoSaver
}
